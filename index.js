var

  sepReg = require('./lib/regexes').sepReg,
  trimEXT = require('./lib/regexes').trimEXT,

  pm          = require('print-messages'),
  _           = require('underscore'),
  path        = require('path'),
  j           = path.join,
  express     = require('express'),
  fs          = require('final-fs'),
  when        = require('when'),
  sequence    = require('when/sequence'),
  ECT         = require('ect'),
  loadBranch  = require('./lib/load_branch'),
  //loaddir     = function(options){ options.debug=true; return require('loaddir')(options); }
  loaddir     = require('loaddir'),
  getArgNames = require('./lib/get_argument_names')
  ;
 
require('./lib/mysql_date_format');
require('./lib/bootstrap');

var Limby = function(unformattedConfig) {

  // We don't care if they call `Limby()` or `new Limby`
  if (!(this instanceof Limby)) return new Limby(unformattedConfig);

  require('./lib/config-loader')(this, unformattedConfig);
  require('./lib/send_mail')(this);

  // for application wide things like views and models that are not native to limby
  this.local = {}

  this.app = express();

  return this;

};

Limby.prototype.loadNative = function() {
  return when.map([
    // Base limby stuff -- mostly handles user management
    this.loadModels(),
    this.loadMiddleware(),
    this.loadControllers(),
    this.loadViews(),
    this.loadQueries()
  ])
};

Limby.prototype.loadQueries = function() {

  var limby = this;

  return loaddir({
    path: j( __dirname, 'queries'),
  }).then(function(queries){
    limby.queries = queries;
  });

};

// Each module is like a mini application
Limby.prototype.loadLimbs = function() {
  var limby = this;

  // They can have widgets within their modules that appear on limby default pages
  // like account, base/index and home/index
  limby.widgets = {};
  limby.limbs = {};

  return when(fs.readdir(limby.paths.limbs))
  .then(function(branches){

    // We find the path to the base application relative to limbs
    // so we can treat it like another limb
    var baseRel;

    if (limby.paths.core)
      branches.push(baseRel = path.relative(limby.paths.limbs, limby.paths.core));

    return when.map(branches, function(branchName){
      return loadBranch(limby, branchName)
    })
    .then(function() {
      limby.unwrap();

      // Now that we loaded the core app, lets name it correctly
      // baseRel is probably '..'
      limby.core = limby.limbs.core = limby.limbs[baseRel];
      delete limby.limbs[baseRel];

      return limby;
    });
  });
};

Limby.prototype.loadControllers = function() {
  var limby = this;

  return loaddir({
    path: j(__dirname, 'controllers'),
    asObject: true,
    callback: function(){
      return require(this.path)(limby, limby.models);
    },
  })
  .then(function(controllers) {
    limby.controllers = controllers;
  });
};

// Top level middleware
Limby.prototype.loadMiddleware = function() {
  var limby = this;

  return loaddir({
    path: j(__dirname, 'middleware'),
    asObject: true,
    callback: function(){
      return require(this.path)(limby, limby.models);
    },
  })
  .then(function(middleware) {
    limby.middleware = middleware;
  });
};

Limby.prototype.loadViews = function() {
  var limby = this;

  // We have one renderer
  // it's location is top most,
  // so all limby, local, and limb views can be located within this folder
  limby._renderer = ECT({watch: true, root: limby.paths.base});
  limby._render = _.bind(limby._renderer.render, limby._renderer);

  var customViews = {}

  // Limby default views -- can be overwritten
  var viewPath = j(__dirname, 'views');
  return loaddir({
    path: viewPath,
    callback: function(){
      this.baseName = this.baseName.replace(trimEXT, '');
      return j(this.path);
    },
  })
  .then(function(views) {
    limby.views = views;

    // Make a copy to override and reference the original
    limby._views = _.extend({}, views);

    if ( limby.paths.views )
      return loaddir({
        path: limby.paths.views,
        callback: function() {
          var key = j(this.relativePath, this.baseName.replace(trimEXT, ''));
          customViews[key] = limby.views[key] = j(this.path);
        },
      });

  })
  .then(function(){

    // Ensure layouts -- fill in default if not present
    _.each([ 'account', 'home', ], function(name){
      limby.views[j('layouts', name)] = limby.views[j('layouts', name)] || limby.views[j('layouts', 'default')];
    });

  });


};

Limby.prototype.migrate = function() {
  return this.models.Migrations.migrate();
};

// This is for base level models like User and Migration
// Same format as other closures, see `Limby.prototype.unwrap` comment for more
Limby.prototype.loadModels = function() {
  var limby = this;

  return loaddir({
    path: j(__dirname, 'models'),
    require: true,
    asObject: true,
  })
  .then(function(closures) {
    limby.models = {};
    _.each(closures, function(wrapped, fileName){
      delete limby.models[fileName];
      // Pass limby to closure so models can access limby
      _.extend(limby.models, wrapped(limby, limby.models));
    });

    // limby.models now looks like {
    //    MyModel: bookshelf.Model.extend(...)
    //    MyCollection: bookshelf.Collection.extend(...)
    // }
  });

};

