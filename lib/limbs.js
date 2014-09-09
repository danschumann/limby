var
  loaddir         = require('loaddir'),
  when            = require('when'),
  path            = require('path'),
  join            = path.join,
  firstSeparator  = require('./regexes').firstSeparator,
  coreDefaults    = require('./core_defaults'),
  lo              = require('lodash'),
  relativeWidgets = require('./regexes').relativeWidgets,
  trimEXT         = require('./regexes').trimEXT,
  fs              = require('final-fs'),
  _               = require('underscore'),
  debug           = require('debug')('limby:limbs');

// Each module is like a mini application
module.exports = {

  loadLimbs: function() {

    debug('loadLimbs');
    var limby = this;

    // They can have widgets within their modules that appear on limby default pages
    // like account, base/index and home/index
    limby.widgets = {};
    limby.limbs = {};

    return when().then(function() {
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
        // relative to limbs, not root
        baseRel = path.relative(limby.paths.limbs, limby.paths.core);
        branches.push(baseRel);
      }

      return when.map(branches, function(branchName){
        return limby.loadBranch(limby, branchName, branchName == baseRel)
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
  },

  // files are wrapped in a `module.exports = function(limby, models){...}` closure
  // This is so each individual file can know about all the limby settings
  // here is where we apply (limby, models) and are left with what that method returns
  unwrap: function(keys) {

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
            // fileOutput is {  MyModel: limby.Model..., MyCollection: bookshelf.Collection... }
            _.extend(container, unwrapped);
          } else
            container[key] = unwrapped;

        };

        if (branch[folder])
          unwrapSingle(branch[folder], folder, branch);

      });
    });

  },
  
  // lpath is something like   'myLimb.app'  or 'myLimb.someFolder.someFile'
  //
  // The purpose of thise function is drilling down into limby modules
  // once we get into a module, we require the key if it's still a string
  require: function(lPath) {

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

      var getArgNames = require('./get_argument_names');
      if (_.isFunction(output)) {
        var argNames = getArgNames(output);

        // If it's a limby closure function we unwrap it
        if (argNames[0] == 'limby')
          output = parent[localKey] = output(limby, argNames[1] == 'models' ? limb.models : null );
      }
    }

    return output;
  },
  loadBranch: function(limby, branchName, isCore) {
    debug('loading branch', branchName);
    // These are all normal internal js files

    var
      branch,
      _maniName = branchName.replace(/\./g, '__d__'),
      viewPath = join(limby.paths.limbs, branchName, 'views'),
      widgetPath = join(limby.paths.limbs, branchName, 'views', 'widgets');

    // Loads all paths of a limb -- except custom stuff
    return loaddir({
      path: join(limby.paths.limbs, branchName),
      asObject: true,
      black_list: ['views/*', 'public/*', 'vendor/*', 'frontend/*', 'stylesheets/*', 'tmp/*', 'limbs'],
      pathsOnly: true,
      manifest: limby.paths.manifests && join(limby.paths.manifests, 'loadBranch_' + _maniName),
    })
    .then(function(_branch) {

      branch = _branch;
      debug('loaddir', branchName);
      limby.limbs[branchName] = branch;

      return fs.exists(viewPath)
    }).then(function(exists) {

      if (!exists) return;

      debug('viewPath loading'.blue, branchName);
      return loaddir({

        path: viewPath,
        asObject: true,
        // These are views, so we output the filename
        pathsOnly: true,
        manifest: limby.paths.manifests && join(limby.paths.manifests, 'loadBranch_' + _maniName + '_views'),
        callback: function(){
          this.baseName = this.baseName.replace(trimEXT,'');

          // We join for windows slashes
          //return join(limby.config.limby.limbs, branchName, 'views', this.relativePath, this.fileName);
          return join(this.path);
        },
      })
    }).then(function(_views) {
      if (_views) {
        debug('views loaded'.green, branchName);
        branch.views = _views;
      }

      return fs.exists(widgetPath)
    })
    .then(function(exists) {
      if (!exists) return;

      debug('widgets loading'.blue, branchName);
      return loaddir({
        path: widgetPath,
        pathsOnly: true,
        manifest: limby.paths.manifests && join(limby.paths.manifests, 'loadBranch_' + _maniName + '_widgets'),
        callback: function(){

          var
            relativePath = path.relative(limby.root, this.path),
            widgetPath = join(relativePath.replace(relativeWidgets, '')).replace(trimEXT, '');

          relativePath = relativePath.replace(firstSeparator, '');
          limby.widgets[widgetPath] = limby.widgets[widgetPath] || [];

          limby.widgets[widgetPath].push(relativePath);
          limby.widgets[widgetPath] = _.unique(limby.widgets[widgetPath]);

        },
      })
      .then(function(){
        debug('widgets loaded'.green, branchName);
      });
    })
    .then(function() {

      return loaddir({
        path: join(limby.paths.limbs, branchName),
        asObject: true,
        white_list: ['queries'],
        manifest: limby.paths.manifests && join(limby.paths.manifests, 'loadBranch_' + _maniName + '_queries'),
      }).then(function(res) {
        limby.limbs[branchName].queries = res.queries;
      });

    })
    .then(function(){

      debug('limb config'.blue, branchName);
      var limb = limby.limbs[branchName];

      // This loads config for all limbs, but special stuff for core
      var limbConfig;
      if (limb.config) {

        limbConfig = require(limb.config);

        var defaults = isCore ? coreDefaults : {};

        // unwrap 
        if (_.isFunction(limbConfig))
          // Pass in default core settings for merging if its the core
          limbConfig = limbConfig(limby, defaults);

        limbConfig = limb.config = lo.merge(defaults, limbConfig);

      } else {
        if (isCore)
          limbConfig = limb.config = coreDefaults;
        else
          limb.config = limbConfig = {};
      }

      debug('loaded branch', branchName);
    });

  },

};
