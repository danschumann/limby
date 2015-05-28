module.exports = function(limby, models) {

  var
    login,
    _     = require('underscore'),
    User  = models.User;

  return {

    index: function(req, res, next){
      res.view('reset_password');
    },

    post: function(req, res, next){

      var attributes = _.pick(req.body, 'password', 'confirm_password');

      if ( !req.locals.user )
        return res.view('reset_password');

      var user = req.locals.user;

      attributes.password_token = null
      attributes.password_token_expires = null
      user
        .set(attributes)
        .validate('password', 'confirm_password')
        .then(function(){
          return user.hashPassword();
        })
        .then(function(){
          return user.save();
        })
        .then(function(){
          req.flash.success('You have updated your password');
          req.session.user_id = user.get('id');
          res.redirect(limby.baseURL + '/');
        })
        .otherwise(function(errors){
          req.flash.danger( errors );
          return res.view('reset_password');
        });

    },

  };

};
