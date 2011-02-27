import EXIF

def scaleDims(dims, desired):
    """(w,h) -> ~(w, h)"""

    w, h = desired
    aspect = float(dims[0]) / float(dims[1])
    rw, rh = w, h

    if w <= rw or h < rh:
        rw = w
        rh = int(rw / aspect)

        if rw > w or rh > h:
            rh = h
            rw = int(rh * aspect)

    return rw, rh

def getExifData(filename):
    exif = {}
    with open(filename) as f:
        exifData = EXIF.process_file(f)
        for tag in exifData.keys():
            if tag not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename',
                           'EXIF MakerNote'):
                try:
                    exif[unicode(tag)] = unicode(exifData[tag]).strip()
                except:
                    print "Skipping", tag, "in", doc['_id']
                    print repr(exifData[tag])
    return exif
