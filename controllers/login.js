module.exports = function(limby, models) {
  var
    User = models.User;

  return {

    index: function(req, res, next) {
      res.view('login');
    },

    post: function(req, res, next) {

      var user = User.forge({
        email: _.escape(req.body.email),
        password: req.body.password,
      });

      user
        .validateBatch('login')
        .then(function() {
          return user.loginStrategy();
        })
        .then(function(match) {
          console.log(user, user.errors);
          if (!match)
            return user.reject({password: 'That password did not match'});
        })
        .then(function() {
          req.session.user_id = user.get('id');
          res.redirect('/');
        })
        .otherwise(function(er) {
          console.log('ahdfhasdfhads'.red, er, er.stack);
          req.error(user.errors);
          res.view('login', {body: {email: _.escape(req.body.email)}});
        });

    },

  };

};
