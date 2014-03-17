module.exports = function(limby, models) {
  var
    stylus_middleware,
    _         = require('underscore'),
    stylus    = require('stylus'),
    nib       = require('nib'),
    fs        = require('fs'),
    join      = require('path').join,
    loaddir   = require('loaddir');

  // We load every stylesheet into memory and serve them only if that url gets hit
  // options.src is all we care about for this version
  stylus_middleware = function(options){

    var stylesheets = {};

    loaddir({
      debug: true,

      path: options.src,

      callback: function(){
        var self = this;

        var s = stylus(this.fileContents).use(nib());
        var mixinPath = join(options.src, 'mixins');
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

  return stylus_middleware;
};
