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
          res.view('forgot_password_sent', attributes);
        })
        .otherwise(function(errors){
          req.flash.danger(errors);
          res.view('forgot_password', {body: req.body});
        });
    },

  };

};
