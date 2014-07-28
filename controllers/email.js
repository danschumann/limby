module.exports = function(limby, models) {
  var
    when = require('when'),
    _    = require('underscore'),
    User = models.User;

  var controller = {

    index: function(req, res, next){
      res.view('account/email', {formData: req.locals.attributes || {}});
    },

    post: function(req, res, next){

      // clone so we don't mess up their actual record
      var user = req.locals.user.clone();

      req.locals.attributes = req.locals.attributes || {};

      req.locals.attributes.email = _.escape(req.body.email);
      req.locals.attributes.confirm_email = _.escape(req.body.confirm_email);

      when().then(function(){

        if (req.locals.attributes.email == user.get('email'))
          return user.reject('email', 'Not different from your current email');

        else
          return user
            .set(req.locals.attributes)
            .validate('email', 'confirm_email', 'unique_email')

      })
      .then(function(){
        return user.save();
      })
      .then(function(user){
        req.flash.success('You have successfully changed your email');
        res.redirect(limby.baseURL + '/account');
      })
      .otherwise(function(){
        req.flash.danger(user.errors);
        controller.index(req, res, next);
      });
    },

  };

  return controller;
};
