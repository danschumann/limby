module.exports = function(limby, models) {
  var
    User = limby.models.User;

  return {

    // Ensures the password token is accurate before
    token: function(req, res, next) {
      var errorOut = function(){
        req.flash.danger.apply(req.flash, arguments);
        res.redirect(limby.baseURL + '/forgot_password')
      };

      User.forge({id: req.query.user_id}).fetch()
      .then(function(user){
        if (user.get('password_token') !== req.query.token)
          errorOut({token_incorrect: 'It has either been too long since you sent the `reset password` email, or you have a newer `forgot password` email. You can try again below'});

        else if ( user.get('password_token_expires') < (new Date).getTime() )
          errorOut({token_expired: 'That token has expired, please try again below.'});
        else {
          // Remember user for POSTing a new password
          req.locals.user = user;
          next();
        }

      })
      .otherwise(function(){
        errorOut('Cannot get that user');
        next();
      });
    },

  }

}
