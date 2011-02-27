#!/usr/bin/env python

import os
import sys
import time
import base64
import hashlib
import getpass

import couchdb

import photoutils

from PIL import Image

FORMATS = {'JPEG': 'jpg'}

TNSIZE = 220, 146

db = couchdb.Server('http://localhost:5984/')['photo']

def takenDate(exif):
    # Try to find a time in the exif data.
    timefields = ['Image DateTime', 'EXIF DateTimeOriginal',
                  'EXIF DateTimeDigitized']
    for timefield in timefields:
        if timefield in exif:
            return exif[timefield].split(' ')[0].replace(':', '-')
    # Otherwise return the current time
    return time.strftime('%Y-%m-%d')

def md5File(filename, block_size=65536):
    md5 = hashlib.md5()
    with open(filename,'rb') as f:
        while True:
            data = f.read(block_size)
            if not data:
                break
            md5.update(data)
    return md5.hexdigest()

def saveAttachment(docid, filename, name, contentType):
    rev = db[docid]['_rev']
    with open(filename) as imgFile:
        db.put_attachment({'_id': docid, '_rev': rev}, imgFile,
                          filename=name,
                          content_type=contentType)

def saveScaled(docid, i, size, name, contentType):
    scaled = i.resize(photoutils.scaleDims(i.size, size), Image.ANTIALIAS)
    fn = "/tmp/uploadtmp.%d.%s" % (os.getpid(), name)
    scaled.save(fn)
    try:
        saveAttachment(docid, fn, name, contentType)
    finally:
        os.unlink(fn)

def uploadFile(filename):
    exif = photoutils.getExifData(filename)

    i = Image.open(filename)

    doc = {}
    doc['width'], doc['height'] = i.size
    doc['keywords'] = ['unprocessed']
    doc['descr'] = 'Uploaded image.'
    doc['size'] = os.stat(filename).st_size
    doc['extension'] = FORMATS.get(i.format, i.format).lower()
    doc['tnwidth'], doc['tnheight'] = photoutils.scaleDims(i.size, TNSIZE)
    doc['cat'] = 'Private'
    doc['addedby'] = getpass.getuser()
    doc['type'] = 'photo'
    doc['ts'] = time.strftime("%Y-%m-%dT%H:%M:%S")
    doc['taken'] = takenDate(exif)
    doc['_id'] = md5File(filename)
    doc['exif'] = exif
    ext = doc['extension']

    print doc

    docid, rev = db.save(doc)
    saveAttachment(docid, filename, 'original.' + ext,
                   'image/' + i.format.lower())
    saveScaled(docid, i, (800, 600), '800x600.' + ext,
               'image/' + i.format.lower())
    saveScaled(docid, i, TNSIZE, 'thumb.' + ext,
               'image/' + i.format.lower())

if __name__ == '__main__':
    for fn in sys.argv[1:]:
        try:
            uploadFile(fn)
        except:
            import traceback
            traceback.print_exc()
