module.exports = function(limby, models) {

  var
    loaded       = false,
    _            = require('underscore'),
    stylus       = require('stylus'),
    keys         = require('when/keys'),
    debug        = require('debug')('limby:middleware:stylus'),
    when         = require('when'),
    nib          = require('nib'),
    fs           = require('final-fs'),
    path         = require('path'),
    join         = path.join,
    loaddir      = require('loaddir');

  limby.stylesheets = limby.stylesheets || {};
  var config = limby.config.stylesheets || {};
  var baseMixinPath = join(limby.paths.core, 'stylesheets/mixins');
  if ( !fs.existsSync(baseMixinPath + '.styl')) baseMixinPath = null;

  // We load every stylesheet into memory and serve them only if that url gets hit
  // options.path is all we care about for this version
  return function(options) {

    debug('start'.blue, options.limbName);

    var stylesheets = limby.stylesheets[options.limbName] = {};

    var mixinPath   = join(options.path, 'mixins');

    var genURLPath = function (self) {
      // replace() -- windows fix
      return join((options.baseURL || ''), '/stylesheets/', self.relativePath, self.baseName + '.css')
        .replace(new RegExp(path.sep, 'g'), '/');
    };

    return fs.exists(mixinPath + '.styl').then(function(mixinExists) {
      if (!mixinExists)
        mixinPath = null;

      return loaddir({

        forceCompile: options.forceCompile,
        path: options.path,
        fastWatch: config.fastWatch,
        manifest: (options.manifest !== false) && limby.paths.manifests && join(limby.paths.manifests, options.path.replace(new RegExp(path.sep, 'g'), '_' + encodeURIComponent(path.sep) + '_')),

        compile: function() {
          var self = this;

          var s = stylus(this.fileData)
            .set('paths', _.isArray(options.part) ? options.path : [options.path])
            .use(nib());

          if (baseMixinPath) s = s.import(baseMixinPath);

          if (mixinPath) s = s.import(mixinPath);

          self.urlPath = genURLPath(self);

          return when().then(function(){
            if (options.callback)
              return options.callback.call(self, s, stylesheets);
          }).then(function(){
            
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
          })

        },

        callback: function(){

          var self = this;

          self.urlPath = self.urlPath || genURLPath(self);
          stylesheets[self.urlPath] = self.fileContents;

        }
      })
    }).then(function() {

      loaded = true;

      options.app.use(function(req, res, next) {
        if (stylesheets[req.url]) {
          res.setHeader('content-type', 'text/css');
          res.send(stylesheets[req.url]);
        } else next();
      });
    });

  };
};
