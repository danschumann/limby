var
  join        = require('path').join,
  debug       = require('debug')('limby:loadNative'),
  trimEXT     = require('./regexes').trimEXT,
  when        = require('when'),
  _           = require('underscore'),
  loaddir     = require('loaddir'),
  x;

// When limby starts up it needs to load it's module into memory
module.exports = {

  // Main fct, calls all other functions in
  load: function() {
    debug('loadNative');

    var limby = this;

    // models are needed by other stuff like controllers
    return limby.loadModels().then(function() {
      return when.all([
        limby.loadControllersMiddleware(),
        limby.loadViews(),
        limby.loadQueries(),
      ]);
    });
  },

  loadModels: function() {
    debug('loadModels');
    var limby = this;

    return loaddir({
      path: join(limby.paths.module, 'models'),
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

    });

  },

  loadControllersMiddleware: function() {
    debug('loadMiddleware');
    var limby = this;

    return loaddir({
      path: join(limby.paths.module),
      white_list: ['middleware', 'controllers'],
      asObject: true,
      pathsOnly: true,
      callback: function() {
        // Unwrap closure
        return require(this.path)(limby, limby.models);
      },
    })
    .then(function(results) {
      _.extend(limby, results); // limby.controllers = {...} ; limby.middleware = {...}
    });

  },

  loadViews: function() {
    debug('loadView');
    var limby = this;

    var customViews = {}

    // Limby default views -- can be overwritten
    var viewPath = join(limby.paths.module, 'views');
    return loaddir({
      path: viewPath,
      pathsOnly: true,
      callback: function(){
        this.baseName = this.baseName.replace(trimEXT, '');
        return join(this.path);
      },
    })
    .then(function(views) {
      limby.views = views;

      // Make a copy to override and reference the original
      limby._views = _.extend({}, views);

      if ( limby.paths.views )
        return loaddir({
          path: limby.paths.views,
          pathsOnly: true,
          callback: function() {
            var key = join(this.relativePath, this.baseName.replace(trimEXT, ''));
            customViews[key] = limby.views[key] = join(this.path);
          },
        });

    })
    .then(function() {

      // Ensure layouts -- fill in default if not present
      _.each([ 'account', 'home', ], function(name){
        limby.views[join('layouts', name)] = limby.views[join('layouts', name)] || limby.views[join('layouts', 'default')];
      });

    });


  },

  loadQueries: function() {
    debug('loadQueries');

    var limby = this;

    return loaddir({
      path: join( limby.paths.module, 'queries'),
      manifest: limby.paths.manifests && join(limby.paths.manifests, 'limby_queries.json'),
    }).then(function(queries){
      limby.queries = queries;
    });

  },

};