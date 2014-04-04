module.exports = function(limby, models) {

  var
    when = require('when'),
    userMiddleware;

  return userMiddleware = {

    // Only logged in users may be at this page
    load: function(req, res, next) {

      // Not logged in or already loaded user
      //   We don't care about not logged in because
      //   user auth is at middleware/authentication
      if ( !req.session.user_id || req.locals.user ) return next();

      models.User.forge({id: req.session.user_id}).fetch()
        .then(function(user) {
          if ( !user ) {
            // For some reason they have a session that has an invalid user token
            delete req.session.user_id;
            return res.redirect('/');
          };
          req.locals.user = user;
          if (user.get('banned')) {
            req.error('You have been temporarily banned for misuse, please try again later. ( HAHA )');
            delete req.session.user_id;
            return res.redirect('/');
          }

          next();

        })
        .otherwise(function(er) {
          delete req.session.user_id;
          req.error('You have been logged out, this may be a problem with our database.  Please log back in or try again later');
          res.redirect('/login');
        });
    },

    loadPermissions: function(req, res, next) {

      when().then(function(){
        console.log('permsmms');
        if (req.locals.user) return;

        var deferred = when.defer();
        userMiddleware.load(req, res, function(){
          deferred.resolve();
        });
        return deferred.promise;
      })
      .then(function(){
        loadPermissions(req, res, next);
      });

    },

  };

  function loadPermissions(req, res, next) {

    return req.locals.user.loadPermissions().then(function(permissions){
      req.locals.permissions = permissions;
      req.hasPermission = function(type) {
        return req.locals.user.get('admin') || req.locals.permissions.findWhere({name: type});
      };
      next();
    });

  }
};
