$(function() {

  $('.disabled_user').change(function(e) {

    var $check, toggle;
    $check = $(e.currentTarget);
    toggle = $check.is(':checked');

    $.post( (window.baseURL || '') + "/admin/users/" + $check.attr('data-id'), {
      disable: toggle
    }, function(res) {

      if (res && res.success) {

        flash[toggle && 'success' || 'info'](
          "<strong>" + ($check.parent().parent().find('.name').html()) + "</strong> is " + (toggle ? 'now' : 'no longer') + " disabled"
        );

      } else {
        $check.prop('checked', !toggle); // uncheck or recheck since it failed
        flash.danger(res && res.messages || 'Unknown error')
      }
    });
  });

  $('.admin_user').change(function(e) {

    var $check, toggle;
    $check = $(e.currentTarget);
    toggle = $check.is(':checked');

    $.post( (window.baseURL || '') + "/admin/users/" + $check.attr('data-id'), {
      toggle: toggle
    }, function(res) {

      if (res && res.success) {

        flash[toggle && 'success' || 'info'](
          "<strong>" + ($check.parent().parent().find('.name').html()) + "</strong> is " + (toggle ? 'now' : 'no longer') + " an admin"
        );

      } else {
        $check.prop('checked', !toggle); // uncheck or recheck since it failed
        flash.danger(res && res.messages || 'Unknown error')
      }
    });
  });
});
