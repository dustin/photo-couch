function field_blur_behavior(field, def) {
	var f=$(field);
	var defaultClass='defaultfield';
    function blurBehavior() {
        console.log("Doing blur behavior.");
        if(!f.val() || f.val() === '') {
            console.log("Value is empty, setting to ``" + def + "''");
	        f.val(def);
	    } else {
            console.log("Value is currently ``" + f.value + "''");
        }
    }
    function focusBehavior() {
        console.log("Doing focus behavior.");
        if(f.val() === def) {
	        f.val('');
		}
    }
	blurBehavior();
	$(f).bind('focus', focusBehavior);
	$(f).bind('blur', blurBehavior);
    $(window).bind('unload', focusBehavior);
}

function photo_search(app, input) {
    var path = app.require("vendor/couchapp/lib/path").init(app.req);

    // console.log("Searching for " + input.val());
    // $('#items').html("<h1>Search Results for \"" + input.val() + "\"</h1>");
    // $('#items').append("<div id='search_results'>");

    window.location = path.list('tag', 'tag', {key: input.val(), reduce: false});
}