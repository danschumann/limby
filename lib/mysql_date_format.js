var moment = require('moment');

Date.prototype.toMysqlFormat = function() {
  return moment(this).format('YYYY-MM-DDTHH:MM:SS');
};
