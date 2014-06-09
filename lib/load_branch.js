var

  firstSeparator    = require('./regexes').firstSeparator,
  path              = require('path'),
  coreDefaults      = require('./core_defaults'),
  lo                = require('lodash'),
  debug             = require('debug')('limby:loadBranch'),
  relativeWidgets   = require('./regexes').relativeWidgets,
  trimEXT           = require('./regexes').trimEXT,
  fs                = require('final-fs'),
  _                 = require('underscore'),
  j                 = require('path').join,
  loaddir           = require('loaddir')
  ;

module.exports = function(limby, branchName, isCore) {
  debug('loading branch', branchName);
  // These are all normal internal js files
  return loaddir({
    path: j(limby.paths.limbs, branchName),
    asObject: true,
    black_list: ['views/*', 'public/*', 'vendor/*', 'frontend/*', 'stylesheets/*', 'tmp/*', 'limbs'],
    pathsOnly: true,
  })
  .then(function(branch) {
    debug('loaddir', branchName);

    // The branch is all folders except special cases
    limby.limbs[branchName] = branch;

    // These are views, so we output the filename
    var viewPath = j(limby.paths.limbs, branchName, 'views');

    return fs.exists(viewPath)
    .then(function(exists) {

      if (!exists) return;

      debug('viewPath loading'.blue, branchName);
      return loaddir({

        path: viewPath,
        asObject: true,
        pathsOnly: true,
        callback: function(){
          this.baseName = this.baseName.replace(trimEXT,'');

          // We join for windows slashes
          //return j(limby.config.limby.limbs, branchName, 'views', this.relativePath, this.fileName);
          return j(this.path);
        },
      })
      .then(function(v) {
        debug('viewPath loaded'.green, branchName);
        branch.views = v;
      });

    });
  })
  .then(function() {

    var widgetPath = j(limby.paths.limbs, branchName, 'views', 'widgets');
    return fs.exists(widgetPath)
    .then(function(exists) {
      if (!exists) return;

      debug('widgets loading'.blue, branchName);
      return loaddir({
        path: widgetPath,
        pathsOnly: true,
        callback: function(){

          var
            relativePath = path.relative(limby.paths.base, this.path),
            widgetPath = j(relativePath.replace(relativeWidgets, '')).replace(trimEXT, '');

          relativePath = relativePath.replace(firstSeparator, '');
          limby.widgets[widgetPath] = limby.widgets[widgetPath] || [];

          limby.widgets[widgetPath].push(relativePath);
          limby.widgets[widgetPath] = _.unique(limby.widgets[widgetPath]);

        },
      })
      .then(function(){
        debug('widgets loaded'.green, branchName);
      });
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

};
