function(doc) {
  if (doc.type === 'comment') {
      emit([doc.ts, doc.photo_id], doc);
  }
}
