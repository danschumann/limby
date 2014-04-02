var
  router,
  loaddir = require('loaddir'),
  join    = require('path').join,
  when    = require('when'),
  pm      = require('print-messages'),
  _       = require('underscore');


module.exports = function(limby){

  var
    app             = limby.app,
    controllers     = limby.controllers,
    middleware      = limby.middleware,
    user            = middleware.user,
    reset_password  = middleware.reset_password,
    authentication  = middleware.authentication;

  app.get  ('/',
    limby.if(function(req){ return !req.session.user_id }, controllers.base.welcome),
    controllers.base.dashboard
  );

  app.get  ('/signup', authentication.non, controllers.signup.index);
  app.post ('/signup', authentication.non, controllers.signup.post);

  app.get  ('/login',  authentication.non, controllers.login.index);
  app.post ('/login',  authentication.non, controllers.login.post);
  app.get  ('/logout', authentication.user, controllers.logout);

  app.get  ('/forgot_password', authentication.non, controllers.forgot_password.index);
  app.post ('/forgot_password', authentication.non, controllers.forgot_password.post);

  app.get  ('/reset_password', authentication.non, reset_password.token, controllers.reset_password.index);
  app.post ('/reset_password', authentication.non, reset_password.token, controllers.reset_password.post);

  //
  // Logged in routes
  //
  app.get  ('/account', authentication.user, user.load, controllers.account.index);
  app.post ('/account', authentication.user, user.load, controllers.account.post);

  app.get  ('/password', authentication.user, user.load, controllers.password.index);
  app.post ('/password', authentication.user, user.load, controllers.password.post);
  
  app.get  ('/email', authentication.user, user.load, controllers.email.index);
  app.post ('/email', authentication.user, user.load, controllers.email.post);

  // Specify your own auth
  app.get  ('/tags/?*', authentication.user);

  app.get  ('/tags', limby.controllers.tags.index);
  app.get  ('/tags/edit', limby.controllers.tags.edit);
  app.get  ('/tags/:tag_id', limby.controllers.tags.edit);
  app.get  ('/tags/:tag_id/delete', limby.controllers.tags.destroy);

  app.post ('/tags', limby.controllers.tags.update);
  app.post ('/tags/:tag_id', limby.controllers.tags.update);

  //
  // Admin routes
  //

  app.all ('/admin/permissions*?', authentication.permission('admin/permissions'))

  app.get ('/admin/permissions', controllers.permissions.index);

  app.post ('/admin/permissions/groups', controllers.permission_groups.create);
  app.get  ('/admin/permissions/groups/new', controllers.permission_groups.editNew);
  app.get  ('/admin/permissions/groups/:id', controllers.permission_groups.show);
  app.post ('/admin/permissions/groups/:group_id/users/:user_id', controllers.permission_group_users.toggle);
  app.post ('/admin/permissions/groups/:group_id/roles/:role_id', controllers.permission_group_roles.toggle);
  app.post ('/admin/permissions/:role_id/users/:user_id', controllers.permission_user_roles.toggle);

};
