function(doc, req) {
    var mustache = require("vendor/couchapp/lib/mustache");
    var path = require("vendor/couchapp/lib/path").init(req);
    var markdown = require("vendor/couchapp/lib/markdown");
    doc.kw = [];
    var kw = doc.keywords;
    kw.sort();
    doc.kw = kw.map(function(k) {
                        return {
                            name: k,
                            link: path.list('tag', 'tag', {key: k,
                                                           limit: 50,
                                                           reduce: false,
                                                           include_docs: true})
                        };
                    });
    doc.dbname    = req.info.db_name;
    doc.imageLink = path.attachment(doc._id,
                                    '800x600.' + doc.extension);
    doc.origLink = 'http://bleu.west.spy.net/s3sign/original/' +
        doc._id.substr(0, 2) + '/' + doc._id + '.' + doc.extension;
    doc.markeddown = markdown.encode(doc.descr);
    return mustache.to_html(this.templates.item, doc);
}