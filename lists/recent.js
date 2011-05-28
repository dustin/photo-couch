function(head, req) {
    // !json templates.head
    // !json templates.recent

    provides("html", function() {
        var row;

        var data = {
            title: "Recent Photos",
            mainid: "thumblist"
        };

        var Mustache = require("vendor/couchapp/lib/mustache");
        var path = require("vendor/couchapp/lib/path").init(req);

        send(Mustache.to_html(templates.head, data));

        var lastKey = "";
        var lastId = "";
        while( (row = getRow()) ) {
            lastKey = row.key;
            lastId = row.id;
            send(Mustache.to_html(templates.recent.row, {
                id: row.id,
                ts: row.doc.ts,
                taken: row.doc.taken,
                show: path.show('item', row.id),
                thumb: path.attachment(row.id,
                                       'thumb.' + row.doc.extension)
            }));
        }
        var q = req.query;
        q.skip=1;
        q.startkey = lastKey;
        q.lastId = lastId;
        data.more = path.list('recent', req.path[req.path.length-1], q);
        send(Mustache.to_html(templates.recent.tail, data));
    });
}
