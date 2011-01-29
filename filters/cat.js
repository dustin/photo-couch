function(doc, req) {
  // Replicate special docs.
  if(doc._id.charAt(0) == "_") {
    return true;
  }

  // make sure we don't access any fields that
  // might be undefined
  if(!doc.cat) {
    return false;
  }

  if(!req.query.cat) {
    throw("Please provide a query parameter `name`.");
  }

  // else

  if(doc.cat == req.query.cat) {
    // the query parameter `name` matches
    // the corresponding field in `doc`
    return true;
  }

  // by default, don't send anything
  return false;
}
