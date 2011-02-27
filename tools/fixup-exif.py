#!/usr/bin/env python

import os
import sys
import shutil

import couchdb

import photoutils

PICS_PER_BATCH = 100

db = couchdb.Server('http://localhost:5984/')['photo']

keepGoing = True

failed=set()

while keepGoing:
    print "Doing a batch of", PICS_PER_BATCH
    docs = []
    for d in db.view('app/missing-exif', limit=PICS_PER_BATCH):
        doc = couchdb.Document(_id=d.id)
        doc.update(d.value)
        if doc['extension'] == 'jpg' and doc['_id'] not in failed:
            # print "Doing", doc['_id']

            filename = doc['_id'] + '.jpg'
            outfile = open(filename, "w")

            try:
                att = db.get_attachment(doc['_id'], 'original.jpg')
                shutil.copyfileobj(att, outfile)
                att.close()
                outfile.close()
                doc['exif'] = photoutils.getExifData(filename)
                # print doc
                docs.append(doc)
            finally:
                os.unlink(filename)

    try:
        db.update(docs)
    except:
        import traceback
        traceback.print_exc()

        print "Switching to one at a time."
        for d in docs:
            try:
                db.update([d])
            except:
                failed.add(d['_id'])
                print "Failed on", d['_id']
    keepGoing = bool(docs)
