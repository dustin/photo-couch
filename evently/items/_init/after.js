function() {
    $('#slider').nivoSlider({
        afterChange: function() {
            $('#slider').css('background', 'white');
        },
        controlNav:false
    });
}