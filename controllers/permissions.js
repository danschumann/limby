var _ = require('underscore');

module.exports = function(limby, models) {
  var
    when      = require('when'),
    Permission = models.Permission,
    User = models.User;

  return {

    index: function(req, res, next) {

      var
        output = {};

      models.Permissions.forge().fetchOrderedWithParents()
      .then(function(permissions) {
        output.permissions = permissions;
      })
      .then(function(groups){
        return models.PermissionGroups.forge().fetch({withRelated: ['permission_group_roles']});
      })
      .then(function(groups){
        output.groups = groups;
        return models.Users.forge().query(function(qb){
          qb.orderBy('first_name');
          qb.orderBy('last_name');
          qb.where('deleted', null);
        }).fetch({withRelated: ['permission_roles', 'group_users']});
      })
      .then(function(users){
        output.users = users;
        res.view('permissions/index', output);
      });

    },

  };

};
