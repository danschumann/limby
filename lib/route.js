var
  path  = require('path'),
  join  = path.join,
  when  = require('when'),
  fs    = require('final-fs'),
  http  = require('http'),
  debug = require('debug')('limby:route'),

  // express modules
  express        = require('express'),
  bodyParser     = require('body-parser'),
  multiparty     = require('connect-multiparty'),
  cookieParser   = require('cookie-parser'),
  clientSessions = require('client-sessions'),
  serveStatic    = require('serve-static'),
  favicon        = require('static-favicon'),

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

    if (limby.config.middleware.favicon)
      app.use(favicon(limby.config.middleware.favicon));

    if (limby.config.middleware.bodyParser) {
      app.use(bodyParser(limby.config.middleware.bodyParser));
      app.use(multiparty(limby.config.middleware.multiparty));
    }

    if (limby.config.middleware.cookieParser)
      app.use(cookieParser(limby.config.middleware.cookieParser));

    if (limby.config.middleware.clientSessions) {
      app.use(clientSessions(limby.config.middleware.clientSessions));
    }

    if (limby.config.revalidate !== false)
      app.use(limby.middleware.revalidate);

    if (limby.config.middleware.callback)
      limby.config.middleware.callback(limby, app);

    // Views
    app.set('views', limby.root);
    app.set('view engine', 'ect.html');
    // Viewing as html helps out syntax highlighting
    app.engine('ect.html', limby.render);

    app.use('/limby_static', serveStatic(join(__dirname, 'public'), {redirect: false}));

    //routers.api     (app);
    //routers.admin   (app);
    
    debug('route2');
    app.use(limby.middleware.flash);

    app.use(function limbyMW(req, res, next) {

      // While its unlikely, `req.locals` could already be set from other middleware.
      req.locals = req.locals || {};
      req.locals.limby = limby;

      req.upload = function(opts) {
        return limby.models.Files.upload(_.extend(opts, {req: req}));
      }

      res.limbyView = function(){
       delete req.locals.limbPath;
       return res.view.apply(this, arguments);
      };

      res.view = function(p, options, cb) {

        req.locals.limb = req.locals.limb || limby.core;
        req.locals.limbName = req.locals.limbName || 'core';

        if (_.isFunction(options)) {
          cb = options;
          option = {};
        };

        var defaults = _.extend(_.clone(limby.config.viewOptions), {
          req: req,
          limb: req.locals.limb,
          locals: req.locals,
        });

        options = _.extend(defaults, options);

        // Within a limb
        if (req.locals.limbPath) {

          var args = [
            join(req.locals.limbPath, 'views', p + '.ect.html'),
            options,
          ];
          if (cb) args.push(cb);
          var r =  limby.render.apply(limby, args);
          if (cb)
            return r;
          else
            res.send(r);

        } else {

          // limby.views contains full path with extension, such that
          // `limby.views['accounts/index'] == 'accounts/index.ect.html'`
          var view = limby.viewPath(p);
          if (!view) throw new Error('that view was not found');

          if (cb) {

            var html;
            try {
              html = limby.render(view, options, cb);
            } catch (er) {
              return cb(er, null);
            }
            return cb(null, html);

          } else
            return res.send(limby.render(view, options));
        };

      };

      next();
    });

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
    require('../router')(limby);

    _.each(limby.limbs, function(branch, branchName) {
      limby.extend(branchName);
    });

    //
    // Listen
    //
    var deferred = when.defer();
    // _.compact because we may or may not have a host specified
    var args = _.compact([limby.config.server.port, limby.config.server.host, function(){
      console.log('Limby server listening on port ', limby.config.server.port);
      deferred.resolve(limby)
    }]);

    //app.listen.apply(app, args);
    limby.server = http.createServer(app);

    if (args.length > 1) // we don't need to listen if we don't have a port or host
      limby.server.listen.apply(limby.server, args);
    else
      deferred.resolve(limby);

    return deferred.promise;

  },

  //
  // Loads a limby module ( a limb )
  //
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

    debug('extend coffeescripts'.blue, limbName);
    var csConfig = limbConfig.coffeescripts || {};
    if (csConfig.path || limb.frontend)
      subApp.use(limby.middleware.coffeescript({
        path: csConfig.path || join(limbPath, 'frontend'),
        fastWatch: csConfig.fastWatch,
        callback: csConfig.callback,
      }));

    debug('extend coffeecups'.blue, limbName);
    var cupsConfig = limbConfig.coffeecups || {};
    var cupsPath = cupsConfig.path || join(limbPath, 'frontend/templates');
    if (cupsConfig.path || fs.existsSync(cupsPath))
      limby.middleware.coffeecups({path: cupsPath, key: cupsConfig.key, app: subApp, url: cupsConfig.url});

    // Stylesheets
    debug('extend stylesheets'.blue, limbName);
    if (limb.stylesheets)
      app.use(limby.middleware.stylus({
        path: join(limbPath, 'stylesheets'),
        baseURL: '/' + limbUrl,
        callback: limbConfig.stylus && limbConfig.stylus.callback,
        limbName: limbName,
      }));

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

  viewPath: function(p) {
    p = join.apply(path, arguments);
    return this.views[join(p)] || this.views[join(p, 'index')];
  },

};
