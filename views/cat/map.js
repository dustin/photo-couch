function(doc) {
    if (doc.cat) {
        emit(doc.cat, 1);
    }
}
