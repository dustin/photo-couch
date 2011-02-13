function(doc) {
  if (doc.type === 'comment') {
      emit([doc.photo_id, doc.ts], doc);
  }
}
