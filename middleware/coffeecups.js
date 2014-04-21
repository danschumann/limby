module.exports = function(limby, models) {

  // Frontend templates are compiled into 1 file
  return function(options) {

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

    loaddir({
      path: options.path,

      compile: function(){
        return coffeescript.compile(this.fileContents);
      },

      callback: function(){

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
        cache[this.path] = template_str;

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

    });

    options.url = options.url ||'/__templates.js';

    // We can return mw right away since we want it loaded early
    options.app.use( function(req, res, next) {
      if (req.url !== options.url)
        return next();

      res.setHeader('content-type', 'text/javascript');
      res.send(output);
    });
  };
}
