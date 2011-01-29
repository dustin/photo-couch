function(head, req) {
	// !json templates.recent

	provides("html", function() {
		var row;

		var data = {
			title: "Recent Photos",
		};

        var Mustache = require("vendor/couchapp/lib/mustache");
        var path = require("vendor/couchapp/lib/path").init(req);

		send(Mustache.to_html(templates.recent.head, data));

		while(row = getRow()) {
			send(Mustache.to_html(templates.recent.row, {
				id: row.value._id,
                ts: row.value.ts,
                taken: row.value.taken,
				show: path.show('item', row.value._id),
                thumb: path.attachment(row.value._id, 'thumb.jpg')
			}));
		}
		send(Mustache.to_html(templates.recent.tail, data));
	});
}
