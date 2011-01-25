function(doc, req) {
    var mustache = require("vendor/couchapp/lib/mustache");
    var path = require("vendor/couchapp/lib/path").init(req);
    doc.kw = [];
    for (var i = 0; i < doc.keywords.length; ++i) {
        doc.kw.push({
            name: doc.keywords[i],
            link: path.list('tag', 'tag', {key: doc.keywords[i]})
        });
    }
    doc.imageLink = path.attachment(doc._id, '800x600.jpg');
    return mustache.to_html(this.templates.item, doc);
}