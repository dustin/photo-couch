function(doc) {
    if (!doc.keywords) {
        return;
    }
    for (var i = 0; i < doc.keywords.length; ++i) {
        emit(doc.keywords[i], doc);
    }
}