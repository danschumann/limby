module.exports = function(limby){
  var
    mailer,
    _           = require('underscore'),
    nodemailer  = require('nodemailer');

  mailer = nodemailer.createTransport('SMTP', limby.config.mail);

  limby.sendMail = _.bind(mailer.sendMail, mailer);
}
