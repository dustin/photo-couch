#!/usr/bin/env python

import sys
import itertools

import boto
import couchdb

ROTATOR = itertools.cycle("-\\|/-\\|/")

conn = boto.connect_s3()
bucket = conn.get_bucket('photo.west.spy.net')

db = couchdb.Server('http://localhost:5984/')['photo']

def is_a_photo(doc):
    return 'type' in doc and doc['type'] == 'photo'

def check(key, doc):
    path = 'original/' + key[0:2] + '/' + key + '.' + doc['extension']
    k = bucket.get_key(path)
    etag = k.etag[1:-1]
    assert k
    assert etag == key, ("Invalid for %s (got %s)" % (key, k.etag))

startKey = None
keepGoing = True

processed = 0
skipped = 0

while keepGoing:
    did = 0
    rows = db.view('_all_docs', limit=100, include_docs=True, startkey=startKey)
    for d in rows:
        sys.stdout.write("\r" + next(ROTATOR))
        sys.stdout.flush()

        # Skip over continutations
        if d.key == startKey:
            continue

        did += 1
        startKey=d.key

        if not is_a_photo(d.doc):
            # print "Skipping %s (not a photo)" % (d.key)
            skipped += 1
            continue

        check(d.key, d.doc)
        processed += 1

    keepGoing = did > 0
    print "\r...%d/%d" % (rows.offset + len(rows), rows.total_rows)

print "Processed %d, skipped %d" % (processed, skipped)
