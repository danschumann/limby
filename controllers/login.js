module.exports = function(limby, models) {
  var
    _    = require('underscore'),
    User = models.User;

  return {

    index: function(req, res, next) {
      res.view('login', {body: {email: _.escape(req.body.email)}});
    },

    post: function(req, res, next) {

      var user = req.locals.user || User.forge({
        email: _.escape(req.body.email),
        password: req.body.password,
      });

      user.logOn = true;

      user
        .validateBatch('login')
        .then(function() {
          return user.loginStrategy();
        })
        .then(function(match) {
          if (!match)
            return user.reject({password: 'That password did not match'});
        })
        .then(function() {

          req.session.user_id = user.get('id');
          req.session.login = {}; // any variables to be cleared upon login

          user.trigger('login');

          if (!res._header) {
            if (req.session.previousURL) {
              var url = req.session.previousURL;
              delete req.session.previousURL;
              res.redirect(url);
            } else
              res.redirect(limby.baseURL + '/');
          };
        })
        .otherwise(function(er) {
          if (user.errors.email)
            // if user error, we display it, and only one
            user.errors = { email: _.first(user.errors.email) };
          req.flash.danger(user.errors);
          if (!user.errored()) {
            req.flash.danger("Unknown error! Contact Portal Admin");
            console.log('uncaught error'.red, er, er.stack);
          }
          res.redirect(limby.baseURL + '/login#login-index')
        });

    },

  };

};
