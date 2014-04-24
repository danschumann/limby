module.exports = function(limby, models) {

  var
    _     = require('underscore'),
    User  = models.User;

  var controller = {

    index: function(req, res, next) {
      res.view('signup', {body: req.locals.signup});
    },

    post: function(req, res, next) {

      var user = User.forge();

      // This method can be wrapped or overwritten
      return user.signupParams(req.body) // will throw if not valid
        .then(function(){
          return user.hashPassword()
        })
        .then(function(){
          return user.save({method: 'insert'})
        })
        .then(function(){
          if (!user.id) throw new Error('Could not create user, unknown error!');

          // Success
          user.mailers && _.isFunction(user.mailers.signup) && user.mailers.signup();
          req.session.user_id = user.get('id');
          res.redirect('/');

        })
        .otherwise(function(errors){

          // Error
          req.error(errors);

          // Remember fields to put back into form
          req.locals.signup = user.toJSON();

          controller.index(req, res, next);

        });
    },

  };

  return controller;

};
