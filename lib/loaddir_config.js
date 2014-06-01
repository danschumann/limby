var loaddir = require('loaddir');

module.exports = function(limby) {

  if (!limby.config.loaddir) return;

  if (limby.config.loaddir.watch == false) loaddir.watch = false;

};
