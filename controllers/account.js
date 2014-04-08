var _ = require('underscore');

module.exports = function(limby, models) {
  var
    User = models.User;

  return {

    index: function(req, res, next){
      res.view('account/index')
    },

    post: function(req, res, next){
      // Other limbs could add attributes if they are accepting more
      var attributes = req.locals.attributes || {};
      
      attributes.first_name = attributes.first_name || _.escape(req.body.first_name);
      attributes.last_name = attributes.last_name || _.escape(req.body.last_name);

      req.locals.user.editAccount(attributes)
        .then(function(user){
          req.notification('You have successfully editted your account');
          res.redirect('/');
        })
        .otherwise(function(errors){
          req.error(errors);
          res.view('account', {body: req.body});
        });
    },

  };
}
