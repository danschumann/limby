var
  extendErrorMaker = require('../lib/error');
  _ = require('underscore');

// creates req.error('message') and req.notification('message')
// see lib/error for possible format of args
module.exports = function(limby) {

  return function limbyFlash(req, res, next) {

    console.log(req.session);

    _.each(['error', 'notification'], function(method){
      req[method] = function(){
        console.log('req.' + method + ' has been depreciated.  Use req.flash.[danger|success|warning|info]'.yellow);
        extendErrorMaker(req.session, method + 's');
      };
    });

    // New way -- twitter bootstrap style
    req.flash = req.flash || {};
    req.session.flash = req.session.flash || {};
    _.each(['danger', 'success', 'warning', 'info'], function(method){
      req.flash[method] = extendErrorMaker(req.session, method + 's');
    });

    next();

  };
};
