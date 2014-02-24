var
  when  = require('when'),
  _     = require('underscore');

module.exports = function(limby, models) {
  return {

    // not logged in
    welcome: function(req, res, next){
      res.view('base/index');
    },

    // logged in
    dashboard: function(req, res, next){

      // LDAP Account setup
      if (req.locals.user && !req.locals.user.get('email')) {

        req.notification("Please set the email you'd like to receive updates from");
        return res.redirect('/email');

      } else if (req.locals.user && !req.locals.user.get('first_name')) {

        req.notification("Please set your name");
        return res.redirect('/account');

      } 

      res.view('home');

    },
  };

};
