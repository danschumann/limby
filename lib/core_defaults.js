module.exports = {

  forms: {

    admin: {
      pageHeading: 'Admin',

      className: 'panel panel-default',

      panelHeadingClass: 'panel-heading',
      panelBodyClass: 'list-group',
      createClass: 'btn btn-primary btn-xs pull-right',
      // Submit and confirm buttons
      buttonClass: 'btn btn-primary btn-lg',
    },

    account: {
      containerClass: 'container edit-account',
      className: 'panel panel-default form form-horizontal',

      panelHeadingClass: 'panel-heading',
      panelHeading: 'Edit Account',
      panelBodyClass: 'panel-body',

      buttonClass: 'btn-primary btn btn-lg',
      buttonText: 'Save &raquo;',

      password: true,
    },

    email: {
      containerClass: 'container change-email',
      className: 'panel panel-default form form-horizontal',

      panelHeadingClass: 'panel-heading',
      panelHeading: 'Change Email',
      panelBodyClass: 'panel-body',

      buttonText: 'Change Email &raquo;',
      buttonClass: 'btn-primary btn btn-lg',
    },

    password: {
      containerClass: 'container change-password',
      className: 'panel panel-default form form-horizontal',

      panelHeadingClass: 'panel-heading',
      panelHeading: 'Change Password',
      panelBodyClass: 'panel-body',

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

      panelHeading: 'Login',
      panelHeadingClass: 'panel-heading',
      panelBodyClass: 'panel-body',

      buttonClass: 'btn-primary btn btn-lg',
      buttonText: 'Log In &raquo;',
    },

    signup: {

      action: '/signup',
      containerClass: 'container signup',
      className: 'panel panel-default form form-horizontal',

      panelHeading: 'Sign Up',
      panelHeadingClass: 'panel-heading',
      panelBodyClass: 'panel-body',

      // You don't need to require a password on signup
      // If you don't a temporary one is generated
      // and the user is asked to create one the first time they log in
      password: true,

      buttonClass: 'btn-primary btn btn-lg',
      buttonText: 'Sign Up &raquo;',
    },
  },

};
