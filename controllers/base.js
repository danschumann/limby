var
  when  = require('when'),
  _     = require('underscore');

module.exports = function(limby, models) {
  return {

    // not logged in
    welcome: function(req, res, next){
      res.view('base/index', {title: 'Welcome'});
    },

    // logged in
    dashboard: function(req, res, next){
      res.view('home', {title: 'Home'});
    },
  };

};
