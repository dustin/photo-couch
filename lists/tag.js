function(head, req) {
	// !json templates.tag

	provides("html", function() {
		var row;

		var data = {
			title: "Photo Tag",
		};

        var Mustache = require("vendor/couchapp/lib/mustache");
        var path = require("vendor/couchapp/lib/path").init(req);

		send(Mustache.to_html(templates.tag.head, data));

		while(row = getRow()) {
			send(Mustache.to_html(templates.tag.row, {
				id: row.value._id,
				show: path.show('item', row.value._id)
			}));
		}
		send(Mustache.to_html(templates.tag.tail, data));
	});
}
