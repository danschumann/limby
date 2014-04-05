module.exports = function(limby, models) {

  var
    User  = models.User,
    when  = require('when'),
    _     = require('underscore');

  return {

    index: function(req, res, next){
      res.view('account/password');
    },

    post: function(req, res, next){

      var attributes = _.pick(req.body, 'password', 'confirm_password');

      var user = req.locals.user;

      when().then(function(){
        if (user.get('password'))
          return user.checkPassword(req.body.current_password);
        else // if they don't have a password they can't match it...
          return true;
      })
      .then(function(matches){
        if ( !matches )
          return user.reject('current_password', 'Please enter your current password correctly');
        else
          return user.changePassword(attributes);
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
