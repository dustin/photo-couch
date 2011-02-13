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
				id: row.value._id,
                ts: row.value.ts,
                taken: row.value.taken,
                description: row.value.description,
				show: path.show('item', row.value._id),
                thumb: path.attachment(row.value._id,
                                       'thumb.' + row.value.extension)
			}));
		}
		send(Mustache.to_html(templates.tail, data));
	});
}
