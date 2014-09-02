module.exports = function(limby, models) {

  var
    _         = require('underscore'),
    stylus    = require('stylus'),
    debug     = require('debug')('limby:middleware:stylus'),
    when      = require('when'),
    nib       = require('nib'),
    fs        = require('fs'),
    path      = require('path'),
    join      = path.join,
    loaded_paths = [],
    loaddir   = require('loaddir');

  limby.stylesheets = limby.stylesheets || {};
  var config = limby.config.stylesheets || {};

  // We load every stylesheet into memory and serve them only if that url gets hit
  // options.path is all we care about for this version
  return function(options){

    debug('start'.blue, options.limbName);

    var stylesheets = limby.stylesheets[options.limbName] = {};

    return loaddir({

      path: options.path,
      fastWatch: config.fastWatch,
      manifest: limby.paths.manifests && join(limby.paths.manifests, options.path.replace(new RegExp(path.sep, 'g'), '_' + encodeURIComponent(path.sep) + '_')),

      compile: function() {
        var self = this;

        var s = stylus(this.fileData)
          .set('paths', [options.path])
          .use(nib());

        var baseMixinPath = join(limby.paths.core, 'stylesheets/mixins');
        if ( fs.existsSync(baseMixinPath + '.styl') ) s = s.import(baseMixinPath);

        var mixinPath = join(options.path, 'mixins');
        if ( fs.existsSync(mixinPath + '.styl') ) s = s.import(mixinPath);

        options.callback && options.callback.call(self, s, stylesheets);
        
        var deferred = when.defer();

        s.render(function(err, css){
          if (err) {
            console.log('css error'.red, err, err.stack);
            deferred.reject(err);
          } else {
            self.fileContents = css;
            deferred.resolve();
          }
        });
        return deferred.promise;

      },

      callback: function(){

        var self = this;

        // replace() -- windows fix
        self.urlPath = join((options.baseURL || ''), '/stylesheets/', self.relativePath, self.baseName + '.css').replace(/\\/g, '/');

        stylesheets[self.urlPath] = self.fileContents;

        // we don't know the implications of changing a mixin so we touch every stylesheet
        if (config.touch !== false && this.baseName == 'mixins') {
          _.each(loaded_paths, function(lpath) {
            fs.utimes(lpath, new Date(), new Date());
          });
        } else {
          loaded_paths.push(this.path);
        }

      }
    })
    .then(function(){

      options.app.use(function(req, res, next){
        if (stylesheets[req.url]){
          res.setHeader('content-type', 'text/css');
          res.send(stylesheets[req.url]);
        } else
          next()
      });
    });
  };
};
