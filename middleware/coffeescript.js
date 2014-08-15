module.exports = function(limby, models) {
  // Compiling coffeescripts and serving on the frontend

  var
    coffeescript  = require('coffee-script'),
    join = require('path').join,
    sepReg = require('../lib/regexes').sepReg,
    loaddir  = require('loaddir');

  // We load every stylesheet into memory and serve them only if that url gets hit
  // options.src is all we care about for this version
  return function(options) {

    var javascripts = {};

    loaddir({
      fastWatch: options.fastWatch,

      path: options.src,

      compile: function(){
        return coffeescript.compile(this.fileContents);
      },

      callback: function(){
        var url_path = '/javascripts/' + join(this.relativePath, this.baseName).replace(sepReg, '/') + '.js';
        options.callback && options.callback(this);
        javascripts[url_path] = this.fileContents;
      },
    });

    return function(req, res, next){
      if (javascripts[req.url]){
        res.setHeader('content-type', 'text/javascript');
        res.end(javascripts[req.url]);
      } else
        next();
    };
  };
};
