var

  firstSeparator    = require('./regexes').firstSeparator,
  path              = require('path'),
  relativeWidgets   = require('./regexes').relativeWidgets,
  trimEXT           = require('./regexes').trimEXT,
  fs                = require('final-fs'),
  _                 = require('underscore'),
  j                 = require('path').join,
  loaddir           = require('loaddir')
  ;

module.exports = function(limby, branchName) {
  // These are all normal internal js files
  return loaddir({
    path: j(limby.paths.limbs, branchName),
    asObject: true,
    black_list: ['views', 'public', 'vendor', 'frontend', 'stylesheets', 'tmp', 'limbs'],
    callback: function() {
      return this.path;
    },
  })
  .then(function(branch) {

    // The branch is all folders except special cases
    limby.limbs[branchName] = branch;

    // These are views, so we output the filename
    var viewPath = j(limby.paths.limbs, branchName, 'views');

    return fs.exists(viewPath)
    .then(function(exists) {
      if (!exists) return;

      return loaddir({

        path: viewPath,
        asObject: true,
        callback: function(){
          this.baseName = this.baseName.replace(trimEXT,'');

          // We join for windows slashes
          //return j(limby.config.limby.limbs, branchName, 'views', this.relativePath, this.fileName);
          return j(this.path);
        },
      })
      .then(function(v) {
        branch.views = v;
      });

    });
  })
  .then(function() {

    var widgetPath = j(limby.paths.limbs, branchName, 'views', 'widgets');
    return fs.exists(widgetPath)
    .then(function(exists) {
      if (!exists) return;

      return loaddir({
        path: widgetPath,
        callback: function(){

          var
            relativePath = path.relative(limby.paths.base, this.path),
            widgetPath = j(relativePath.replace(relativeWidgets, '')).replace(trimEXT, '');

          relativePath = relativePath.replace(firstSeparator, '');
          limby.widgets[widgetPath] = limby.widgets[widgetPath] || [];

          limby.widgets[widgetPath].push(relativePath);
          limby.widgets[widgetPath] = _.unique(limby.widgets[widgetPath]);

        },
      });
    });
  });

};
