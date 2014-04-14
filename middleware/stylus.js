module.exports = function(limby, models) {
  var
    _         = require('underscore'),
    stylus    = require('stylus'),
    nib       = require('nib'),
    fs        = require('fs'),
    join      = require('path').join,
    loaddir   = require('loaddir');

  var loaded_paths = [];
  var config = limby.config.stylesheets || {};

  // We load every stylesheet into memory and serve them only if that url gets hit
  // options.src is all we care about for this version
  return function(options){

    var stylesheets = {};

    loaddir({

      path: options.src,
      fastWatch: config.fastWatch,

      callback: function(){
        var self = this;

        var s = stylus(this.fileContents)
          .set('paths', [options.src])
          .use(nib());
        var mixinPath = join(options.src, 'mixins');

        // we don't know the implications of changing a mixin so we touch every stylesheet
        if (this.baseName == 'mixins') {
          _.each(loaded_paths, function(lpath) {
            fs.utimes(lpath, new Date(), new Date());
          });
        } else {
          loaded_paths.push(this.path);
        }

        if ( fs.existsSync(mixinPath + '.styl') ) s = s.import(mixinPath);

        s.render(function(err, css){
          var url_path = join((options.baseURL || ''), '/stylesheets/', self.relativePath, self.baseName + '.css');
          // replace() -- windows fix
          stylesheets[url_path.replace(/\\/g, '/')] = css;
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
