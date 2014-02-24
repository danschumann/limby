module.exports = function(limby, models) {
  return function(req, res, next){
    res.view('admin/index');
  };
};
