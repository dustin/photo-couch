function(head, req) {

    // !json templates.head
	// !json templates.bulktop
	// !json templates.bulkedit
	// !json templates.bulktail
	// !json templates.tail

	provides("html", function() {
		var row;

		var data = {
			title: "Photo Bulk Edit",
            mainid: "bulkedit"
		};

        var Mustache = require("vendor/couchapp/lib/mustache");
        var path = require("vendor/couchapp/lib/path").init(req);

		send(Mustache.to_html(templates.head, data));

        var docs = [];

        while ( (row = getRow()) ) {
            docs.push(row.doc);
        }

		send(Mustache.to_html(templates.bulktop, {docs: JSON.stringify(docs)}));

        for (var i = 0; i < docs.length; ++i) {
            row = docs[i];
            send(Mustache.to_html(templates.bulkedit, {
				id: row._id,
                ts: row.ts,
                taken: row.taken,
                tags: row.keywords.join(" "),
                description: row.descr,
				show: path.show('item', row._id),
                thumb: path.attachment(row._id,
                                       'thumb.' + row.extension)
			}));
        }

        send(Mustache.to_html(templates.bulktail, data));
		send(Mustache.to_html(templates.tail, data));
	});

}