var

  sepReg      = require('./lib/regexes').sepReg,
  pm          = require('print-messages'),
  _           = require('underscore'),
  _s          = require('underscore.string'),
  lo          = require('lodash'),
  events      = require('events'),
  util        = require('util'),
  path        = require('path'),
  j           = path.join,
  http        = require('http'),
  express     = require('express'),
  fs          = require('final-fs'),
  when        = require('when'),
  sequence    = require('when/sequence'),
  debug       = require('debug')('limby:base'),

  bodyParser      = require('body-parser'),
  multiparty       = require('connect-multiparty'),
  cookieParser    = require('cookie-parser'),
  clientSessions  = require('client-sessions'),
  serveStatic     = require('serve-static'),
  favicon         = require('static-favicon'),

  breadcrumbs  = require('./lib/breadcrumbs'),
  loadBranch  = require('./lib/load_branch'),
  renderFlash = require('./lib/flash_renderer')
  ;
 
require('./lib/mysql_date_format');
require('./lib/bootstrap');

var Limby = function(unformattedConfig) {

  // We don't care if they call `Limby()` or `new Limby`
  if (!(this instanceof Limby)) return new Limby(unformattedConfig);

  events.EventEmitter.call(this);
  require('./lib/config-loader')(this, unformattedConfig);
  require('./lib/send_mail')(this);
  require('./lib/mask_passwords')(this);
  require('./lib/loaddir_config')(this);

  // for application wide things like views and models that are not native to limby
  this.local = {}

  this.app = express();

  this.renderFlash = renderFlash;

  return this;

};

// 
// extends limby.loadNative() and helper methods
_.extend(Limby.prototype, require('./lib/load_native'), events.EventEmitter.prototype)

// Each module is like a mini application
Limby.prototype.loadLimbs = function() {
  debug('loadLimbs');
  var limby = this;

  // They can have widgets within their modules that appear on limby default pages
  // like account, base/index and home/index
  limby.widgets = {};
  limby.limbs = {};

  return when()
  .then(function(){
    debug('loadLimbs:readdir')
    return fs.readdir(limby.paths.limbs);
  })
  .otherwise(function(er){ 
    // Limbs does not exist
    debug('Couldn\'t find limbs directory.. not used?'.yellow);
    return [];
  })
  .then(function(branches){

    // We find the path to the base application relative to limbs
    // so we can treat it like another limb
    var baseRel;

    if (limby.paths.core) {
      baseRel = path.relative(limby.paths.limbs, limby.paths.core);
      branches.push(baseRel);
    }

    return when.map(branches, function(branchName){
      return loadBranch(limby, branchName, branchName == baseRel)
    })
    .then(function() {
      debug('loadLimbs:unwrap');
      limby.unwrap();
      debug('loadLimbs:unwrapped');

      // Now that we loaded the core app, lets name it correctly
      // baseRel is probably '..'
      limby.core = limby.limbs.core = limby.limbs[baseRel];
      limby.controllers = lo.merge(limby.controllers, limby.core.controllers);
      if (baseRel !== 'core') // delete the weird '..' limb name
        delete limby.limbs[baseRel];

      return limby;
    });
  });
};

Limby.prototype.migrate = function() {
  return this.models.Migrations.migrate();
};

// This is for base level models like User and Migration
// Same format as other closures, see `Limby.prototype.unwrap` comment for more

