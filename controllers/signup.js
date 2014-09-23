module.exports = function(limby, models) {

  var
    _     = require('underscore'),
    debug = require('debug')('limby:controllers:signup'),
    User  = models.User;

  var controller = {

    index: function(req, res, next) {
      res.view('signup', {body: req.locals.signup});
    },

    post: function(req, res, next) {

      debug('post');

      // Could have been supplied by middleware
      var user = req.locals.user || User.forge();

      var attributes = req.locals.attributes || {};
      
      _.each(['first_name', 'last_name', 'email', 'confirm_email'], function(key){
        attributes[key] = _.escape(req.body[key]);
      });

      attributes.password = req.body.password;

      debug('set, validate')
      return user
        .set(attributes)
        .validateBatch('signup')
        .then(function(){
          debug('trigger signup')
          return user.trigger('signup') // any middleware supplied user could have callbacks
        })
        .then(function(){
          debug('hashPassword')
          return user.hashPassword()
        })
        .then(function(){
          debug('save')
          return user.save({method: 'insert'})
        })
        .then(function(){
          debug('saved', user && user.toJSON())
          if (!user.id) throw new Error('Could not create user, unknown error!');

          // Success
          user.mailers && _.isFunction(user.mailers.signup) && user.mailers.signup();
          console.log(user, user.get('id'));
          debug('set session', user.get('id'));
          req.session.user_id = user.get('id');
          res.redirect(limby.baseURL + '/');

        })
        .otherwise(function(er){
          if (er) console.log('Signup error'.red, er, er.stack);
          req.flash.danger(user.errors);

          // Remember fields to put back into form
          req.locals.signup = user.toJSON();

          controller.index(req, res, next);

        });
    },

  };

  return controller;

};
