var _ = require('underscore');

module.exports = function(limby, models) {
  var
    PermissionGroup = models.PermissionGroup,
    User = models.User;

  return {

    editNew: function(req, res, next) {
      res.view('permission_groups/create');
    },

    create: function(req, res, next) {
      PermissionGroup.forge({name: _.escape(req.body.name)}).save()
        .then(function(group) {
          res.redirect('/admin/permissions/groups/' + group.id);
        })
    },

    show: function(req, res, next) {

      var output = {};

      PermissionGroup.forge({id: parseInt(req.param('id'))}).fetch({
        withRelated: [
          'permission_group_users',
          'permission_group_roles',
        ],
      })
      .then(function(group){

        output.group = group;
        return models.Users.forge().fetch();
      })
      .then(function(users){
        output.users = users;
        return models.Permissions.forge().fetch();
      })
      .then(function(roles){
        output.roles = roles;
        res.view('permission_groups/show', output);
      });

    },

  };

};
