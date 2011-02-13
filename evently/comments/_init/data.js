function(data) {
  var app = $$(this).app;
  var path = app.require("vendor/couchapp/lib/path").init(app.req);
  var markdown = app.require("vendor/couchapp/lib/markdown");

    return { comments: data.rows.map(function(r) { return r.value;}),
             hascomments: data.rows.length > 0,
             nocomments: data.rows.length == 0};
}
