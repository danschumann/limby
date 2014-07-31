module.exports = function(limby, models) {
  var
    _         = require('underscore'),
    stylus    = require('stylus'),
    nib       = require('nib'),
    fs        = require('fs'),
    join      = require('path').join,
    loaddir   = require('loaddir');

  limby.stylesheets = limby.stylesheets || {};

  var loaded_paths = [];
  var config = limby.config.stylesheets || {};

  // We load every stylesheet into memory and serve them only if that url gets hit
  // options.src is all we care about for this version
  return function(options){

    var stylesheets = limby.stylesheets[options.limbName] = {};

    loaddir({

      path: options.src,
      fastWatch: config.fastWatch,

      callback: function(){
        var self = this;

        var s = stylus(this.fileContents)
          .set('paths', [options.src])
          .use(nib());

        // we don't know the implications of changing a mixin so we touch every stylesheet
        if (config.touch !== false && this.baseName == 'mixins') {
          _.each(loaded_paths, function(lpath) {
            fs.utimes(lpath, new Date(), new Date());
          });
        } else {
          loaded_paths.push(this.path);
        }

        var baseMixinPath = join(limby.paths.core, 'stylesheets/mixins');
        if ( fs.existsSync(baseMixinPath + '.styl') ) s = s.import(baseMixinPath);

        var mixinPath = join(options.src, 'mixins');
        if ( fs.existsSync(mixinPath + '.styl') ) s = s.import(mixinPath);

        // replace() -- windows fix
        self.urlPath = join((options.baseURL || ''), '/stylesheets/', self.relativePath, self.baseName + '.css').replace(/\\/g, '/');

        options.callback && options.callback.call(self, s, stylesheets);

        s.render(function(err, css){
          stylesheets[self.urlPath] = css;
          if (err) console.log('css error'.red, err);
        });

      }
    });

    return function(req, res, next){
      if (stylesheets[req.url]){
        res.setHeader('content-type', 'text/css');
        res.send(stylesheets[req.url]);
      } else
        next()
    }
  };
};
