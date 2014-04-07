var
  extendErrorMaker = require('../lib/error');
  _ = require('underscore');

// creates req.error('message') and req.notification('message')
// see lib/error for possible format of args
module.exports = function(limby) {

  return function(req, res, next) {

    _.each(['error', 'notification'], function(method){
      req[method] = extendErrorMaker(req.session, method + 's');
    });

    next();

  };
};
