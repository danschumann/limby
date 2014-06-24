$(function() {

  $('.permission_user_role').change(function(e) {
    var $role = $(e.currentTarget)
    var user_id = $(e.currentTarget).parents('[data-user_id]:first').attr('data-user_id');

    $.post('/admin/permissions/' + $role.attr('data-permission_id') + '/users/' + user_id,
      {toggle: $role.is(':checked') || undefined},
      function(res) {
      }
    );

  });

  $('.permission_user_group').change(function(e) {
    $pgu = $(e.currentTarget)

    $.post('/admin/permissions/groups/' + $pgu.attr('data-group_id') + '/users/' + $pgu.attr('data-user_id'),
      {toggle: $pgu.is(':checked') || undefined},
      function(res) {
      }
    );

  });

});
