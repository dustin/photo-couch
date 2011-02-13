function(me, args) {
    var app = $$(this).app;
    var path = app.require("vendor/couchapp/lib/path").init(app.req);

    var tags = {};

    for (var i = 0; i < me.rows.length; ++i) {
        tags[me.rows[i].key] = me.rows[i].value;
    }

    /* For pretty number formatting. */
    var format = pv.Format.number();

    var vis = new pv.Panel()
        .width($(window).width() - 20)
        .height($(window).height() - 20);

    vis.add(pv.Layout.Pack)
        .nodes(pv.dom(tags).root("tags").nodes())
        .size(function(d) { return d.nodeValue;})
        .spacing(1)
        .order("descending")
        .node.add(pv.Dot)
            .event("click", function(d) {
                       var l = path.list('tag', 'tag', {key: d.nodeName, reduce: false});
                       window.location = l;
                   })
            .fillStyle(pv.Colors.category20().by(function(d) { return d.nodeValue;}))
            .strokeStyle(function() { return this.fillStyle().darker();})
            .visible(function(d) { return d.parentNode;})
            .title(function(d) { return d.nodeName + ": " + format(d.nodeValue);})
            .anchor("center").add(pv.Label)
            .text(function(d) { return d.nodeName.substring(0, Math.sqrt(d.nodeValue) / 2);});

    vis.render();
}
