package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"text/template"
	"time"

	"github.com/dustin/go-couch"
	"github.com/dustin/httputil"
)

var (
	outdir      = flag.String("out", "output", "Where to write the output")
	awsId       = os.Getenv("AWS_ACCESS_KEY_ID")
	awsKey      = os.Getenv("AWS_SECRET_ACCESS_KEY")
	s3Loc       = "s3.amazonaws.com"
	bucket      = flag.String("bucket", "photo.west.spy.net", "aws bucket")
	origTmplTxt = flag.String("orig_src", "", "template for orig URLs")
	getAtts     = flag.Bool("get_atts", false, "fetch attachments")
	exiftool    = flag.String("exiftool", "", "path to exiftool")
	storeMeta   = flag.Bool("store_meta", false, "store metadata json")

	origTmpl *template.Template
)

const (
	takenFmt = "2006-01-02"
	tsFmt    = "2006-01-02T15:04:05"
	exifFmt  = "2006:01:02 15:04:05"
)

type photo struct {
	ID          string   `json:"_id"`
	Rev         string   `json:"_rev"`
	Keywords    []string `json:"keywords"`
	Descr       string   `json:"descr"`
	TS          string   `json:"ts"`
	Addedby     string   `json:"addedby"`
	Extension   string   `json:"extension"`
	Taken       string   `json:"taken"`
	Type        string   `json:"type"`
	Annotations []struct {
		Title   string `json:"title"`
		Ts      string `json:"ts"`
		Addedby string `json:"addedby"`
		Height  int    `json:"height"`
		Width   int    `json:"width"`
		Y       int    `json:"y"`
		X       int    `json:"x"`
	} `json:"annotations"`
	Attachments map[string]struct {
		ContentType string `json:"content_type"`
		Length      int
	} `json:"_attachments"`
}

func (p photo) filepath() string {
	return fmt.Sprintf("%s/%s", *outdir, p.ID)
}

func (p photo) taken() time.Time {
	t, err := time.Parse(takenFmt, p.Taken)
	maybefatal(err, "error parsing taken from %v: %v", p, err)
	return t
}

func (p photo) ts() time.Time {
	t, err := time.Parse(takenFmt, p.TS)
	maybefatal(err, "error parsing timestamp from %v: %v", p, err)
	return t
}

type photoFile struct {
	p       photo
	url, fn string
}

var wg sync.WaitGroup

func maybefatal(err error, msg string, args ...interface{}) {
	if err != nil {
		log.Fatalf(msg, args...)
	}
}

