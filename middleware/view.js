module.exports = limbyViewMiddleware;

function limbyViewMiddleware(app, limby){
  return function (req, res, next) {

    // While its unlikely, `req.locals` could already be set from other middleware.
    req.locals = req.locals || {};
    req.locals.limby = limby;

    req.upload = function(opts) {
      return limby.models.Files.upload(_.extend(opts, {req: req}));
    };

    res.limbyView = function(){
      delete req.locals.limbPath;
      return res.view.apply(this, arguments);
    };

    res.view = function(p, options, cb) {

      req.locals.limb = req.locals.limb || limby.core;
      req.locals.limbName = req.locals.limbName || 'core';

      if (_.isFunction(options)) {
        cb = options;
        option = {};
      };

      var defaults = _.extend(_.clone(limby.config.viewOptions), {
        req: req,
        limb: req.locals.limb,
        locals: req.locals,
      });

      options = _.extend(defaults, options);

      // Within a limb
      if (req.locals.limbPath) {

        var args = [
          join(req.locals.limbPath, 'views', p + '.ect.html'),
          options,
        ];
        if (cb) args.push(cb);
        var r =  limby.render.apply(limby, args);
        if (cb)
          return r;
        else
          res.send(r);

      } else {

        // limby.views contains full path with extension, such that
        // `limby.views['accounts/index'] == 'accounts/index.ect.html'`
        var view = limby.viewPath(p);
        if (!view) throw new Error('that view was not found');

        if (cb) {

          var html;
          try {
            html = limby.render(view, options, cb);
          } catch (er) {
            return cb(er, null);
          }
          return cb(null, html);

        } else
          return res.send(limby.render(view, options));
      };

    };

    next();
};
};
