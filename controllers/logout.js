module.exports = function(limby, models) {
  return function(req, res, next) {
    delete req.session.user_id;
    req.flash.info('You have been successfully logged out');
    res.redirect(limby.baseURL + '/');
  };
};
