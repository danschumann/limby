module.exports = function(limby, models) {
  var
    _    = require('underscore'),
    User = models.User;

  var controller;
  return controller = {

    index: function(req, res, next) {
      res.view('login', {body: {email: _.escape(req.body.email)}});
    },

    post: function(req, res, next) {

      var user = req.locals.loginUser || req.locals.user || User.forge({
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
          return (user.delayLogin || require('when')()).then(function(){
            if (!res._header) { // make sure nothing has responded yet

              if (req.is('json'))
                res.json({
                  success: true,
                  type: 'success',
                  messages: 'You have been successfully logged on',
                  data: req.locals.responseJSON
                });
              else if (req.session.previousURL) {
                var url = req.session.previousURL;
                delete req.session.previousURL;
                res.redirect(url);
              } else
                res.redirect(limby.baseURL + '/#logged-in');

            };
          });
        })
        .otherwise(function(er) {
          if (user.errors.email)
            // if user error, we display it, and only one
            user.errors = { email: _.first(user.errors.email) };

          var errors = user.errors;
          if (!user.errored()) {
            errors = {unknown: 'Unknown error!  Please contact webmaster!'};
            console.log('uncaught error'.red, er, er.stack);
          }
          if (req.is('json'))
            res.json({error: true, type: 'danger', messages: errors});
          else {
            req.flash.danger(errors);
            controller.index(req, res, next);
          }
        });

    },

  };

};
