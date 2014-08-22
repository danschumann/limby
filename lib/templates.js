var
  ECT  = require('ect'),
  _    = require('underscore'),
  join = require('path').join,
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
    // A mostly internal render method that gets extended for [individual limbs|limby|core]
    limby.render = _.bind(limby.renderer.render, limby.renderer);
    _.extend(limby, instanceMethods);

  },

};

var instanceMethods = {

  eachWidget: function(path, callback) {
    var limby = this;

    // Join to ensure slashes are correct
    path = join(path)

    _.each(limby.widgets[path], callback);
  },

  layout: function(type) {
    type = type || '';
    return this.views[join('layouts', type)] || this.views[join('layouts', 'default')];
  },

};
