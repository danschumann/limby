$(function(){
  $('.edit-permission-description').click(function(e){
    var
      $button = $(e.currentTarget),
      $html = $button.next('.permission-description'),
      description = $.trim($html.text()),
      $input = $('<textarea />').val(description.replace(/<br>/g, '\n'));

    $html.after($input).hide();
    $button.hide()

    var update = _.debounce(function(){
      $.post(baseURL + '/admin/permissions/' + $(e.currentTarget).attr('data-id'), {description: $input.val()}, function(res) {

        $button.show()
        if (res.type) {
          flash[res.type](res.message);
          if (res.html) $html.html(res.html);
        } else {
          flash.danger('Could not read response from server');
        }
        $html.show();
        $input.hide()
      });
    }, 100);
    $input.on('change blur',update);
    $input.on('keydown', function(e) {
      if (e.keyCode == 13 && !e.shiftKey) {
        e.preventDefault();
        update(e);
        $input.blur()
      }
    });
  });

});