// Middleware to set up `req` and `res`
// Include this before any of the other Limby methods
Limby.prototype.route = function() {

  var limby = this;
  var app = limby.app;

  // Views
  app.set('views', limby.paths.base);
  app.set('view engine', 'ect.html');
  // Viewing as html helps out syntax highlighting
  app.engine('ect.html', limby._render);

  app.use('/limby_static', express.static(j(__dirname, 'public')));

  //routers.api     (app);
  //routers.admin   (app);
  
  // Pass in an object that is available on the view `this` (`@`) object
  limby.config.viewOptions = limby.config.viewOptions || {};


  app.use(limby.middleware.flash);
  app.use(function(req, res, next) {

    // While its unlikely, `req.locals` could already be set from other middleware.
    req.locals = req.locals || {};
    req.locals.loaded = req.locals.loaded || {};

    // Loaded keys goes here
    req[limby.key] = req[limby.key] || {};

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

    res.view = function(path, options) {

      var defaults = _.extend(_.clone(limby.config.viewOptions), {
        limby: limby,
        config: limby.config,
        req: req,
        _: _,
      });
      options = _.extend(defaults, options);

      // Within a limb
      if (req._limby.relativeViewPath)
        res.render( j(req._limby.relativeViewPath, 'views', path), options);
      else {

        // path is `accounts/index`, limby.views[path] is `accounts/index.ect.html`
        var view = limby.views[j(path)] || limby.views[j(path, 'index')];
        if (!view) throw new Error('that view was not found');
        return res.send(limby._render(view, options));
      }

    };

    next();
  });

  // some middleware may define their own routes
  limby.unwrap(['middleware']);

  _.each(limby.limbs, function(branch, branchName) {
    _.each(branch.middleware, function(method, routeName) { 
      app.get(routeName, method);
    });
  });

  require('./router')(limby);
  _.each(limby.limbs, function(branch, branchName) {
    limby.extend(branchName);
  });

  // _.compact because we may or may not have a host specified
  var args = _.compact([limby.config.server.port, limby.config.server.host, function(){
    pm.log('Limby server listening on port ', limby.config.server.port);
  }]);

  app.listen.apply(app, args);

};

//
// Loads a limby module ( a limb )
//
Limby.prototype.extend = function(key) {
  var limby = this;
  var app = limby.app;

  subApp = express();

  subApp.set('limby', limby);

  _.extend(subApp.settings, app.settings);
  _.extend(subApp.engines, app.engines);

  var staticPath = j(limby.paths.limbs, key, 'public');
  if (fs.existsSync(staticPath)) subApp.use(express.static(staticPath));

  var vendorPath = j(limby.paths.limbs, key, 'vendor');
  if (fs.existsSync(vendorPath)) subApp.use(express.static(vendorPath));

  var coffeePath = j(limby.paths.limbs, key, 'frontend');
  if (fs.existsSync(coffeePath))
    subApp.use(limby.middleware.coffeescript({src: coffeePath}));

  var cupsPath = j(limby.paths.limbs, key, 'views/coffeecups');
  if (fs.existsSync(cupsPath))
    limby.middleware.coffeecups({path: cupsPath, app: subApp});

  // Stylesheets
  var stylesheetsPath = j(limby.paths.limbs, key, 'stylesheets');
  if (fs.existsSync(stylesheetsPath))
    app.use(limby.middleware.stylus({ src: stylesheetsPath, baseURL: '/' + key }));

  subApp.use(function(req, res, next) {
    // The relative path to the views are now within modules 
    req._limby.relativeViewPath = j(limby.paths._limbs, key);
    req._limby.key = key;
    next();
  });

  // Route Limb App
  if (_.isString(limby.limbs[key].app))
    require(limby.limbs[key].app)(limby, subApp);

  // We nest the entire sub app under its base route
  app.use('/' + key, subApp);

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
      var files = branch[folder];

      // models are for ease of doing hasManys,etc
      _.each(files, function(path, key) {

        var closure = require(path);
        var unwrapped = closure(limby, branch.models);

        if (folder == 'models' || folder == 'middleware') {
          delete files[key];
          // fileOutput is {  MyModel: bookshelf.Model..., MyCollection: bookshelf.Collection... }
          _.extend(files, unwrapped);
        } else
          files[key] = unwrapped;
      });
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

Limby.prototype.renderWidgets = function(path, options) {
  var limby = this;

  return _.map(limby.widgets[path], function(widgetPath) {
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

    if (_.isFunction(output)) {
      var argNames = getArgNames(output);

      // If it's a limby closure function we unwrap it
      if (argNames[0] == 'limby')
        output = output(limby, argNames[1] == 'models' ? limb.models : null );
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
