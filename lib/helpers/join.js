var
  _ = require('underscore'),
  path = require('path');

//
// Simply calls path.join(limby.root, args...)
//
module.exports = {

  // extend helper onto limby
  wrap: function(limby) {
    limby.join = _.bind(module.exports.join, limby);
  },

  join: function(/* paths... */) {
    path.join.apply(path, [this.root].concat(Array.prototype.slice.call(arguments)))
  },

};
