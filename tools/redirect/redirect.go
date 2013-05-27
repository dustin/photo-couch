package main

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

var (
	awsId       = os.Getenv("AWS_ACCESS_KEY_ID")
	awsKey      = os.Getenv("AWS_SECRET_ACCESS_KEY")
	s3Loc       = "s3.amazonaws.com"
	bucket      = flag.String("bucket", "photo.west.spy.net", "aws bucket")
	expDuration = flag.Duration("ttl", time.Minute*15, "Expiration duration")
)

func mkUrl(path string, exp int64) string {
	h := hmac.New(sha1.New, []byte(awsKey))
	sts := fmt.Sprintf("GET\n\n\n%v\n/%v%v", exp, *bucket, path)
	_, err := h.Write([]byte(sts))
	if err != nil {
		log.Fatalf("Error writing to hmac: %v", err)
	}
	auth := base64.StdEncoding.EncodeToString(h.Sum(nil))

	return fmt.Sprintf("http://%s.%s%s?Signature=%s&Expires=%v&AWSAccessKeyId=%s",
		*bucket, s3Loc, path, url.QueryEscape(auth), exp, awsId)
}

func remote(r *http.Request) string {
	rem := r.Header.Get("X-Forwarded-For")
	if rem == "" {
		rem = r.RemoteAddr
	}
	return rem
}

func redirect(w http.ResponseWriter, r *http.Request) {
	exp := time.Now().Add(*expDuration).Unix()
	log.Printf("Redirecting %v for %v", r.URL.Path, remote(r))
	http.Redirect(w, r, mkUrl(r.URL.Path, exp), 302)
}

func main() {
	flag.Parse()

	log.SetFlags(0)

	http.HandleFunc("/", redirect)
	log.Fatal(http.ListenAndServe(":8123", nil))
}
