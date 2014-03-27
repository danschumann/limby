var _ = require('underscore');

module.exports = function(limby, models) {
  var
    Permission = models.Permission,
    User = models.User;

  return {

    index: function(req, res, next) {

      var
        output = {};

      models.Permissions.forge().fetch()
      .then(function(permissions){
        output.permissions = permissions;

        return models.PermissionGroups.forge().fetch();
      })
      .then(function(groups){
        output.groups = groups;
        return models.Users.forge().fetch({withRelated: ['permission_roles']});
      })
      .then(function(users){
        output.users = users;
        res.view('permissions/index', output);
      });

    },

  };

};
