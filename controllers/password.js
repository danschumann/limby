module.exports = function(limby, models) {
  var
    User  = models.User,
    _     = require('underscore');

  return {

    index: function(req, res, next){
      res.view('account/password');
    },

    post: function(req, res, next){

      var attributes = _.pick(req.body, 'password', 'confirm_password');

      req.locals.user.checkPassword(req.body.current_password)
        .then(function(matches){
          if ( ! matches )
            req.locals.user.newError('current_password', 'Please enter your current password correctly')

          return req.locals.user.changePassword(attributes);
        })
        .then(function(user){
          req.notification('You have successfully editted your account');
          res.redirect('/');
        })
        .otherwise(function(errors){
          req.error(errors);
          res.view('account/password', {body: req.body});
        });
    },

  };
};
