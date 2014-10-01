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
      
      if (attributes.first_name == null)
        attributes.first_name = _.escape(req.body.first_name);
      if (attributes.last_name == null)
        attributes.last_name = _.escape(req.body.last_name);

      var user = req.locals.user.clone();

      user
        .set(attributes)
        .validateBatch('editAccount')
        .then(function(){
          return user.save();
        })
        .then(function(){
          if (req.xhr)
            res.json({type: 'success', message: 'You have successfully updated your account', flash: true});
          else {
            req.flash.success('You have successfully edited your account.');
            res.redirect(limby.baseURL + '/account?success=1');
          }
        })
        .otherwise(function(er){
          if ( !user.errored() ) console.log('uncaught error'.red, er, er.stack);
          if (req.xhr)
            res.json({type: 'danger', message: user.errored() ? user.errors : 'Unknown error', flash: true});
          else {
            req.flash.danger(user.errored() ? user.errors : 'Unknown error');
            controller.index(req, res, next);
          }
        });
    },

  };

  return controller;
}
