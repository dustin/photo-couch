#!/usr/bin/env python

import os
import sys

import upload

def process(basename, processing, done):
    workfile = os.path.join(processing, basename)
    donefile = os.path.join(done, basename)

    print "mv %s -> %s" % (basename, workfile)
    os.rename(basename, workfile)

    upload.uploadFile(workfile)

    print "mv %s -> %s" % (workfile, donefile)
    os.rename(workfile, donefile)

if __name__ == '__main__':
    incoming, processing, done = sys.argv[1:]

    os.chdir(incoming)
    for basename in os.listdir('.'):
        try:
            process(basename, processing, done)
        except:
            import traceback
            traceback.print_exc()
