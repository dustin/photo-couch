function(doc, req) {
    var mustache = require("vendor/couchapp/lib/mustache");
    doc.kw = [];
    for (var i = 0; i < doc.keywords.length; ++i) {
        doc.kw.push({name: doc.keywords[i]});
    }
    return mustache.to_html(this.templates.item, doc);
}