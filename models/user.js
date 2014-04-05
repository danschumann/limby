module.exports = function(limby, models) {
  var
    User, Users,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
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
      'username', 
      'password', 
      'password_token', 
      'password_token_expires', 
      'admin',
      'notify_start_vote',
      'notify_end_vote',
      'notify_pickup',
    ],

    validations: {
      first_name: function(val){
        this.check(val || '', 'First name must be between 2 and 45 characters').len(2, 45); 
      },
      last_name: function(val){
        this.check(val || '', 'Last name must be between 2 and 45 characters').len(2, 45);
      },
      email: function(val){
        this.check(val || '', 'Must be a valid email').isEmail();
      },
      username: function(val){
        this.check(val || '', 'Username must be between 3 and 45 characters').len(3, 45);
      },
      password: function(val){
        this.check(val || '', 'Password must be between 6 and 255 characters').len(6, 255);
      },
      confirm_email: function(val){
        if ( val !== this.get('email') )
          throw new Error('Emails must match');
      },
      confirm_username: function(val){
        if ( val !== this.get('username') )
          throw new Error('Usernames must match');
      },
      confirm_password: function(val){
        if ( val !== this.get('password') )
          throw new Error('Passwords must match');
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
        return when.reject("Cannot log in because you didn't create a password on signup -- did you use Facebook or LDAP?")

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
           return user.reject("Could not find that username");
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

    loginLDAP: function(username, password) {

      var
        user = this,
        ldapUser;

      return nodefn.call(limby.ldapAuthenticate, username, password)
        .otherwise(function(err){
          return user.reject('Those credentials were not right');
        })
        .then(function(_ldapUser){
          // We found
          ldapUser = _ldapUser;
          return user.fetch()
        })
        .then(function(){
          if ( !user.id ) {
            return user
              .set({first_name: ldapUser.givenName, last_name: ldapUser.sn, email: ldapUser.mail})
              .save();
          } else
            return user;
        })
        .otherwise(function(err){
          if(user.errored()) return user.reject(); // Already errored out

          return user.reject('Unknown error, try contacting db admin');
        });

    },

    loginStrategy: function(username, password) {

      var user = this;

      if (config.ldap.enabled) {
        return this.loginLDAP(username, password);
      } else
        return this.mustLoad()
          .then(function(){
            return user.checkPassword(password);
          })

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

    signup: function(attributes) {

      attributes.email = attributes.username;
      attributes.confirm_email = attributes.confirm_username;

      var user = User.forge(attributes);

      user.validateSync([
        'first_name',
        'last_name',
        'username',
        'confirm_username',
        'confirm_email',
        'password',
      ]);

      return User.emailExists(attributes.email)
        .then(function(exists){
          if (exists)
            user.error('email', 'That email is already in use');

          // Now we can reject since we have all possible errors
          if ( user.errored() ) return user.reject();
        })

        .then(function(){
          return user.hashPassword()
        })
        .then(function(){
          return user.save({method: 'insert'})
        })
        .then(function(){
          //user.mailers.signup();
          return user;
        });
    },

    // Takes raw data
    login: function(attributes) {
      var user;

      user = new User({username: attributes.username});
      user.validateSync('username');

      // We don't actually want to set the password to the user
      if (!attributes.password)
        user.singleValidation('password', attributes.password);

      if ( user.errored() ) return user.reject();

      return user
        .loginStrategy(attributes.username, attributes.password)
        .then(function(match){
          if (match)
            return when.resolve(user);
          else
            return when.reject({password: 'That password did not match'});
        });

    },

    forgot_password: function(attributes) {
      var user; 

      // Make sure we have a username
      user = new User({username: attributes.username})

      return user.validate('username')
        .then(function(){

          // Make sure username exists
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

    usernameExists: function(username) {

      return this.forge({username: username}).fetch()
        .then(function(user){
          return user !== null;
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
