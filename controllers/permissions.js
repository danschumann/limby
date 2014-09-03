var _ = require('underscore');

module.exports = function(limby, models) {

  var
    when       = require('when'),
    Permission = models.Permission,
    User       = models.User;

  return {

    // Loads for index and showing a single user via json
    index: function(req, res, next) {

      var
        output = {};

      models.Permissions.forge().fetchOrderedWithParents().then(function(permissions) {
        output.permissions = permissions;
      }).then(function(groups){
        return models.PermissionGroups.forge().query(function(qb){
          qb.orderBy('name');
        }).fetch({withRelated: ['permission_group_roles', 'permission_group_users']});
      }).then(function(groups){
        output.groups = groups;
        var id = req.query.user_id;
        return models[id ? 'User' : 'Users'].forge().query(function(qb){
          qb.orderBy('first_name');
          qb.orderBy('last_name');
          qb.where('deleted', null);
          if (id) qb.where('id', id);
        }).fetch({withRelated: ['permission_roles', 'group_users']});
      }).then(function(users){
        output.users = users;

        var parseGroups = function(user) {
          var perms = {};
          user.set('perms', perms);
          output.groups.each(function(group){
            if (user.related('group_users').findWhere({limby_permission_group_id: group.id})){
              group.related('permission_group_roles').each(function(pgr) {
                (perms[pgr.get('limby_permission_id')] = perms[pgr.get('limby_permission_id')] || [])
                  .push(group.get('name'));
              });
            }
          });

        };

        if (!users) {
          req.json({error: 'Could not find that user'})
        } else if (users && users.each) {
          users.each(parseGroups)
          res.view('permissions/index', output);
        } else {
          parseGroups(users);
          res.view('permissions/user', _.extend(output, {user: users}));
        }

      });

    },

  };

};
