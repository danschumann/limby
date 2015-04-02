module.exports = function(limby, models) {
  var
    User = limby.models.User;

  return {

    // Ensures the password token is accurate before
    token: function(req, res, next) {

      User.forge({id: req.query.user_id}).fetch()
      .then(function(user){
        if (user.get('password_token') !== req.query.token)
          req.flash.danger({token_incorrect: 'It has either been too long since you sent the `reset password` email, or you have a newer `forgot password` email. <a href="' + limby.baseURL + '/forgot_password"> Click here to try again </a>'});

        else if ( user.get('password_token_expires') < (new Date).getTime() )
          req.flash.danger({token_expired: 'That token has expired, please <a href="' + limby.baseURL + '/forgot_password"> try again </a>.'});
        else
          // Remember user for POSTing a new password
          req.locals.user = user;

        next();
      })
      .otherwise(function(){
        req.flash.danger('Cannot get that user');
        next();
      });
    },

  }

}
