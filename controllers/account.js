var _ = require('underscore');

module.exports = function(limby, models) {
  var
    User = models.User;

  var controller = {

    index: function(req, res, next){
      // body is from post passing back to this method
      res.view('account/index', {body: req.body})
    },

    post: function(req, res, next) {

      // Other limbs could add attributes if they are accepting more
      var attributes = req.locals.attributes || {};
      
      attributes.first_name = attributes.first_name || _.escape(req.body.first_name);
      attributes.last_name = attributes.last_name || _.escape(req.body.last_name);

      req.locals.user
        .set(attributes)
        .validateBatch('editAccount')
        .then(function(){
          return req.locals.user.save();
        })
        .then(function(){
          req.flash.success('You have successfully edited your account.');
          res.redirect('/account');
        })
        .otherwise(function(er){
          req.flash.danger(req.locals.user.errors);
          controller.index(req, res, next);
        });
    },

  };

  return controller;
}
