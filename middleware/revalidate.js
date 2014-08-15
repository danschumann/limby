module.exports = function(limby){

  var _ = require('underscore');
  var extensions = ['woff'];

  // All pages should do this since they all have some sort of specific data
  return function(req, res, next) {
    if (!_.include(extensions, _.last(req.url.split('.')))) {
      res.header("Cache-Control", "no-cache, no-store, must-revalidate");
      //res.header "p3p", 'CP="my compact p3p policy"'
      res.header("Pragma", "no-cache");
      res.header("Expires", 0);
    }
    next();
  };

};
