function(data) {
  var app = $$(this).app;
  var path = app.require("vendor/couchapp/lib/path").init(app.req);
  var markdown = app.require("vendor/couchapp/lib/markdown");

    return { comments: data.rows.map(function(r) {
                                         var v = r.value;
                                         return {
                                             cid: v._id,
                                             ts: v.ts,
                                             realname: v.realname,
                                             note: markdown.encode(v.note)
                                         };
                                     }),
             hascomments: data.rows.length > 0,
             nocomments: data.rows.length == 0};
}
