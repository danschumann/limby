module.exports = function(limby, models) {

  var
    User, Users,
    columns, instanceMethods, classMethods, options,
    debug       = require('debug')('limby:models:user'),

    config     = limby.config,
    loginColumn = config.login.column,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    when       = require('when'),
    crypto     = require('crypto'),
    bcrypt     = require('bcrypt'),

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
      'deleted',
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
              user.error('email', 'No account exists for this email address. ' + (user.logOn ? '  Need an account?  <a href="' + limby.baseURL + '/signup">Register here.</a>' : '') );
              // and use a blank `email_exists` key
              return when.reject();

            };
          })
          .otherwise(function(er){
            console.log('unknown error', er, er.stack)
            user.error('email', 'Could not lookup that email, an unknown error has occured');
            return when.reject();
          });
      },

      first_name: function(val){
        if (!this.validator.isLength(val || '', 2, 45))
          return when.reject('Must be between 2 and 45 characters');
      },

      last_name: function(val){
        if (!this.validator.isLength(val || '', 2, 45))
          return when.reject('Must be between 2 and 45 characters');
      },

      email: function(val){
        if (!this.validator.isEmail(val || ''))
          return when.reject('Must be valid a email address ( example@domain.com )');
      },

      password: function(val){
        if (!this.validator.isLength(val || '', 6, 255))
          return when.reject('Must be between 6 and 255 characters');
      },

      confirm_email: function(val){
        if ( val !== this.get('email') )
          throw new Error('Must match');
      },

      // Not used by default, push 'confirm_password' to User.prototype.validationBatches[signup|...]
      confirm_password: function(val){
        if ( val !== this.get('password') )
          throw new Error('Must match');
      },

    },

    validationBatches: {
      email: [ 'email', 'confirm_email', 'unique_email' ],
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
    permissions: function(){
      return this.belongsToMany(models.Permission).through(models.PermissionUserRole);
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

    mustLoad: function() {
      var user = this;

      return this.fetch()
        .then(function() {
          if (!user || !user.id)
           return user.reject("Could not find that account");
        });
    },

    loginStrategy: function() {

      var
        user = this,
        password = user.get('password');

      // We're checking this password, we unset it
      user.unset('password');

      return this.mustLoad()
        .then(function(){
          // After loading the user (mustLoad), we have the actual password on user
          return user.checkPassword(password);
        });

    },

    firstAndLastInitial: function(name){
      return this.get('first_name') + ' ' + (this.get('last_name') && this.get('last_name').substring(0,1)) + '.';
    },

    fullName: function(name){
      return this.get('first_name') + ' ' + this.get('last_name');
    },

    // should be used only for individual roles -- nothing to do with groups
    revoke: function(attrs) {

      var
        user = this,
        perm;

      perm = this.related('permissions').findWhere({name: name, is_role: true});

      if (perm) {
        perm.get('user_role_id');
      }

    },

    grant: function(attrs) {

      var user = this;

      if (this.related('permissions').findWhere({name: attrs.name}))
        return when.resolve(); // already granted
      else
        return limby.models.Permission.firstOrCreate(attrs)
        .then(function(perm) {
          return limby.models.PermissionUserRole.forge({
            user_id: user.id,
            limby_permission_id: perm.id,
          }).save();
        });

    },

    can: function(name) {
      return this.related('permissions').findWhere({name: name});
    },

    setDefaultPermissions: function() {
      var user = this;
      return models.PermissionGroups.forge().query(function(qb) {
        qb.where('default', true);
      }).fetch().then(function(groups){
        return when.all(groups.map(function(pg){
          return models.PermissionGroupUser
            .forge({limby_permission_group_id: pg.id, user_id: user.id})
            .save();
        }));
        
      })
      .then(function(){
        return user;
      });
    },

    loadPermissions: function() {

      var user = this;

      // union permissions through roles and groups
      return limby.knex.raw(limby.queries.user_permissions, [user.id, user.id])
        .then(function(results){
          user.related('permissions').add(results[0]);
          return models.Permissions.forge(results && results[0]);
        });

    },
    
    email: function(options) {

      options = _.clone(options);
      var user = this;
      options.user = user;
      options.styliner = true;

      var done = function(er, source){
        return limby.email({
          subject: options.subject,
          to:      options.to || user.formattedEmail(),
          from:    options.from || config.mail.from,
          text:    options.text || source || options.html,
          html:    options.html || source || options.text,
        })
        .then(function(){
          debug('Sent Mail'.green, options.to || user.formattedEmail(), options.subject);
        })
        .otherwise(function(){
          debug('Failed Mail'.red, arguments, user.formattedEmail());
        });
      }
      if (options.template)
        return limby.render(options.template, options, done)
      else
        return done(); // hopefully they provided html || text

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

  User = limby.Model.extend(instanceMethods, classMethods);
  Users = bookshelf.Collection.extend({ model: User });
      
  return {User: User, Users: Users};
};
