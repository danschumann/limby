var
  pm  = require('print-messages');
  _   = require('underscore');

require('./lib/bootstrap');

var Limby = function(configPath) {

  // We don't care if they call `Limby()` or `new Limby`
  if (!(this instanceof Limby)) return new Limby(configPath);

  if (!configPath) throw new Error('Must pass configPath to Limby, `new Limby(configPath)`');
  var config = this.config = require('./lib/config-loader')(configPath);

  // Base limby stuff -- mostly handles user management
  this.loadModels();
  this.loadMiddleware();
  this.loadControllers();

  this.app = express();

  // The rest of the application is built in separate limbs
  // each limb is it's own separate application that gets put on a route
  this.loadLimbs();
  return this;

};

var
  join        = require('path').join,
  express     = require('express'),
  fs          = require('final-fs'),
  when        = require('when'),
  sequence    = require('when/sequence'),
  loaddir     = require('loaddir');

Limby.prototype.loadLimbs = function() {
  var limby = this;

  if (!this.config.limbs)
    throw new Error('setup a config.limbs path for your Limby modules');

  // We remember the string for building paths later
  this._limbs = this.config.limbs;

  // Each module is like a mini application with `public`, `views`, `stylesheets`
  // that should not be required, but everything else should ( like `controllers`, `app` )
  var
    unwatched = new RegExp(limby._limbs + "/[^/]*/(public|stylesheets)/.*"),
    viewFolder = new RegExp(limby._limbs + "/([^/]*)/views/(.*)"),

    // widgets are used outside of their modules.
    // see views/home/index for an example
    widgetFolder = new RegExp(limby._limbs + "/[^/]*/views/widgets/(.*)"),

    trimECT = /\.ect$/;

  // They can have widgets within their modules that appear on limby default pages
  // like account, base/index and home/index
  limby.widgets = {};

  this.limbs = loaddir({
    path: limby._limbs,
    as_object: true,
    callback: function() {

      var viewMatch = this.path.match(viewFolder);

      if( this.path.match(unwatched) ) {
        return false;

      } else if ( viewMatch ) {
        // exclude from requiring it

        // We store widgets differently to make them easier to include
        // in a template, we call _.each(limby.widgets['home/index'], ...)
        var widgetMatch = this.path.match(widgetFolder);
        if ( widgetMatch ) {

          var widgetPath = widgetMatch[1];

          limbName = viewMatch[1];
          var ll = limby._limbs.replace(limby.app.get('views'), '') + '/' + limbName + '/views/widgets/' + widgetPath
          limby.widgets[widgetPath] = limby.widgets[widgetPath] || [];
          limby.widgets[widgetPath].push(
            // We get the the limbs directory relative to the top views directory
            // since this string will be called as a template
            limby._limbs.replace(limby.app.get('views'), '') +
            '/' + limbName + '/views/widgets/' + widgetPath
          );
          // Unique because this callback is ran again when the file is editted
          limby.widgets[widgetPath] = _.unique(limby.widgets[widgetPath]);
        }

        this.baseName = this.baseName.replace(trimECT, '');
        // We need to know the full path of this view for including it in other views
        return limby._limbs + '/' + viewMatch[1] + '/views/' + viewMatch[2];

      } else {
        // We only include files outside of the view folder
        return require(this.path);
      }

    },
  });

  this.unwrap();
};

Limby.prototype.loadControllers = function() {
  var limby = this;

  this.controllers = loaddir({
    path: join(__dirname, 'controllers'),
    as_object: true,
    callback: function(){
      return require(this.path)(limby, limby.models);
    },
  });
};

// Top level middleware
Limby.prototype.loadMiddleware = function() {
  var limby = this;

  this.middleware = loaddir({
    path: join(__dirname, 'middleware'),
    as_object: true,
    callback: function(){
      return require(this.path)(limby, limby.models);
    },
  });
};

Limby.prototype.migrate = function() {
  return this.models.Migrations.migrate();
};

// This is for base level models like User and Migration
// Same format as other closures, see `Limby.prototype.unwrap` comment for more
Limby.prototype.loadModels = function() {
  var limby = this;

  var closures = loaddir({
    path: join(__dirname, 'models'),
    require: true,
    as_object: true,
  });

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

};

// Middleware to set up `req` and `res`
// Include this before any of the other Limby methods
Limby.prototype.route = function() {
  var limby = this;
  var app = limby.app;

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

    res.view = function(path, options) {
      var defaults = _.extend(_.clone(limby.config.viewOptions), {
        limby: limby,
        config: limby.config,
        req: req,
        _: _,
      });

      // We can keep the main ect view engine top, so that we can use the main views like 
      // layout, navbar, etc, and here is where we can specify our module's directory
      res.render(req._limby.relativeViewPath + 'views/' + path, _.extend(defaults, options));

    };

    next();
  });

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

Limby.prototype.extend = function(key) {
  var limby = this;
  var app = limby.app;

  subApp = express();

  subApp.set('limby', limby);

  _.extend(subApp.settings, app.settings);
  _.extend(subApp.engines, app.engines);

  var staticPath = limby._limbs + '/' + key + '/public';
  if (fs.existsSync(staticPath))
    subApp.use(express.static(staticPath));

  // Stylesheets
  var stylesheetsPath = join(limby._limbs, key, '/stylesheets');
  if (fs.existsSync(stylesheetsPath))
    app.use(limby.middleware.stylus({ src: stylesheetsPath, baseURL: '/group_lunches' }));

  subApp.use(function(req, res, next) {
    // The relative path to the views are now within modules 
    req._limby.relativeViewPath = limby._limbs + '/' + key + '/';
    req._limby.key = key;
    next();
  });

  // Here is where the asset loads all of its routes
  if (this.limbs[key].app)
    this.limbs[key].app(this, subApp);

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
Limby.prototype.unwrap = function() {
  var limby = this;

  _.each(limby.limbs, function(branch, branchName) {

    _.each(['models', 'middleware', 'controllers'], function(folder){
      var files = branch[folder];

      // models are for ease of doing hasManys,etc
      _.each(files, function(closure, key) {

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

module.exports = Limby;
