function() {
  var docid = $$("#imagedisplay").docid;
  return {
    view : "comments",
    endkey : [docid, {}],
    startkey : [docid]
  };
};
