function(doc) {
  if (doc.ts) {
    emit(doc.ts, doc);
  }
};