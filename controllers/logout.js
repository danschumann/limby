module.exports = function(limby, models) {
  return function(req, res, next) {
    delete req.session.user_id;
    req.notification('You have been successfully logged out');
    res.redirect(limby.baseURL + '/');
  };
};
