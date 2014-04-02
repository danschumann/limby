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

      models.Permissions.forge().fetch()
      .then(function(permissions){
        output.permissions = permissions;

        return when.map(permissions.map(function(perm){
          if (perm.get('parent_id'))
            perm.load('parent');
        }));
      })
      .then(function(groups){

        return models.PermissionGroups.forge().fetch({withRelated: ['permission_group_roles']});
      })
      .then(function(groups){
        output.groups = groups;
        return models.Users.forge().fetch({withRelated: ['permission_roles', 'group_users']});
      })
      .then(function(users){
        output.users = users;
        res.view('permissions/index', output);
      });

    },

  };

};
