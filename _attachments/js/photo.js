function field_blur_behavior(field, def) {
	var f=$(field);
	var defaultClass='defaultfield';
    function blurBehavior() {
        console.log("Doing blur behavior.");
        if(!f.val() || f.val() === '') {
            console.log("Value is empty, setting to ``" + def + "''");
	        f.val(def);
	    } else {
            console.log("Value is currently ``" + f.value + "''");
        }
    }
    function focusBehavior() {
        console.log("Doing focus behavior.");
        if(f.val() === def) {
	        f.val('');
		}
    }
	blurBehavior();
	$(f).bind('focus', focusBehavior);
	$(f).bind('blur', blurBehavior);
    $(window).bind('unload', focusBehavior);
}

function photo_search(app, input) {
    var path = app.require("vendor/couchapp/lib/path").init(app.req);

    // console.log("Searching for " + input.val());
    // $('#items').html("<h1>Search Results for \"" + input.val() + "\"</h1>");
    // $('#items').append("<div id='search_results'>");

    window.location = path.list('tag', 'tag', {key: input.val(),
                                               include_docs: true,
                                               reduce: false,
                                               limit: 50});
}

function photo_bulk_edit(app, form) {
    console.log("Enabled bulk editor for app");
    console.log(app);

    for (var i = 0; i < docs.length; ++i) {
        $("#" + docs[i]._id + "-cat").val(docs[i].cat);
    }

    $(form).submit(function() {
        console.log("Updating a bunch of docs.");

        for (var i = 0; i < docs.length; ++i) {
            docs[i].keywords = $("#" + docs[i]._id + "-tags").val().split(" ");
            docs[i].descr = $("#" + docs[i]._id + "-descr").val();
            docs[i].cat = $("#" + docs[i]._id + "-cat").val();
        }

        app.db.bulkSave({docs: docs}, {
            success: function() {
                var path = app.require("vendor/couchapp/lib/path").init(app.req);
                window.location = path.asset('index.html');
            },
            error: function(req, status, err) {
                console.log(err);
                alert(err);
            }
        });


        return false;
    });
}

function photo_recent_feed(app, target) {
    var path = app.require("vendor/couchapp/lib/path").init(app.req);
    var Mustache = app.require("vendor/couchapp/lib/mustache");

    var tmpl = '<a href="{{show}}"><img src="{{thumb}}" alt="full image"' +
        ' title="Added {{ts}}, taken {{taken}}"/></a>';

    var changeFeed = app.db.changes(false, {"include_docs": true});
    changeFeed.onChange(function(data) {

        for (var i = 0; i < data.results.length; ++i) {
            var row = data.results[0];
            var thumbname = 'thumb.' + row.doc.extension;
            if (row.doc['_attachments'] && row.doc._attachments[thumbname]) {
                var tdata = {
                    show: path.show('item', row.id),
                    thumb: path.attachment(row.id, thumbname),
                    ts: row.doc.ts,
                    taken: row.doc.taken
                };

                target.prepend(Mustache.to_html(tmpl, tdata));
            }
        }
    });
}

function photo_maybe_enable_admin_functions(app) {
    $.couch.session({
        success : function(r) {
            var userCtx = r.userCtx;
            if (userCtx.roles.indexOf("_admin") != -1) {
                $(".admin").show();
            }
        }
    });
}