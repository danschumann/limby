module.exports = function(limby, models) {
  var
    User = models.User;

  return {

    index: function(req, res, next){
      res.view('forgot_password');
    },

    post: function(req, res, next){

      var attributes = _.pick(req.body, limby.config.login.column);

      User.forgot_password(attributes)
        .then(function(user){
          if (req.xhr)
            res.json({
              success: true,
              type: 'success',
              messages: 'Please check your email for the recovery email.'
            });
          else
            res.view('forgot_password_sent', attributes);
        })
        .otherwise(function(errors){
          if (req.xhr)
            res.json({
              error: true,
              type: 'danger',
              messages: errors
            });
          else {
            req.flash.danger(errors);
            res.view('forgot_password', {body: req.body});
          }
        });
    },

  };

};
