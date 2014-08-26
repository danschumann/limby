var
  ECT         = require('ect'),
  debug       = require('debug')('limby:templates'),
  _           = require('underscore'),
  _s          = require('underscore.string'),
  path        = require('path'),
  nodefn      = require('when/node/function'),
  join        = require('path').join,
  Styliner    = require('styliner'),
  styliner    = new Styliner(),
  breadcrumbs = require('./breadcrumbs'),
  x;

//
// We provide a template handling interface
//

module.exports = {

  wrap: function(limby) {

    // We have one renderer
    limby.renderer = ECT({
      watch: true,
      // it's location is top most,
      // so limby views, core views and limb views can all be located within this folder
      root: limby.root
    });

    var defaults = _.extend(_.clone(limby.config.viewOptions), {
      baseURL: limby.config.baseURL,
      limby: limby,
      config: limby.config,
      renderFlash: limby.renderFlash,
      breadcrumbs: breadcrumbs,
      _: _,
      _s: _s,
    });

    // A mostly internal render method that gets extended for [individual limbs|limby|core]
    limby.render = function(p, options, cb) {

      debug('render', p);

      if (_.isFunction(options)) {
        cb = options;
        options = {};
      };

      options = _.extend(_.clone(defaults), options);
      options.headScripts = options.headScripts || [];

      if (options.withLimb) {

        p = join(
          path.relative(
            limby.root,
            options.withLimb == 'core' ? limby.paths.core : join(limby.paths.limbs, options.withLimb)
          ),
          'views',
          p
        ) + '.ect.html';
      }

      try {
        var html = limby.renderer.render(p, options);
      } catch(er) {
        console.log('render error'.red, er, er.stack);
      };

      if (options.styliner) {

        if (!cb) throw new Error(' you must supply a callback function if using styliner ');

        styliner.processHTML(html)
        .then(function(source) {
          cb(null, source);
        })
        // Styliner uses a different promise library that uses catch
        .catch(function(er) {
          console.log('styliner error'.red, er, er.stack, options);
          cb(er, null);
        });

      } else
        return html;

    };

    _.extend(limby, instanceMethods);

  },

};

var instanceMethods = {

  eachWidget: function(p, callback) {
    var limby = this;

    // Join to ensure slashes are correct
    p = join(p)

    _.each(limby.widgets[p], callback);
  },

  layout: function(type, recursion) {
    type = type || '';
    return this.views[join('layouts', type)] || this.views[join('layouts', 'default')] ||
      // try again with extension
      (!recursion && this.layout(type + '.ect.html', true));
  },

  renderWidgets: function(_path, options) {

    var limby = this;

    // Sorted widget list
    var widgets;
    var widgConfig = (options.limb && options.limb.config && options.limb.config.widgets) ||
      (limby.core.config && limby.core.config.widgets) ||
      {};

    // TODO: take limb names and scrape limb.views.widgets[...] instead of scraping premade widgets object

    // sorted widgets
    if (widgConfig[_path]) {
      widgets = [];
      _.each(widgConfig[_path], function(widgetName) {

        // massaging data -- we make this what prepends the widget path
        if (widgetName == 'core')
          widgetName = join('views', 'widgets');
        else
          widgetName = join(path.relative(limby.paths.core, limby.paths.limbs), widgetName);

        _.each(limby.widgets[_path], function(widgetPath){
          if (widgetPath.match(join(path.relative(limby.root, limby.paths.core), widgetName)))
            widgets.push(widgetPath);
        })
      });
    }

    return _.map(widgets ||  limby.widgets[_path], function(widgetPath) {
      return limby.render(widgetPath, options);
    }).join('\n');

  },


};