func updateExif(fn string, p photo) error {
	if *exiftool == "" {
		return nil
	}

	descr := p.Descr
	if len(p.Annotations) > 0 {
		j, err := json.Marshal(descr)
		if err != nil {
			log.Printf("Error marshaling: %v", err)
		}
		descr += "\nAnnotations: " + string(j)
	}

	argv := []string{"-overwrite_original",
		"-description=" + descr,
		"-AllDates=" + p.taken().Format(exifFmt),
	}
	for _, k := range p.Keywords {
		argv = append(argv, "-keywords="+k)
	}
	argv = append(argv, fn)

	cmd := exec.Command(*exiftool, argv...)
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func storeFile(db *couch.Database, pf photoFile) error {
	u := pf.url
	if u == "" {
		u = fmt.Sprintf("%s/%s/%s", db.DBURL(), pf.p.ID, pf.fn)
	}
	outfile := fmt.Sprintf("%s/%s", pf.p.filepath(), pf.fn)

	res, err := http.Get(u)
	if err != nil {
		return err
	}
	if res.StatusCode != 200 {
		return httputil.HTTPError(res)
	}
	defer res.Body.Close()

	f, err := os.Create(outfile)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = io.Copy(f, res.Body)
	if err != nil {
		return err
	}

	if err := updateExif(outfile, pf.p); err != nil {
		log.Printf("Failed to update exif of %v: %v", pf.p.ID, err)
		failedf := fmt.Sprintf("%s/failed/%s.%s", *outdir, pf.p.ID, pf.p.Extension)
		if err := os.Rename(outfile, failedf); err != nil {
			log.Printf("Error renaming failed %v to %vfile: %v",
				outfile, failedf, err)
		}
		if err := storeDetails(pf.p); err != nil {
			log.Printf("Error writing out detail json: %v", err)
		}
		jfi := fmt.Sprintf("%s/%s/details.json", *outdir, pf.p.ID)
		jfo := fmt.Sprintf("%s/failed/%s.json", *outdir, pf.p.ID)
		if err := os.Rename(jfi, jfo); err != nil {
			log.Printf("Error moving json stuff into failed dir: %v", err)
		}
		return err
	}
	return nil
}

func storeDetails(p photo) error {
	fn := fmt.Sprintf("%v/%v/details.json", *outdir, p.ID)
	f, err := os.Create(fn)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(p)
}

func handleFiles(db *couch.Database, fch <-chan photoFile) {
	defer wg.Done()
	for f := range fch {
		log.Printf(" Grabbing %v/%v", f.p.ID, f.fn)
		if err := storeFile(db, f); err != nil {
			log.Printf("Error processing %v: %v", f.p.ID, err)
		}
	}
}

func handlePhotos(ch <-chan photo, fch chan<- photoFile) {
	defer wg.Done()
	defer close(fch)
	for p := range ch {
		if p.Type != "photo" {
			continue
		}
		if !(origTmpl != nil || *storeMeta || (*getAtts && len(p.Attachments) > 0)) {
			continue
		}
		log.Printf("Photo: %v", p.Descr)
		if err := os.MkdirAll(fmt.Sprintf("%v/%v", *outdir, p.ID), 0777); err != nil {
			log.Printf("Error creating dirs: %v", err)
			continue
		}

		if origTmpl != nil {
			buf := &bytes.Buffer{}
			if err := origTmpl.Execute(buf, p); err != nil {
				log.Fatalf("Error constructing %v: %v", p, err)
			}
			fch <- photoFile{p, buf.String(), "orig." + p.Extension}
		}
		if *storeMeta {
			if err := storeDetails(p); err != nil {
				log.Printf("Error storing details: %v", err)
			}
		}
		if *getAtts {
			for k, v := range p.Attachments {
				log.Printf("  %v -> %v", k, v.Length)
				fch <- photoFile{p, "", k}
			}
		}
	}
}

func feedBody(r io.Reader, results chan<- photo) int64 {

	d := json.NewDecoder(r)

	for {
		thing := struct {
			LastSeq *string `json:"last_seq"`
			Doc     *json.RawMessage
		}{}
		err := d.Decode(&thing)
		if err != nil {
			switch err.Error() {
			case "unexpected EOF", "EOF":
				return -1
			default:
				log.Printf("Error decoding stuff: %#v -- shutting down reader", err)
				continue
			}
		}
		if thing.LastSeq != nil {
			return -1
		}
		p := photo{}
		if err := json.Unmarshal([]byte(*thing.Doc), &p); err != nil {
			log.Printf("Error unmarshaling photo from %s: %v", thing.Doc, err)
			return -1
		}
		results <- p
	}
}

func main() {
	flag.Parse()

	if *origTmplTxt != "" {
		var err error
		origTmpl, err = template.New("").Parse(*origTmplTxt)
		if err != nil {
			log.Fatalf("Can't parse template: %v", err)
		}
	}

	err := os.MkdirAll(*outdir+"/failed", 0777)
	maybefatal(err, "Error creating output dir: %v", err)

	db, err := couch.Connect(flag.Arg(0))
	maybefatal(err, "Error connecting: %v", err)

	ch := make(chan photo)
	fch := make(chan photoFile, 128)

	wg.Add(1)
	go handlePhotos(ch, fch)
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go handleFiles(&db, fch)
	}

	start := time.Now()
	err = db.Changes(func(r io.Reader) int64 {
		return feedBody(r, ch)
	},
		map[string]interface{}{
			"feed":         "continuous",
			"include_docs": true,
			"timeout":      0,
			"heartbeat":    0,
		})
	close(ch)
	maybefatal(err, "Error changesing: %v", err)

	log.Printf("Waiting for queued tasks to complete.")
	// wait here
	wg.Wait()
	log.Printf("Finished in %v", time.Since(start))
}
