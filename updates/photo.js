function(doc, req) {
    doc.cat = req.form.cat;
    doc.descr = req.form.descr;
    doc.keywords = req.form.keywords.split(" ");
    doc.taken = req.form.taken;
    return [doc, 'ok'];
}