// Middleware to set up `req` and `res`
// Include this before any of the other Limby methods
Limby.prototype.route = function() {

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
  app.set('views', limby.paths.base);
  app.set('view engine', 'ect.html');
  // Viewing as html helps out syntax highlighting
  app.engine('ect.html', limby._render);

  app.use('/limby_static', serveStatic(j(__dirname, 'public'), {redirect: false}));

  //routers.api     (app);
  //routers.admin   (app);
  
  debug('route2');
  app.use(limby.middleware.flash);
  app.use(function limbyMW(req, res, next) {

    // While its unlikely, `req.locals` could already be set from other middleware.
    req.locals = req.locals || {};
    req.locals.loaded = req.locals.loaded || {};

    req.limby = limby;

    // Internal limby stuff
    req._limby = {
      loaded: [],
      // for res.view
      relativeViewPath: '',
    };

    req.upload = function(opts) {
      return limby.models.Files.upload(_.extend(opts, {req: req}));
    }

    res.limby = {};

    res.limbyView = function(){
     delete req._limby.relativeViewPath;
     return res.view.apply(this, arguments);
    };

    res.view = function(path, options, cb) {

      if (_.isFunction(options)) {
        cb = options;
        option = {};
      };

      req._limby.key = req._limby.key || 'core';

      var defaults = _.extend(_.clone(limby.config.viewOptions), {
        baseURL: limby.config.baseURL,
        limby: limby,
        config: limby.config,
        renderFlash: renderFlash,
        breadcrumbs: breadcrumbs,
        req: req,
        headScripts: [],
        _: _,
        _s: _s,
        limb: limby.limbs[req._limby.key]
      });
      options = _.extend(defaults, options);

      // Within a limb
      if (req._limby.relativeViewPath) {

        var args = [
          j(req._limby.relativeViewPath, 'views', path),
          options,
        ];
        if (cb) args.push(cb);
        return res.render.apply(res, args);

      } else {

        // path is `accounts/index`, limby.views[path] is `accounts/index.ect.html`
        var view = limby.views[j(path)] || limby.views[j(path, 'index')];
        if (!view) throw new Error('that view was not found');

        if (cb) {

          var html;
          try {
            html = limby._render(view, options);
          } catch (er) {
            return cb(er, null);
          }
          return cb(null, html);

        } else
          return res.send(limby._render(view, options));
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

  require('./router')(limby);
  _.each(limby.limbs, function(branch, branchName) {
    limby.extend(branchName);
  });

  var deferred = when.defer();

  // _.compact because we may or may not have a host specified
  var args = _.compact([limby.config.server.port, limby.config.server.host, function(){
    pm.log('Limby server listening on port ', limby.config.server.port);
    deferred.resolve(limby)
  }]);

  //app.listen.apply(app, args);
  limby.server = http.createServer(app);
  if (args.length > 1) // we don't need to listen if we don't have a port or host
    limby.server.listen.apply(limby.server, args);
  else
    deferred.resolve(limby);
  return deferred.promise;

};

//
// Loads a limby module ( a limb )
//
Limby.prototype.extend = function(key) {
  debug('extend'.blue, key);

  var limby = this,
    app = limby.app,
    subApp,
    limb = limby.limbs[key],
    limbConfig = limb.config,
    limbPath, limbUrl;

  if (key == 'core') {
    limbPath = limby.paths.core;
    limbUrl = '';
  } else {
    limbPath = j(limby.paths.limbs, key)
    limbUrl = key;
  }

  subApp = express();


  debug('extend'.blue, key);
  _.extend(subApp.settings, app.settings);
  _.extend(subApp.engines, app.engines);

  _.each(['public', 'vendor'], function(staticKey) {
    if (limb[staticKey])
      app.use('/' + limbUrl, serveStatic(j(limbPath, staticKey), {redirect: false}));
  })

  debug('extend coffeescripts'.blue, key);
  var csConfig = limbConfig.coffeescripts || {};
  if (limb.frontend)
    subApp.use(limby.middleware.coffeescript({
      src: csConfig.src || j(limbPath, 'frontend'),
      fastWatch: csConfig.fastWatch,
    }));

  debug('extend coffeecups'.blue, key);
  var cupsConfig = limbConfig.coffeecups || {};
  var cupsPath = cupsConfig.path || j(limbPath, 'frontend/templates');
  if (cupsConfig.path || fs.existsSync(cupsPath))
    limby.middleware.coffeecups({path: cupsPath, key: cupsConfig.key, app: subApp, url: cupsConfig.url});

  // Stylesheets
  debug('extend stylesheets'.blue, key);
  if (limb.stylesheets)
    app.use(limby.middleware.stylus({
      src: j(limbPath, 'stylesheets'),
      baseURL: '/' + limbUrl,
      callback: limbConfig.stylus && limbConfig.stylus.callback,
      limbName: key,
    }));

  subApp.use(function(req, res, next) {
    // The relative path to the views are now within modules 
    req._limby.relativeViewPath = j(limby.paths._limbs, key);
    req._limby.key = key;
    next();
  });

  // Route Limb App
  debug('extend require app'.blue, key);
  if (_.isString(limb.app)) {
    limb.app = require(limb.app);
    debug('extend call app'.blue, key);
    limb.app(limby, subApp);
  }
  limb.app = subApp;

  // We nest the entire sub app under its base route
  debug('extend app.use'.blue, key, limbUrl);
  app.use('/' + limbUrl, subApp);

};

Limby.prototype.if = function(constraint, thenMethod, elseMethod) {
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
};

// files are wrapped in a `module.exports = function(limby, models){...}` closure
// This is so each individual file can know about all the limby settings
// here is where we apply (limby, models) and are left with what that method returns
Limby.prototype.unwrap = function(keys) {
  var limby = this;

  _.each(limby.limbs, function(branch, branchName) {

    _.each(keys || ['models', 'controllers', 'mailers'], function(folder){

      var unwrapSingle = function(val, key, container) {

        // recursion
        if (_.isObject(val)) {

          container[key] = {}

          _.each(val, function(v, k) {
            unwrapSingle(v, k, container[key])
          });
          return;

        } else {
          var path = val;
        }

        debug('unwrap', val, key);
        var closure = require(path);
        debug('unwrapped', val, key);
        var unwrapped = closure(limby, branch.models);

        if (folder == 'models' || folder == 'middleware') {
          delete container[key];
          // fileOutput is {  MyModel: bookshelf.Model..., MyCollection: bookshelf.Collection... }
          _.extend(container, unwrapped);
        } else
          container[key] = unwrapped;

      };

      if (branch[folder])
        unwrapSingle(branch[folder], folder, branch);

    });
  });

};

Limby.prototype.eachWidget = function(str, callback) {
  var limby = this;
  // Join to ensure slashes are correct
  _.each(limby.widgets[j(str)], callback);
};

Limby.prototype.layout = function(type) {
  type = type || '';
  return this.views[j('layouts', type)] || this.views[j('layouts', 'default')];
};

Limby.prototype.viewPath = function(path) {
  return this.views[j(path)] || this.views[j(path, 'index')];

};

Limby.prototype.renderWidgets = function(_path, options) {
  var limby = this;

  // Sorted widget list
  var widgets;
  var widgConfig = (options.limb && options.limb.config && options.limb.config.widgets) ||
    (limby.core.config && limby.core.config.widgets) ||
    {};

  // TODO: take limb names and scrape limb.views.widgets[...] instead of scraping premade widgets object

  // sorted widgets
  if (widgConfig[_path]) {
    widgets = [];
    _.each(widgConfig[_path], function(widgetName) {

      // massaging data -- we make this what prepends the widget path
      if (widgetName == 'core')
        widgetName = j('views', 'widgets');
      else
        widgetName = j(path.relative(limby.paths.core, limby.paths.limbs), widgetName);

      _.each(limby.widgets[_path], function(widgetPath){
        if (widgetPath.match(j(path.relative(limby.paths.base, limby.paths.core), widgetName)))
          widgets.push(widgetPath);
      })
    });
  }

  return _.map(widgets ||  limby.widgets[_path], function(widgetPath) {
    return limby._render(widgetPath, options);
  }).join('\n');

};

// lpath is something like   'myLimb.app'  or 'myLimb.someFolder.someFile'
//
// The purpose of thise function is drilling down into limby modules
// once we get into a module, we require the key if it's still a string
Limby.prototype.require = function(lPath) {

  var limby = this;

  // each step of the dive
  lPath = lPath.split('.');

  // for replacing the string on the containing object
  var parent; 
  var localKey;

  var limb;

  // we go recursively into the limbs for our file
  var output = limby.limbs;
  while (lPath.length) {

    // the previous output is the parent, it will need to be extended later
    parent = output;

    // heres where the output pointer goes deeper into recursion
    output = output[localKey = lPath.shift()];

    // we grab the limb as soon as we can for later
    if (!limb) limb = output; 
  }

  // If it's not been required yet, we do so now
  // and replace on the parent so we can keep using it
  if (_.isString(output)) {
    output = parent[localKey] = require(output);

    var getArgNames = require('./lib/get_argument_names');
    if (_.isFunction(output)) {
      var argNames = getArgNames(output);

      // If it's a limby closure function we unwrap it
      if (argNames[0] == 'limby')
        output = parent[localKey] = output(limby, argNames[1] == 'models' ? limb.models : null );
    }
  }

  return output;
}

Limby.prototype.action = function(options) {
  var limby = this;

  switch(options.type) {
    case 'index':
      return function(req, res, next){
        var col = options.collection.forge();

        // TODO: col.query(method) Query options
        col.fetch().then(function(results){
          res.view(options.view || 'actionable/index', {results: results});
        })
      };
      break;
  };

};

module.exports = Limby;
