package main

import (
	"encoding/json"
	"flag"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"camlistore.org/pkg/client"
	"camlistore.org/pkg/schema"
	"camlistore.org/pkg/syncutil"
	"github.com/dustin/go-couch"
)

var srcPath = flag.String("path", "", "Source of files on local filesystem")

var camliClient = client.NewOrFail()

type dateOnly time.Time

func (d *dateOnly) UnmarshalJSON(in []byte) error {
	t, err := time.Parse("2006-01-02", string(in[1:len(in)-1]))
	if err == nil {
		*d = dateOnly(t)
	}
	return err
}

type photo struct {
	Id          string `json:"_id"`
	Type        string
	Extension   string
	Description string   `json:"descr"`
	Tags        []string `json:"keywords"`
	Taken       dateOnly `json:"taken"`
	Cat         string
	Size        int
}

var wg sync.WaitGroup

func maybefatal(err error, msg string, args ...interface{}) {
	if err != nil {
		log.Fatalf(msg, args...)
	}
}

func localPathOf(p photo) string {
	return filepath.Join(*srcPath, p.Id+"."+p.Extension)
}

func storePhoto(p photo) (string, error) {
	srcFile := localPathOf(p)

	f, err := os.Open(srcFile)
	if err != nil {
		return "", err
	}
	defer f.Close()

	fileRef, err := schema.WriteFileFromReader(camliClient, p.Id+"."+p.Extension, f)

	res, err := camliClient.UploadNewPermanode()
	if err != nil {
		return "", err
	}
	perma := res.BlobRef

	claims := []*schema.Builder{}
	claims = append(claims, schema.NewSetAttributeClaim(perma, "camliContent", fileRef.String()))
	claims = append(claims, schema.NewSetAttributeClaim(perma, "title", p.Description))
	for _, t := range p.Tags {
		claims = append(claims, schema.NewAddAttributeClaim(perma, "tag", t))
	}
	if p.Cat == "Public" {
		claims = append(claims, schema.NewSetAttributeClaim(perma, "camliAccess", "public"))
	}

	grp := syncutil.Group{}
	for _, claimBuilder := range claims {
		claim := claimBuilder.Blob()
		grp.Go(func() error {
			_, err := camliClient.UploadAndSignBlob(claim)
			return err
		})
	}

	return perma.String(), grp.Err()
}

func handlePhotos(ch <-chan photo) {
	defer wg.Done()
	for p := range ch {
		if p.Type != "photo" {
			continue
		}
		perma, err := storePhoto(p)
		maybefatal(err, "Couldn't store %v: %v", p.Id, err)
		log.Printf("Stored %v as %v", p.Description, perma)
	}
}

func feedBody(r io.Reader, results chan<- photo) int64 {

	d := json.NewDecoder(r)

	for {
		thing := struct {
			Doc     photo
			LastSeq *json.Number `json:"last_seq"`
		}{}
		err := d.Decode(&thing)
		if err != nil {
			switch err.Error() {
			case "unexpected EOF", "EOF":
				return -1
			default:
				log.Fatalf("Error decoding stuff: %#v", err)
			}
		}
		if thing.LastSeq != nil {
			return -1
		} else {
			results <- thing.Doc
		}
	}
}

func main() {
	flag.Parse()

	db, err := couch.Connect(flag.Arg(0))
	maybefatal(err, "Error connecting: %v", err)

	ch := make(chan photo)

	for i := 0; i < 4; i++ {
		wg.Add(1)
		go handlePhotos(ch)
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
