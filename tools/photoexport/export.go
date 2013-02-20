package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"code.google.com/p/dsallings-couch-go"
)

var outdir = flag.String("out", "output", "Where to write the output")

type photo map[string]interface{}
type photoFile struct {
	p  map[string]interface{}
	fn string
}

var wg sync.WaitGroup

func maybefatal(err error, msg string, args ...interface{}) {
	if err != nil {
		log.Fatalf(msg, args...)
	}
}

func storeFile(db *couch.Database, pf photoFile) {
	u := fmt.Sprintf("%s/%s/%s", db.DBURL(), pf.p["_id"], pf.fn)
	outfile := fmt.Sprintf("%s/%s/%s", *outdir, pf.p["_id"], pf.fn)

	res, err := http.Get(u)
	maybefatal(err, "Couldn't fetch %v: %v", u, err)
	if res.StatusCode != 200 {
		log.Fatalf("Couldn't fetch %v: %v", u, res.Status)
	}
	defer res.Body.Close()

	f, err := os.Create(outfile)
	maybefatal(err, "Creating image file: %v", err)
	defer f.Close()

	_, err = io.Copy(f, res.Body)
	maybefatal(err, "Error copying blob for %v: %v", u, err)
}

func storeDetails(p photo) {
	err := os.MkdirAll(fmt.Sprintf("%v/%v", *outdir, p["_id"]), 0777)
	maybefatal(err, "Creating directory for %v: %v", p["_id"], err)

	fn := fmt.Sprintf("%v/%v/details.json", *outdir, p["_id"])
	f, err := os.Create(fn)
	maybefatal(err, "Creating details file: %v", err)
	defer f.Close()
	e := json.NewEncoder(f)
	err = e.Encode(p)
	maybefatal(err, "Error encoding details: %v", err)
}

func handleFiles(db *couch.Database, fch <-chan photoFile) {
	defer wg.Done()
	for f := range fch {
		log.Printf(" Grabbing %v/%v", f.p["_id"], f.fn)
		storeFile(db, f)
	}
}

func handlePhotos(ch <-chan photo, fch chan<- photoFile) {
	defer wg.Done()
	defer close(fch)
	for p := range ch {
		if p["type"] != "photo" {
			continue
		}
		att, ok := p["_attachments"]
		if !ok {
			continue
		}
		log.Printf("Photo: %v", p["descr"])
		storeDetails(p)
		for k, vx := range att.(map[string]interface{}) {
			v := vx.(map[string]interface{})
			log.Printf("  %v -> %v", k, v["length"])
			fch <- photoFile{p, k}
		}
	}
}

func feedBody(r io.Reader, results chan<- photo) int64 {

	d := json.NewDecoder(r)

	for {
		thing := map[string]interface{}{}
		err := d.Decode(&thing)
		if err != nil {
			switch err.Error() {
			case "unexpected EOF", "EOF":
				return -1
			default:
				log.Fatalf("Error decoding stuff: %#v", err)
			}
		}
		if _, ok := thing["last_seq"]; ok {
			return -1
		} else {
			results <- photo(thing["doc"].(map[string]interface{}))
		}
	}

	return -1
}

func main() {
	flag.Parse()

	err := os.MkdirAll(*outdir, 0777)
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
