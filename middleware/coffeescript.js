module.exports = function(limby, models) {
  // Compiling coffeescripts and serving on the frontend

  var
    coffeescript  = require('coffee-script'),
    reactTools    = require('react-tools'),
    coffeeReact    = require('coffee-react-transform'),
    path          = require('path'),
    join          = path.join,
    debug         = require('debug')('limby:middleware:coffeescript'),
    sepReg        = require('../lib/regexes').sepReg,
    loaddir       = require('loaddir');

  // We load every stylesheet into memory and serve them only if that url gets hit
  // options.path is all we care about for this version
  return function(options) {

    debug('extend coffeescripts'.blue, options.limbName);

    return loaddir({
      fastWatch: options.fastWatch,

      asObject: false,

      path: options.path,

      white_list: options.white_list,
      black_list: options.black_list,

      manifest: limby.paths.manifests && join(limby.paths.manifests, options.path.replace(new RegExp(path.sep, 'g'), '_' + encodeURIComponent(path.sep) + '_')),

      compile: function(){

        if (!this._ext) return;

        if (this.fileName.match('.jsx.coffee')) {
          this.baseName = this.baseName.replace('.jsx', '');
          this.fileContents = coffeeReact('# @jsx React.DOM \n' + this.fileContents,
            _.extend({sourceMap: true, filename: null}, options.react)
          );

        } else if (this.fileName.match('.jsx'))
          this.fileContents = reactTools.transform('/** @jsx React.DOM */ \n' + this.fileContents,
            _.extend({sourceMap: true, filename: null}, options.react)
          );

        if (this.fileName.match('.coffee'))
          this.fileContents = coffeescript.compile(this.fileContents);

      },

      callback: function(){
        this.key = '/javascripts/' + join(this.relativePath, this.baseName).replace(sepReg, '/') + '.js';
        options.callback && options.callback.apply(this, arguments);
      },
    }).then(function(javascripts){

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
