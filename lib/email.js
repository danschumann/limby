module.exports = function(limby){

  if (!limby.config.mail) return;

  var
    mailer,
    nodefn      = require('when/node/function'),
    _           = require('underscore'),
    nodemailer  = require('nodemailer');

  mailer = nodemailer.createTransport('SMTP', limby.config.mail);

  limby.email = nodefn.lift(_.bind(mailer.sendMail, mailer));
};
