var
  join = require('path').join,
  fs = require('final-fs');

module.exports = function(limby, models) {

  return {

    // Only logged in users may be at this page
    user: function(req, res, next) {
      if ( req.session.user_id )
        next();
      else {
        req.session.previousURL = (limby.baseURL && !limby.config.nodeNested ? limby.baseURL : '') + req.originalUrl;
        req.error('Please log in before continuing');
        res.redirect(limby.baseURL + '/login');
      };
    },

    // Only users that are not logged in may be at this page
    non: function(req, res, next) {
      if ( req.session.user_id )
        res.redirect(limby.baseURL + '/');
      else
        next();
    },

    admin: function(req, res, next) {
      if ( !req.locals.user || !req.locals.user.get('admin') ) {
        req.error('You must be an admin');
        res.redirect(limby.baseURL + '/');
      } else
        next();
    },

    permission: function() {

      // If we pass true as the first argument, we are checking if they can do ALL of the permissions
      // (rather than ANY)
      var
        all = (arguments[0] === true),
        perms = Array.prototype.slice.call(arguments, all ? 1 : 0);

      return function(req, res, next) {

        if (!req.locals.user) {
          req.error('You must be logged in to view that page');
          return res.redirect(limby.baseURL + '/');
        };

        // Super admins can go anywhere
        if ( req.locals.user.get('admin') ) return next();

        // Any or all of the permissions, based on first arg boolean
        var can = _[all ? 'all' : 'any'](perms, function(pName) {
          // Must load these from middleware.user.loadPermissions
          return req.locals.permissions.findWhere({name: pName});
        });

        if (can)
          return next();
        else {
          req.error('You might not have permission to view that page');
          res.redirect(limby.baseURL + '/');
        }

      };
    },

  };

  // currently unused but could get future use if we break out permissions that are 'always_loaded'
  function permissionUnwrapped(req, res, next, pName) {

    var found;
    
    // First we check groups for the permission
    limby.knex.raw(limby.queries.permission_groups, [req.locals.user.id, pName])
    .then(function(results) {
      var permissions = results && results[0];

      if ( permissions && permissions.length ) {
        next();
        found = true;
      } else
        // Then individual roles
        return limby.knex.raw(limby.queries.permission_user, [req.locals.user.id, pName]);
    })
    .then(function(results) {
      var permissions = results && results[0];

      // If we returned next() last function, this will just be null
      if ( found ) return;

      if ( permissions && permissions.length) {
        next();
      } else {
        req.error('You might not have permission to view that page');
        res.redirect(limby.baseURL + '/');
      };
    });

  };
};
