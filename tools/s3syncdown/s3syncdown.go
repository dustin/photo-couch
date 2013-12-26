package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/dustin/go-couch"
)

var verbose = flag.Bool("v", false, "Verbose")
var localPath = flag.String("path", "", "Local filesystem location")

type photo struct {
	Id          string `json:"_id"`
	Type        string
	Extension   string
	Description string `json:"descr"`
}

var wg sync.WaitGroup

func maybefatal(err error, msg string, args ...interface{}) {
	if err != nil {
		log.Fatalf(msg, args...)
	}
}

func localPathOf(p photo) string {
	return filepath.Join(*localPath, p.Id+"."+p.Extension)
}

func validateLocal(p photo) error {
	localFile := localPathOf(p)
	f, err := os.Open(localFile)
	if err != nil {
		return err
	}
	defer f.Close()
	// TODO:  Verify hash
	return nil
}

type photoErr struct {
	p photo
	e error
}

func handlePhotos(ch <-chan photo, errored chan<- photoErr) {
	defer wg.Done()
	for p := range ch {
		if p.Type != "photo" {
			continue
		}
		if err := validateLocal(p); err != nil {
			errored <- photoErr{p, err}
		}
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
		if *verbose {
			log.Printf("Got %+v", thing)
		}
		if thing.LastSeq != nil {
			return -1
		} else {
			results <- thing.Doc
		}
	}
}

func errFetch(p photo) error {
	log.Printf("Fetching a new %v", p.Id)
	res, err := http.Get(fmt.Sprintf("http://bleu.west.spy.net/s3sign/original/%v/%v.%v",
		p.Id[:2], p.Id, p.Extension))
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return fmt.Errorf("http error: %v", res.Status)
	}

	fn := localPathOf(p)
	fntmp := fn + ".tmp"
	f, err := os.Create(fntmp)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = io.Copy(f, res.Body)
	if err == nil {
		err = f.Close()
		maybefatal(err, "Error closing tmp file: %v", err)

		err = os.Rename(fntmp, fn)
	}

	return err
}

func errFetcher(wg *sync.WaitGroup, ch <-chan photo) {
	defer wg.Done()
	for p := range ch {
		if err := errFetch(p); err != nil {
			log.Printf("Error error fetching %v: %v", p.Id, err)
		} else {
			log.Printf("Saved a new copy of %v", p.Id)
		}
	}
}

func errHandler(wg *sync.WaitGroup, ch <-chan photoErr) {
	defer wg.Done()
	errs := 0

	pch := make(chan photo)
	defer close(pch)

	for i := 0; i < 4; i++ {
		wg.Add(1)
		go errFetcher(wg, pch)
	}

	for perr := range ch {
		errs++
		log.Printf("Error #%v on %v: %v (resolving)", errs, perr.p.Id, perr.e)
		pch <- perr.p
	}
}

func main() {
	flag.Parse()

	db, err := couch.Connect(flag.Arg(0))
	maybefatal(err, "Error connecting: %v", err)

	ch := make(chan photo)
	cherr := make(chan photoErr)

	wgErr := &sync.WaitGroup{}
	wgErr.Add(1)
	go errHandler(wgErr, cherr)

	for i := 0; i < 4; i++ {
		wg.Add(1)
		go handlePhotos(ch, cherr)
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
	close(cherr)
	log.Printf("Waiting for error handlers to complete")
	wgErr.Wait()
	log.Printf("Finished in %v", time.Since(start))
}
