module.exports = function(limby, models) {

  var
    when = require('when'),
    debug = require('debug')('limby:middleware:user'),
    userMiddleware = {};

  // Only logged in users may be at this page
  userMiddleware.load = function(req, res, next) {

    debug('load');

    // Not logged in or already loaded user
    //   We don't care about not logged in because
    //   user auth is at middleware/authentication
    if ( !req.session.user_id || req.locals.user ) return next();

    models.User.forge({id: req.session.user_id}).fetch()
      .then(function(user) {
        if ( !user ) {
          // For some reason they have a session that has an invalid user token
          delete req.session.user_id;
          return res.redirect(limby.baseURL + '/');
        };
        req.locals.user = user;
        if (user.get('banned')) {
          req.flash.danger('You have been temporarily banned for misuse, please try again later. ( HAHA )');
          delete req.session.user_id;
          return res.redirect(limby.baseURL + '/');
        }

        next();

      })
      .otherwise(function(er) {
        delete req.session.user_id;
        req.flash.danger('You have been logged out, this may be a problem with our database.  Please log back in or try again later');
        res.redirect(limby.baseURL + '/login');
      });
  };

  userMiddleware.loadPermissions = [
    userMiddleware.load,
    function (req, res, next) {

      if (req.locals.permissions) return next();

      if (! req.locals.user ) {

        req.locals.permissions = new models.Permissions;
        req.hasPermission = function(type) { };
        next();

      } else {

        req.locals.user.loadPermissions().then(function(permissions){
          req.locals.permissions = permissions;
          req.hasPermission = function(type) {
            return req.locals.user.get('admin') || req.locals.permissions.findWhere({name: type});
          };
          next();
        });

      };

    },
  ];

  return userMiddleware;

};
