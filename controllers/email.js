module.exports = function(limby, models) {
  var
    when = require('when'),
    User = models.User;

  return {

    index: function(req, res, next){
      res.view('account/email');
    },

    post: function(req, res, next){

      // clone so we don't mess up their actual record
      var user = req.locals.user.clone();

      var attributes = _.pick(req.body, 'email', 'confirm_email');

      when().then(function(){

        if (req.body.email == user.get('email'))
          return user.reject('current_email', 'That email is the same as your current one');

        else
          return User.emailExists(req.body.email);

      })
      .then(function(exists){

        if (exists)
          return user.reject('email', 'That email already exists');

        else
          return user.changeEmail(attributes);

      })
      .then(function(user){
        req.notification('You have successfully changed your email');
        res.redirect('/');
      })
      .otherwise(function(errors){
        req.error(errors);
        res.view('account/email', {body: req.body});
      });
    },

  };
};
