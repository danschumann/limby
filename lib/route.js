var
  path  = require('path'),
  join  = path.join,
  when  = require('when'),
  sequence  = require('when/sequence'),
  fs    = require('final-fs'),
  debug = require('debug')('limby:route'),

  // express modules
  express        = require('express'),
  bodyParser     = require('body-parser'),
  multiparty     = require('connect-multiparty'),
  cookieParser   = require('cookie-parser'),
  clientSessions = require('client-sessions'),
  serveStatic    = require('serve-static'),

  // for views
  _s             = require('underscore.string'),
  _              = require('underscore');

// Middleware to set up `req` and `res`
// Include this before any of the other Limby methods
module.exports = {

  route: function() {

    debug('route');
    var limby = this;
    var app = limby.app;

    if (limby.config.preventDowngrade) {
      var helmet = require('helmet');

      var ONE_YEAR = 31536000000;
      app.use(helmet.hsts({
        maxAge: ONE_YEAR,
        includeSubdomains: true,
        force: true
      }));
    };

    app.use(require('../middleware/view')(app, limby));

    if (limby.config.middleware.bodyParser) {
      app.use(bodyParser.json(limby.config.middleware.bodyParser));
      app.use(bodyParser.urlencoded(_.extend({extended: true}, limby.config.middleware.bodyParser)));
      app.use(multiparty(limby.config.middleware.multiparty));
    };

    if (limby.config.middleware.cookieParser)
      app.use(cookieParser(limby.config.middleware.cookieParser));

    if (limby.config.middleware.clientSessions) {
      app.use(clientSessions(limby.config.middleware.clientSessions));
      app.use(limby.middleware.flash);
    };

    if (limby.config.revalidate !== false)
      app.use(limby.middleware.revalidate);

    if (limby.config.middleware.callback)
      limby.config.middleware.callback(limby, app);

    // Views
    if (limby.config.templates !== false) {
      app.set('views', limby.root);
      app.set('view engine', 'ect.html');
      // Viewing as html helps out syntax highlighting
      app.engine('ect.html', limby.render);
    };

    app.use('/limby_static', serveStatic(join(limby.paths.module, 'public'), {redirect: false}));
    
    debug('route2');

    // some middleware may define their own routes
    limby.unwrap(['middleware']);
    debug('route3'.blue);
    _.each(limby.limbs, function(branch, branchName) {
      debug('route limbs'.blue, branchName);
      _.each(branch.middleware, function(method, routeName) { 
        app.get(routeName, method);
      });
    });

    // All limby supplied routes
    if (limby.config.controllers !== false && limby.core.config.controllers !== false)
      require('../router')(limby);

    return when.all(_.map(limby.limbs, function(branch, branchName) {

      debug('extend branch', branchName);
      return limby.extend(branchName);

    })).then(function(){
      debug('extended branches');

      // configs
      var http, https;

      if (limby.config.server.http || limby.config.server.https) {
        // they specify either, so we can assume they are namespaced
        http = limby.config.server.http;
        https = limby.config.server.https;
      } else {
        // standalone
        http = limby.config.server;
      }

      //
      // Listen
      //
      var httpDeferred, httpsDeferred;

      // HTTP
      if (http && (http.port || http.host)) {
        httpDeferred = when.defer();
        var args = _.compact([http.port, http.host, function(){
          console.log('HTTP listening on port ', http.port);
          httpDeferred.resolve()
        }]);

        // limby.server for general use / backwards compatibility
        limby.http = limby.server = require('http').createServer(app);
        limby.http.listen.apply(limby.http, args);
      }

      // HTTPS
      if (https && (https.port || https.host)) {

        if (!https.certificate)
          throw new Error('You must specify a config.https.certificate if you use https');

        httpsDeferred = when.defer();
        var args = _.compact([https.port, https.host, function(){
          console.log('HTTPS listening on port ', https.port);
          httpsDeferred.resolve()
        }]);

        limby.https = require('https').createServer(https.certificate, app);
        limby.https.listen.apply(limby.https, args);

      }

      return when.all([httpDeferred, httpsDeferred]).then(function(){
        return limby;
      });

    });

  },

  // Loads a limby module ( a limb )
  extend: function(limbName) {

    debug('extend'.blue, limbName);

    var
      limby = this,
      app = limby.app,
      subApp,
      limb = limby.limbs[limbName],
      limbConfig = limb.config,
      limbPath, limbUrl;

    if (limbName == 'core') {
      limbPath = limby.paths.core;
      limbUrl = '';
    } else {
      limbPath = join(limby.paths.limbs, limbName);
      limbUrl = limbName;
    }

    subApp = express();

    debug('extend'.blue, limbName);
    // Various rendering and other app settings
    _.extend(subApp.settings, app.settings);
    _.extend(subApp.engines, app.engines);

    subApp.use(function(req, res, next) {
      req.locals = req.locals || {};
      next();
    });

    // Give the limb first choice of what to do
    if (limbConfig.beforeRoute) limbConfig.beforeRoute(limby, subApp);

    subApp.use(function(req, res, next) {
      req.locals.limb = req.locals.limb || limb;
      req.locals.limbName = req.locals.limbName || limbName;
      req.locals.limbPath = join(limby.paths._limbs, limbName);
      next();
    });

    _.each(['public', 'vendor'], function(staticKey) {
      if (limb[staticKey])
        subApp.use(serveStatic(join(limbPath, staticKey), {redirect: false}));
    });

    var promises = [];

    if (limbConfig.coffeescripts !== false) {
      var csConfig = limbConfig.coffeescripts || {};
      if (csConfig.path || limb.frontend)
        promises.push(function(){
          return limby.middleware.coffeescript(_.extend({
            app: subApp,
            limbName: limbName,
            path: join(limbPath, 'frontend'),
          }, csConfig))
        });
    }

    if (limbConfig.coffeecups !== false) {
      var cupsConfig = limbConfig.coffeecups || {};
      var cupsPath = cupsConfig.path || join(limbPath, 'frontend/templates');
      if (cupsConfig.path || fs.existsSync(cupsPath))
        promises.push(function(){
          return limby.middleware.coffeecups({
            path: cupsPath,
            key: cupsConfig.key,
            limbName: limbName,
            app: subApp,
            url: cupsConfig.url,
          })
        });
    }

    // Stylesheets
    if (limb.stylesheets)
      promises.push(function(){
        return limby.middleware.stylus(_.extend(limbConfig.stylus || {}, {
          app: app,
          baseURL: '/' + limbUrl,
          limbName: limbName,
          path: join(limbPath, 'stylesheets'),
        }))
      });

    return sequence(promises).then(function() {
      // Route Limb App
      debug('extend require app'.blue, limbName);
      if (_.isString(limb.app)) {
        var appFile = require(limb.app);
        debug('extend call app'.blue, limbName);
        limb.appFile = appFile(limby, subApp); // save reference to appFile output
      }
      limb.app = subApp;

      // We nest the entire sub app under its base route
      debug('extend app.use'.blue, limbName, limbUrl);
      app.use('/' + limbUrl, subApp);
    });

  },

  // if method -- for routers,  ex:
  //  limby.if(function(req) { return req.session.user_id }, controllers.home, controllers.base);
  if: function(constraint, thenMethod, elseMethod) {
    return function(req, res, next) {
      return when(constraint(req, res, next)).then(function(result) {
        if (result)
          thenMethod(req, res, next);
        else if ( elseMethod )
          elseMethod(req, res, next);
        else
          next();
      });
    };
  },

};
