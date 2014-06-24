$(function(){

  var group_id = $('.permission_group').attr('data-group_id');

  $('.permission_group_user').change(function(e) {
    var $pgu = $(e.currentTarget)

    $.post('/admin/permissions/groups/' + group_id + '/users/' + $pgu.attr('data-user_id'),
      {toggle: $pgu.is(':checked') || undefined},
      function(res) {
      }
    );

  });

  $('.permission_group_role').change(function(e) {
    var $pgu = $(e.currentTarget)

    $.post('/admin/permissions/groups/' + group_id + '/roles/' + $pgu.attr('data-role_id'),
      {toggle: $pgu.is(':checked') || undefined},
      function(res) {
      }
    );

  });

});
