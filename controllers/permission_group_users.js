var _ = require('underscore');

module.exports = function(limby, models) {
  var
    PermissionGroup = models.PermissionGroup,
    User = models.User;

  return {

    toggle: function(req, res, next) {

      PermissionGroup.forge({id: req.params.group_id}).fetch({
        withRelated: {
          permission_group_users: function(qb) {
            qb.where('user_id', parseInt(req.params.user_id));
          },
        },
      })
      .then(function(group) {

        if ( group.related('permission_group_users').length && !req.body.toggle ) {
          // exists and they don't want it too
          group.related('permission_group_users').first().destroy()
          .then(function(){
            res.send(true);
          });

        } else if ( !group.related('permission_group_users').length && req.body.toggle ) {
          // doesn't exist but should
          models.PermissionGroupUser.forge({
            user_id: req.params.user_id,
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
