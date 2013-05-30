function(doc) {
  if (doc.type === 'photo') {
    if (doc.exif && doc.exif['Image Make']) {
        emit([doc.exif['Image Make'].toLowerCase(),
              doc.exif['Image Model'].toLowerCase()],
             doc.size);
    }
  }
}
