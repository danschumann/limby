module.exports = function(limby, models) {

  require('../public/javascripts/object-assign.polyfill');

  var
    coffeescript  = require('coffee-script'),
    React         = require('react'),
    reactTools    = require('react-tools'),
    coffeeReact   = require('coffee-react-transform'),
    path          = require('path'),
    join          = path.join,
    debug         = require('debug')('limby:middleware:react'),
    sepReg        = require('../lib/regexes').sepReg,
    loaddir       = require('loaddir');

  return function(options) {

    debug('reactMW'.blue, options.path);

    return loaddir(_.extend({
      fastWatch: options.fastWatch,

      asObject: false,

      path: options.path,

      white_list: options.white_list,
      black_list: options.black_list,

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
        this.key = join(this.relativePath, this.baseName).replace(sepReg, '/');
        options.callback && options.callback.apply(this, arguments);
      },
    }, options.loaddir)).then(function(reactives){

      options.app.use(function(req, res, next){

        // We define a function similar to a res.render
        if (!res.react){
          res.react = function(ReactClass, opts){
            var rHTML = React.renderToStaticMarkup(
              ReactClass(_.extend({
                isServer: true,
                limby: limby,
                user: req.locals.user,
              }, opts))
            );

            res.send('<!DOCTYPE html>' + rHTML);
          }
        };

        if (!req.url) return next();

        var reactURL = req.url.replace(options.baseRegex || /^\/react\//, '').replace(/\.js$/, '')

        // Certain routes are backend only
        if (req.url.match(/^\/server/)) return next();

        // Serve javascript to frontend
        if (reactives[reactURL]){
          res.setHeader('content-type', 'text/javascript');
          res.end(reactives[reactURL]);
        } else
          next();
      });

      return reactives;

    });

  };

};
