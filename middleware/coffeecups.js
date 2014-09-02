var debug = require('debug')('limby:middleware:coffeecups');

module.exports = function(limby, models) {

  // Frontend templates are compiled into 1 file
  return function(options) {

    debug('extend coffeecups'.blue, options.limbName);

    options.key = options.key || 'coffeecups';

    var
      cache = {},
      breakRegex = /\n/g,
      output = '',
      joinTemplates, repeat,
      sep = require('path').sep,
      join = require('path').join,
      coffeescript = require('coffee-script'),
      loaddir = require('loaddir'),
      _       = require('underscore');

    return loaddir({
      path: options.path,

      manifest: limby.paths.manifests && join(limby.paths.manifests, 'coffeecups_' + options.key),

      compile: function(){
        var self = this;
        try{
          self.fileContents = coffeescript.compile(this.fileData);
        } catch (er) {
          debug('Error compiling', er, er.stack);
        };

        var
          dirStructure = '',
          template_str = '';

        _.each( this.relativePath.split(sep), function(dir, n){

          if ( _.isEmpty(dir) ) return;

          // We ensure the structure exists
          // window.template[topDir][nextDir] = window.template[topDir][nextDir] || {};
          dirStructure += '["' + dir + '"]';
          template_str += 'window.' + options.key + dirStructure + ' = window.' + options.key + dirStructure + ' || {};\n';

        });

        template_str += 'window.' + options.key + dirStructure + '["' + this.baseName + '"] = coffeecup.compile(function(){';
        template_str += '\n\n  return ' + this.fileContents.replace(breakRegex, '\n  ') + '\n});\n\n\n';
        this.fileContents = template_str;
      },

      callback: function(){

        cache[this.path] = this.fileContents;
        if (repeat) joinTemplates();
      },

    })
    .then(function(){

      repeat = true;
      joinTemplates = function(){
        _.defer(function(){
          output = 'window.' + options.key + ' = {};\n' + _(cache).values().join('');
        });
      };

      joinTemplates();

      options.url = options.url ||'/__templates.js';

      // We can return mw right away since we want it loaded early
      options.app.use( function(req, res, next) {
        if (req.url !== options.url)
          return next();

        res.setHeader('content-type', 'text/javascript');
        res.send(output);
      });
    });
  };
}
