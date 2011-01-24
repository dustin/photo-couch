function() {
    $('#slider').cycle({
	    fx: 'scrollLeft',
        sync: true,
        after: function() {
            $('#caption').html(this.alt);
        }
    });
    $('#slider img').css('display: block');
}