function(head, req) {
    // !json templates.comments

    provides("html", function() {
        var row;

		var data = {
			title: "Recent Comments"
		};

        var Mustache = require("vendor/couchapp/lib/mustache");
        var path = require("vendor/couchapp/lib/path").init(req);

		send(Mustache.to_html(templates.comments.head, data));
        while(row = getRow()) {
            send(Mustache.to_html(templates.comments.row, {
                ts: row.value.ts,
                realname: row.value.realname,
			    note: row.value.note,
                show: path.show('item', row.value.photo_id),
                thumb: path.attachment(row.value.photo_id,
                                       'thumb.jpg')
			}));
		}
		send(Mustache.to_html(templates.comments.tail, data));
    });
}