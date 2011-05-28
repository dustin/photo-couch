function(doc) {
    if (doc.ts) {
    emit(doc.taken, doc);
    }
}
