function(doc) {
    if (doc.type === 'photo' && !doc.exif) {
        emit(null, doc);
    }
}
