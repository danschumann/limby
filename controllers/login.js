module.exports = function(limby, models) {
  var
    User = models.User;

  return {

    index: function(req, res, next){
      res.view('login');
    },

    post: function(req, res, next){

      var attributes = _.pick(req.body, 'username', 'password');

      User.login(attributes)
        .then(function(user){
          if (user.newAccount)
            req.notification(
              "Using email address: <strong>" +
              user.get('email') +
              "</strong>.  If you'd like to use a different one, please <a href=\"/email\">change your email</a>"
            );
          req.session.user_id = user.get('id');
          req.session.admin = user.get('admin');
          res.redirect('/');
        })
        .otherwise(function(errors){
          console.log('whatttttt'.red, req.error);
          req.error(errors);
          res.view('login', {body: req.body});
        });

    },

  };

};
