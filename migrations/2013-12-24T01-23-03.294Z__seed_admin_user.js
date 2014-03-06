var
  when = require('when');

module.exports = {

  title: 'Seed admin',

  up: function(limby){

    return limby.models.User.forge({
      first_name: 'Dan',
      last_name: 'Schumann',
      username: 'd@d.d',
      email: 'd@d.d',
      password: 'asdfasdf',
      admin: true,
    })
    .hashPassword().then(function(user){
      console.log(user.toJSON());
      return user.save()
    }).then(function(){
      console.log('created admin user'.green);
    });

  },

  down: function(data){
    //noop
    return when.resolve();
  }
};
