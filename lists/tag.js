function(head, req) {
	// !json templates.head
	// !json templates.tag
	// !json templates.tail

	provides("html", function() {
		var row;

		var data = {
			title: "Photo Tag",
            mainid: "thumblist"
		};

        var Mustache = require("vendor/couchapp/lib/mustache");
        var path = require("vendor/couchapp/lib/path").init(req);

		send(Mustache.to_html(templates.head, data));

		while(row = getRow()) {
			send(Mustache.to_html(templates.tag.row, {
				id: row.id,
                ts: row.doc.ts,
                taken: row.doc.taken,
                description: row.doc.description,
				show: path.show('item', row.id),
                thumb: path.attachment(row.id,
                                       'thumb.' + row.doc.extension)
			}));
		}
		send(Mustache.to_html(templates.tail, data));
	});
}
