function() {
    $('#slider').cycle({
	    fx: 'scrollLeft',
        sync: true,
        after: function(curr, next, opts) {
            $('#caption').html(slideshowCaptions[opts.currSlide]);
        }
    });
    $('#caption').innerHtml(slideshowCaptions[0]);
}
