var _ = require('underscore');

module.exports = function(limby, models) {
  var
    PermissionGroup = models.PermissionGroup;

  return {

    toggle: function(req, res, next) {

      // We grab the group with the permission
      PermissionGroup.forge({id: req.params.group_id}).fetch({
        withRelated: {
          permission_group_roles: function(qb) {
            qb.where('limby_permission_id', parseInt(req.params.role_id));
          },
        },
      })

      .then(function(group) {

        if ( group.related('permission_group_roles').length && !req.body.toggle ) {
          // exists and they don't want it too

          group.related('permission_group_roles').first().destroy()
          .then(function(){
            res.send(true);
          });

        } else if ( !group.related('permission_group_roles').length && req.body.toggle ) {
          // doesn't exist but should

          models.PermissionGroupRole.forge({
            limby_permission_id: req.params.role_id,
            limby_permission_group_id: req.params.group_id,
          }).save()
          .then(function(pgu) {
            res.send(true);
          });

        }

      });

    },

  };

};
