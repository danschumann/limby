module.exports = function(limby, models) {
  var
    User = models.User;

  return {

    index: function(req, res, next) {
      res.view('login');
    },

    post: function(req, res, next) {

      return User.login(req.body)
        .then(function(user) {
          req.session.user_id = user.get('id');
          res.redirect('/');
        })
        .otherwise(function(errors) {
          console.log(errors, errors.stack);
          req.error(errors);
          res.view('login', {body: req.body});
        });

    },

  };

};
