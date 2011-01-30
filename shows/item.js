function(doc, req) {
    var mustache = require("vendor/couchapp/lib/mustache");
    var path = require("vendor/couchapp/lib/path").init(req);
    doc.kw = [];
    var kw = doc.keywords;
    kw.sort();
    doc.kw = kw.map(function(k) {
                        return {
                            name: k,
                            link: path.list('tag', 'tag', {key: k, reduce: false})
                        };
                    });
    doc.imageLink = path.attachment(doc._id,
                                    '800x600.' + doc.extension);
    return mustache.to_html(this.templates.item, doc);
}