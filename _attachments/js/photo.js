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
