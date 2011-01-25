function(data) {
  var app = $$(this).app;
  var path = app.require("vendor/couchapp/lib/path").init(app.req);

  var all_items = data.rows.map(function(r) { return r.value; });
  var items = [];

  function cleanString(s) {
      return s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/([\r\n])/g, " ");
  }

  /* Randomly grab 10 UOT pictures */
  while (all_items.length > 0 && items.length < 10) {
      var offset = Math.floor(Math.random() * all_items.length);
      var anItem = all_items[offset];
      anItem.cleanDescr = cleanString(anItem.descr);
      anItem.showLink = path.show('item', anItem._id);
      anItem.imageLink = path.attachment(anItem._id, '800x600.jpg');
      items.push(anItem);
      all_items.splice(offset, 1);
  }
  return { items: items };
}
