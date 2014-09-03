$(listen);

function listen() {
  $('.permission_user_role').off('change.pur').on('change.pur', _handler('role'))
  $('.permission_user_group').off('change.pug').on('change.pug', _handler('group'))
};

// routes handler
function _handler(type){
  return function(e) {
    flash.loading(true);
    var
      user_id = $(e.currentTarget).parents('[data-user_id]:first').attr('data-user_id'),
      $el = $(e.currentTarget),
      urlComponent = type == 'role'
        ? $el.attr('data-permission_id')
        : 'groups/' + $el.attr('data-group_id');

    $.post(
      (window.baseURL || '') + '/admin/permissions/' + urlComponent + '/users/' + user_id,
      {toggle: $el.is(':checked') || undefined},
      function(res) {
        populate(e, user_id);
      }
    );
  };
};

var populate = _.debounce(function(e, user_id){
  var $el = $(e.target).parents('.panel-body:first');
  $el.find('input').prop('disabled', true);

  $.get((window.baseURL || '') + '/admin/permissions?user_id=' + user_id, function(res) {
    flash.loading(false);
    flash.success('Updated');
    $el.html(
      $(res).find('.panel-body:first').html()
    );
    listen();
  });
}, 1000)
