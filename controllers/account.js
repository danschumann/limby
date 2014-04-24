var _ = require('underscore');

module.exports = function(limby, models) {
  var
    User = models.User;

  var controller = {

    index: function(req, res, next){
      // body is from post passing back to this method
      res.view('account/index', {body: req.body})
    },

    post: function(req, res, next){
      // Other limbs could add attributes if they are accepting more
      var attributes = req.locals.attributes || {};
      
      attributes.first_name = attributes.first_name || _.escape(req.body.first_name);
      attributes.last_name = attributes.last_name || _.escape(req.body.last_name);

      req.locals.user.editAccount(attributes)
        .then(function(user){
          req.flash.success('You have successfully editted your account');
          res.redirect('/');
        })
        .otherwise(function(errors){
          req.flash.danger(errors);
          controller.index(req, res, next);
        });
    },

  };

  return controller;
}
