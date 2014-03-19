var _ = require('underscore');

module.exports = function(limby, models) {
  var
    User = models.User;

  return {

    index: function(req, res, next){
      res.view('account/index')
    },

    post: function(req, res, next){
      var checkboxes = ['notify_start_vote', 'notify_end_vote', 'notify_pickup'];

      var attributes = {
        first_name: _.escape(req.body.first_name),
        last_name: _.escape(req.body.last_name),
      };

      _.each(checkboxes, function(key){
        attributes[key] = (req.body[key] == 'on')
      });

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
