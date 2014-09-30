var
  router,
  loaddir = require('loaddir'),
  join    = require('path').join,
  when    = require('when'),
  _       = require('underscore');

module.exports = function(limby) {

  var
    app            = limby.app,
    controllers    = limby.controllers,
    middleware     = limby.middleware,
    user           = middleware.user,
    reset_password = middleware.reset_password,
    authentication = middleware.authentication;

  app.get('/',
    limby.if(function(req){ return !req.session.user_id }, controllers.base.welcome),
    user.load,
    user.loadPermissions,
    controllers.base.dashboard
  );

  var formConfig = limby.core.config.forms;

  app.get (formConfig.signup.action, authentication.non, controllers.signup.index);
  app.post(formConfig.signup.action, authentication.non, controllers.signup.post);

  app.get ('/login',  authentication.non, controllers.login.index);
  app.post('/login',  authentication.non, controllers.login.post);
  app.get ('/logout', authentication.user, controllers.logout);

  app.get ('/forgot_password', authentication.non, controllers.forgot_password.index);
  app.post('/forgot_password', authentication.non, controllers.forgot_password.post);

  app.get ('/reset_password', authentication.non, reset_password.token, controllers.reset_password.index);
  app.post('/reset_password', authentication.non, reset_password.token, controllers.reset_password.post);

  //
  // Logged in routes
  //
  var loggedInMW = [
    authentication.user,
    user.load, 
    user.loadPermissions,
  ];

  var accountTitle = function(req, res, next) {
    req.locals.limbTitle = req.locals.limbTitle || 'Account';
    next();
  };
  app.get ('/account', accountTitle, loggedInMW, controllers.account.index);
  app.post('/account', accountTitle, loggedInMW, controllers.account.post);

  app.get ('/password', accountTitle, loggedInMW, controllers.password.index);
  app.post('/password', accountTitle, loggedInMW, controllers.password.post);
  
  app.get ('/email', accountTitle, loggedInMW, controllers.email.index);
  app.post('/email', accountTitle, loggedInMW, controllers.email.post);

  //
  // Admin routes
  //
  app.all('/admin*?',
    function(req, res, next) { req.locals.limbTitle = req.locals.limbTitle || 'Admin'; next() },
    loggedInMW
  );

  app.get ('/admin/?', controllers.admin.index);
  app.post('/admin/users/:user_id',
    authentication.permission('admin/super'),
    controllers.admin.toggle);


  app.all ('/admin/permissions*?', authentication.permission('admin/permissions'))

  app.get ('/admin/permissions', controllers.permissions.index);

  app.param('permission_id', controllers.permissions.load);
  app.post('/admin/permissions/:permission_id', controllers.permissions.update);

  var pg = controllers.permission_groups;
  app.get  ('/admin/permissions/groups/create', pg.edit);
  app.post ('/admin/permissions/groups', pg.update);

  app.param('group_id', pg.load);
  app.get ('/admin/permissions/groups/:group_id', pg.show);
  app.post('/admin/permissions/groups/:group_id', pg.update);
  app.get ('/admin/permissions/groups/:group_id/edit', pg.edit);
  app.get ('/admin/permissions/groups/:group_id/destroy', pg.destroy);

  app.post('/admin/permissions/groups/:group_id/users/:user_id', controllers.permission_group_users.toggle);
  app.post('/admin/permissions/groups/:group_id/roles/:role_id', controllers.permission_group_roles.toggle);

  app.post('/admin/permissions/:role_id/users/:user_id', controllers.permission_user_roles.toggle);

  app.all ('/admin/tags/?*', authentication.permission('admin/tags'));

  app.get ('/admin/tags', limby.controllers.tags.index);
  app.get ('/admin/tags/create', limby.controllers.tags.edit);
  app.get ('/admin/tags/edit', limby.controllers.tags.edit);
  app.get ('/admin/tags/:tag_id', limby.controllers.tags.edit);
  app.get ('/admin/tags/:tag_id/delete', limby.controllers.tags.destroy);

  app.post('/admin/tags', limby.controllers.tags.update);
  app.post('/admin/tags/:tag_id', limby.controllers.tags.update);

};
