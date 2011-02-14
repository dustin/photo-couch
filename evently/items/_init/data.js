function(data) {
  var app = $$(this).app;
  var path = app.require("vendor/couchapp/lib/path").init(app.req);
  var markdown = app.require("vendor/couchapp/lib/markdown");

  var all_items = data.rows.map(function(r) { return r.value; });
  var items = [];

  function cleanString(s) {
      return s.replace(/"/g, "&quot;").replace(/([\r\n])/g, " ");
  }

  /* Randomly grab 10 UOT pictures */
  while (all_items.length > 0 && items.length < 10) {
      var offset = Math.floor(Math.random() * all_items.length);
      var anItem = all_items[offset];
      var tags = anItem.keywords;
      tags.sort();
      var taglinks = tags.map(function(t) {
                       var l = path.list('tag', 'tag', {key: t, reduce: false});
                       return "<a href=" + l + ">" + t + "</a>";
                      });
      anItem.cleanDescr = anItem.taken + " - (" + taglinks.join(", ") + ")" +
                              cleanString(markdown.encode(anItem.descr));
      anItem.showLink = path.show('item', anItem._id);
      anItem.imageLink = path.attachment(anItem._id, '800x600.' + anItem.extension);
      items.push(anItem);
      all_items.splice(offset, 1);
  }
  return { items: items };
}
