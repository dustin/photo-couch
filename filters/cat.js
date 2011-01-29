function(doc, req) {
  // Replicate special docs.
  if(doc._id.charAt(0) == "_") {
    return true;
  }

  if(!doc.cat) {
    return false;
  }

  if(!req.query.cat) {
    throw("Please provide a query parameter `cat`.");
  }

  if(doc.cat == req.query.cat) {
    return true;
  }

  // by default, don't send anything
  return false;
}
