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
              // add errors to `email` key
              user.error('email', 'Already in use');
              // and use a blank `unique_email` key
              return when.reject();
            };
          });
      },

      // opposite of unique_email
      email_exists: function() {

        var user = this;

        return User.emailExists(user.get('email'))
          .then(function(exists) {
            if (!exists) {

              // explicitly add errors to `email` key
              // logOn set in controllers/login
              user.error('email', 'No account exists for this email address. ' + (user.logOn ? '  Need an account?  <a href="/signup">Register here.</a>' : '') );
              // and use a blank `email_exists` key
              return when.reject();

            };
          })
          .otherwise(function(){
            console.log('unknown error'.red);
            user.error('email', 'Could not lookup that email, an unknown error has occured');
            return when.reject();
          });
      },

      first_name: function(val){
        this.check(val || '', 'Must be between 2 and 45 characters').len(2, 45); 
      },

      last_name: function(val){
        this.check(val || '', 'Must be between 2 and 45 characters').len(2, 45);
      },

      email: function(val){
        this.check(val || '', 'Must be valid a email address ( example@domain.com )').isEmail();
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

    validationBatches: {
      editAccount: [ 'first_name', 'last_name' ],
      signup: [ 'first_name', 'last_name',
                'email', 'confirm_email',
                'unique_email', 'password'
      ],
      login: [ 'email_exists', 'email', 'password' ],
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

      if (!this.get('password')) {
        return this.reject('password', "Cannot log in because you didn't create a password on signup -- try using Facebook or LDAP if that's what you did to sign up.");
      } else
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

    editAccount: function(attributes){
      var user = this;

      return user

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

  };

  classMethods = {

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
