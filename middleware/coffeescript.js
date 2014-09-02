module.exports = function(limby, models) {
  // Compiling coffeescripts and serving on the frontend

  var
    coffeescript  = require('coffee-script'),
    path          = require('path'),
    join          = path.join,
    debug         = require('debug')('limby:middleware:coffeescript'),
    sepReg        = require('../lib/regexes').sepReg,
    loaddir       = require('loaddir');

  // We load every stylesheet into memory and serve them only if that url gets hit
  // options.path is all we care about for this version
  return function(options) {

    debug('extend coffeescripts'.blue, options.limbName);

    var javascripts = {};

    return loaddir({
      fastWatch: options.fastWatch,

      path: options.path,

      manifest: limby.paths.manifests && join(limby.paths.manifests, options.path.replace(new RegExp(path.sep, 'g'), '_' + encodeURIComponent(path.sep) + '_')),

      compile: function(){
        this.fileContents = coffeescript.compile(this.fileContents);
      },

      callback: function(){
        var url_path = '/javascripts/' + join(this.relativePath, this.baseName).replace(sepReg, '/') + '.js';
        options.callback && options.callback(this);
        javascripts[url_path] = this.fileContents;
      },
    }).then(function(){

      options.app.use(function(req, res, next){
        if (javascripts[req.url]){
          res.setHeader('content-type', 'text/javascript');
          res.end(javascripts[req.url]);
        } else
          next();
      });

    });
  };
};
