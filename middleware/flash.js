var
  extendErrorMaker = require('../lib/error');
  _ = require('underscore');

module.exports = function(limby) {

  return function limbyFlash(req, res, next) {

    req.flash = req.flash || {};
    req.session.flash = req.session.flash || {};

    // twitter bootstrap style -- req.flash.danger('YOLO')
    _.each(['danger', 'success', 'warning', 'info'], function(method){
      req.flash[method] = extendErrorMaker(req.session.flash, method);
    });

    next();

  };
};
