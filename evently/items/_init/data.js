function(data) {
  var p;
  return {
    items : data.rows.map(function(r) {
                              return r.value;
                          })
  }
};