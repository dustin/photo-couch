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
        while( (row = getRow()) ) {
            lastKey = row.key;
            send(Mustache.to_html(templates.recent.row, {
                id: row.value._id,
                ts: row.value.ts,
                taken: row.value.taken,
                show: path.show('item', row.value._id),
                thumb: path.attachment(row.value._id,
                                       'thumb.' + row.value.extension)
            }));
        }
        data.more = path.list('recent', 'recent-added', {skip: 1,
                                                         startkey: lastKey,
                                                         descending: true,
                                                         limit: 50});
        send(Mustache.to_html(templates.recent.tail, data));
    });
}
