var _ = require('underscore');

module.exports = function(limby, models) {
  return {

    toggle: function(req, res, next) {

      models.PermissionUserRole.forge({
        limby_permission_id: req.params.role_id,
        user_id: req.params.user_id,
      }).fetch()
      .then(function(userRole) {

        if ( userRole && !req.body.toggle ) {
          // exists and they don't want it too
          userRole.destroy()
          .then(function(){
            res.send(true);
          });

        } else if ( !userRole && req.body.toggle ) {
          // doesn't exist but should
          models.PermissionUserRole.forge({
            user_id: req.params.user_id,
            limby_permission_id: req.params.role_id,
          }).save()
          .then(function() {
            res.send(true);
          });

        }

      });

    },

  };

};
