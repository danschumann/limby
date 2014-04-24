module.exports = function(limby, models) {
  var
    User, Users,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    loginColumn = config.login.column,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    pm         = require('print-messages'),
    when       = require('when'),
    crypto     = require('crypto'),
    bcrypt     = require('bcrypt'),

    check      = bookshelf.check,
    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'users',

    permittedAttributes: [
      'id',
      'first_name', 
      'last_name', 
      'email', 
      'password', 
      'password_token', 
      'password_token_expires', 
      'admin',
      'notify_start_vote',
      'notify_end_vote',
      'notify_pickup',
    ],

    validations: {

      // Only run before first time saving
      unique_email: function() {

        var user = this;

        return User.emailExists(this.get('email'))
          .then(function(exists) {
            if (exists) {
              user.error('email', 'That email is already in use');
              return when.reject();
            };
          });
      },

      first_name: function(val){
        this.check(val || '', 'Must be between 2 and 45 characters').len(2, 45); 
      },

      last_name: function(val){
        this.check(val || '', 'Must be between 2 and 45 characters').len(2, 45);
      },

      email: function(val){
        this.check(val || '', 'Must be valid').isEmail();
      },

      password: function(val){
        this.check(val || '', 'Must be between 6 and 255 characters').len(6, 255);
      },

      confirm_email: function(val){
        if ( val !== this.get('email') )
          throw new Error('Must match');
      },

      confirm_password: function(val){
        if ( val !== this.get('password') )
          throw new Error('Must match');
      },

    },

    group_users: function(){
      return this.hasMany(models.PermissionGroupUsers);
    },

    // Only roles that are specific to 1 user, nothing to do with groups
    permission_roles: function(){
      return this.hasMany(models.PermissionUserRoles);
    },

    formattedEmail: function(){
      return this.get('first_name') + ' ' + this.get('last_name') + ' <' + this.get('email') + '>';
    },

    checkPassword: function(pass) {

      if (!this.get('password'))
        return when.reject("Cannot log in because you didn't create a password on signup -- try using Facebook or LDAP if that's what you did to sign up.");

      else
        return nodefn.call(bcrypt.compare, pass, this.get('password'));

    },

    // Makes a salt and hashes the password, then sets it back to user
    hashPassword: function() {

      var user = this;

      return nodefn.call(bcrypt.genSalt, 10)
        .then(function(salt){
          return nodefn.call(bcrypt.hash, user.get('password'), salt);
        })
        .then(function(password){
          user.set('password', password);
          return user
        })
    },

    mustLoad: function(){
      var user = this;

      return this.fetch()
        .then(function(){
          if (!user || !user.id)
           return user.reject("Could not find that account");
        });
    },

    changeEmail: function(attributes){
      var user = this;

      return user
        .set(attributes)
        .validate('email', 'confirm_email')
        .then(function(){
          return user.save();
        });

    },

    editAccount: function(attributes){
      var user = this;

      return user
        .set(attributes)
        .validate('first_name', 'last_name')
        .then(function(){
          return user.save();
        });

    },

    // Just changes -- Assumes they already verified password
    changePassword: function(attributes){
      var user = this;

      return user
        .set(attributes)
        .validate('password', 'confirm_password')
        .then(function(){
          return user.hashPassword();
        })
        .then(function(){
          return user.save();
        });

    },

    loginStrategy: function() {

      var
        user = this,
        password = user.get('password');

      user.unset('password');

      return this.mustLoad()
        .then(function(){
          return user.checkPassword(password);
        });

    },

    fullName: function(){
      return this.get('first_name') + ' ' + this.get('last_name');
    },

    loadPermissions: function() {

      var user = this;

      // union permissions through roles and groups
      return limby.knex.raw(limby.queries.user_permissions, [user.id, user.id])
        .then(function(results){
          return models.Permissions.forge(results && results[0]);
        });

    },

    loginParams: function(body) {

      var attributes = {
        email:          _.escape(body.email),
        password:                body.password,
      };

      this.set(attributes);
      return this.validate(
        'email',
        'password'
      );

    },

    signupParams: function(body) {

      var attributes = {
        first_name:     _.escape(body.first_name),
        last_name:      _.escape(body.last_name),
        email:          _.escape(body.email),
        confirm_email:  _.escape(body.confirm_email),
        password:                body.password,
      };

      this.set(attributes);
      return this.validate(
        'first_name',
        'last_name',
        'email',
        'confirm_email',
        'unique_email',
        'password'
      );

    },

  };

  classMethods = {

    // Takes raw data
    login: function(body) {
      var user = User.forge();
      
      return user.loginParams(body)
        .then(function() {
          console.log('heheheheh'.red, user.toJSON());
          return user.loginStrategy();
        })
        .then(function(match) {
          if (match)
            return user;
          else
            return user.reject({password: 'That password did not match'});
        })

    },

    forgot_password: function(attributes) {
      var user; 

      // Make sure we have a email
      user = new User(attributes)

      return user.validate(loginColumn)
        .then(function(){

          // Make sure email exists
          return user.mustLoad()

        })
        .then(function(){

          // need a token for verification
          return nodefn.call(crypto.randomBytes, 256);

        })
        .then(function(randomBuffer){

          // expire in an hour to make sure it can't be guessed
          return user.save({
            password_token: randomBuffer.toString('hex').substring(0, 255),
            password_token_expires: (new Date).getTime() + 60 * 60 * 1000,
          });

        })

        // Email them the token
        .then(function(){
          user.mailers.forgot_password();
        });

    },

    emailExists: function(email) {

      return this.forge({email: email}).fetch()
        .then(function(user){
          return user !== null;
        });

    },

  };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  User = bookshelf.Model.extend(instanceMethods, classMethods);
  Users = bookshelf.Collection.extend({ model: User });
      
  return {User: User, Users: Users};
};
