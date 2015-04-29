var
  join        = require('path').join,
  fs          = require('final-fs'),
  debug       = require('debug')('limby:loadNative'),
  trimEXT     = require('./regexes').trimEXT,
  sequence    = require('when/sequence'),
  when        = require('when'),
  _           = require('underscore'),
  loaddir     = require('loaddir');

// When limby starts up it needs to load it's module into memory
module.exports = {

  // Main fct, calls all other functions in
  load: function() {
    debug('loadNative');

    var limby = this;

    // load these these methods one at a time
    return sequence(_.map([
      'models',
      'routing',
      'views',
      'queries',
    ], function(methodName, n) {
      var method = limby._loadMethods[methodName];
      return _.bind(method, limby);
    }))
  },

  _loadMethods: {

    models: function() {

      debug('loadModels');
      var limby = this;

      limby.models = {};

      _.extend(limby.models, require('../models/base')(limby));

      return loaddir({
        path: join(limby.paths.module, 'models'),
        black_list: ['base'],
        require: true,
        asObject: true,
      })
      .then(function(closures) {

        _.each(closures, function(wrapped, fileName){
          delete limby.models[fileName];
          // Pass limby to closure so models can access limby
          _.extend(limby.models, wrapped(limby, limby.models));
        });

      });

    },

    routing: function() {
      debug('loadMiddleware');
      var limby = this;

      return loaddir({
        path: join(limby.paths.module),
        white_list: ['middleware', 'controllers'],
        asObject: true,
        pathsOnly: true,
        manifest: limby.paths.manifests && join(limby.paths.manifests, 'loadControllersMiddleware'),
        callback: function() {
          // Unwrap closure
          this.fileContents = require(this.path)(limby, limby.models);
        },
      })
      .then(function(results) {
        limby.controllers = results.controllers;
        limby.middleware = results.middleware;
      });

    },

    views: function() {
      debug('loadView');
      var
        limby = this,
        coreViews = join(limby.paths.core, 'views');

      return loaddir({
        path: join(limby.paths.module, 'views'),
        pathsOnly: true,
        manifest: limby.paths.manifests && join(limby.paths.manifests, 'loadViews'),
        callback: function(){
          this.baseName = this.baseName.replace(trimEXT, '');
        },
      })
      .then(function(views) {
        limby.nativeViews = views;

      // Let core override base views
        return fs.exists(coreViews)
      }).then(function(exists) {
        if (exists)
          return loaddir({
            path: coreViews,
            pathsOnly: true,
            manifest: limby.paths.manifests && join(limby.paths.manifests, 'loadViews_core'),
            callback: function() {
              this.baseName = this.baseName.replace(trimEXT, '');
            },
          })
      }).then(function(views) {
        limby.views = views || {};
      });

    },

    queries: function() {
      debug('loadQueries');

      var limby = this;

      return loaddir({
        path: join( limby.paths.module, 'queries'),
        manifest: limby.paths.manifests && join(limby.paths.manifests, 'limby_queries.json'),
      }).then(function(queries){
        limby.queries = queries;
      });

    },

  },
};
