
function couchapp_prefix_load(prefix) {
    var scripts = [
        "/_utils/script/sha1.js",
        "/_utils/script/json2.js",
        "/_utils/script/jquery.js",
        "/_utils/script/jquery.couch.js",
        prefix + "vendor/couchapp/jquery.couch.app.js",
        prefix + "vendor/couchapp/jquery.couch.app.util.js",
        prefix + "vendor/couchapp/jquery.mustache.js",
        prefix + "vendor/couchapp/jquery.evently.js"
        ];
    for (var i=0; i < scripts.length; i++) {
        document.write('<script src="'+scripts[i]+'"><\/script>')
    };
};
