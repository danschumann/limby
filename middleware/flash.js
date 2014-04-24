var
  extendErrorMaker = require('../lib/error');
  _ = require('underscore');

// creates req.error('message') and req.notification('message')
// see lib/error for possible format of args
module.exports = function(limby) {

  return function limbyFlash(req, res, next) {

    req.flash = req.flash || {};
    req.session.flash = req.session.flash || {};

    // Old way
    _.each(['error', 'notification'], function(method){
      req[method] = function(){

        // Depreciated
        console.log('req.' + method + ' has been depreciated.  Use req.flash.[error|success|warning|info]'.yellow);

        // Pass along to new way
        extendErrorMaker(req.session.flash, method == 'notification' ? 'success' : 'danger' ).apply(this, arguments);

      };
    });

    // New way -- twitter bootstrap style
    _.each(['danger', 'success', 'warning', 'info'], function(method){
      req.flash[method] = extendErrorMaker(req.session.flash, method);
    });

    next();

  };
};
