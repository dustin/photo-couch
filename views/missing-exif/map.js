function(doc) {
    if (doc.type === 'photo' && doc.extension == 'jpg' && !doc.exif) {
        emit(null, doc);
    }
}
