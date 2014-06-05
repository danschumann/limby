module.exports = {

  forms: {
    account: {
      containerClass: 'container edit-account',
      className: 'panel panel-default form form-horizontal',
      buttonClass: 'btn-primary btn btn-lg',
      buttonText: 'Save &raquo;',
      password: true,
    },

    email: {
      containerClass: 'container change-email',
      className: 'panel panel-default form form-horizontal',
      buttonClass: 'btn-primary btn btn-lg',
    },

    password: {
      containerClass: 'container change-password',
      className: 'panel panel-default form form-horizontal',
      buttonClass: 'btn-primary btn btn-lg',
    },

    forgotPassword: {
      panelHeadingClass: 'panel-heading',
      panelHeading: 'Password Recovery',
      panelBodyClass: 'panel-body',

      containerClass: 'container forgot-password', 
      className: 'panel panel-default form form-horizontal',
      buttonClass: 'btn btn-lg btn-primary',
      buttonText: 'Send Recovery Email &raquo;',
      backClass: 'btn btn-lg btn-default',
      backText: '&laquo; Back',
    },

    login: {
      containerClass: 'container login',
      className: 'panel panel-default form form-horizontal',
      buttonClass: 'btn-primary btn btn-lg',
      buttonText: 'Log In &raquo;'
    },

    signup: {
      containerClass: 'container signup',
      className: 'panel panel-default form form-horizontal',
      buttonClass: 'btn-primary btn btn-lg',
      buttonText: 'Register &raquo;'
    },
  },

};
