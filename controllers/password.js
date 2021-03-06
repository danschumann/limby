module.exports = function(limby, models) {

  var
    User  = models.User,
    when  = require('when'),
    _     = require('underscore');

  var controller = {

    index: function(req, res, next){
      res.view('account/password');
    },

    post: function(req, res, next){

      var
        checkerPromise,
        attributes = _.pick(req.body, 'password', 'confirm_password'),
        user = req.locals.user;

      if (user.get('password'))
        checkerPromise = user.checkPassword(req.body.current_password);
      else
        // They signed up through facebook, etc and have no password
        checkerPromise = true;

      when(checkerPromise)
      .then(function(matches){
        if ( !matches )
          user.error('current_password', 'Not entered correctly.');

        // We continue on to maybe get more errors
        return user
          .set(attributes)
          .validate('password', 'confirm_password');
      })
      .then(function(){
        if (user.errored())
          return user.reject();
        else
          return user.hashPassword();
      })
      .then(function(){
        return user.save();
      })
      .then(function(){
        if (req.xhr) {
          res.json({
            type: 'success',
            success: true,
            messages: 'You have successfully changed your password',
          });
        } else {
          req.flash.success('You have successfully updated your password');
          res.redirect(limby.baseURL + '/account');
        }
      })
      .otherwise(function(er){
        if (!user.errored())
          console.log('Uncaught password error', er)
        if (req.xhr) {
          res.json({
            type: 'danger',
            error: true,
            messages: user.errored() ? user.errors : 'Unknown error setting password',
          });
        } else {
          req.flash.danger(user.errors);
          controller.index(req, res, next);
        }
      });
    },

  };

  return controller;
};
