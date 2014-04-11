#!/usr/bin/env node

// Top level entry point
require('../lib/bootstrap');

var
  commands = ['rollback', 'migrate'],
  argv,
  _ = require('underscore'),
  Limby = require('../index'),
  join = require('path').join,

  argv = require('optimist').argv,
  fs = require('fs'),
  when = require('when');

// we need to remove the first arg if it is a path
// this happens when running 'node path/to/limby/bin/index.js' on windows
if (argv._[0]) {

  // the path of this bin file ( this file you're reading right now )
  var thisPath = join(__dirname, __filename);

  if (argv._[0][0] == '/') {
    // they used absolute path

    if (thisPath == join(argv._[0]))
      argv._.shift()

  } else {
    // relative path

    if (thisPath == join(process.cwd(), argv._[0]))
      argv._.shift()
  }
} 

var command = argv._[0];

if (argv._[0] == 'g' && argv._[1] == 'migration') {

  counter = 10;
  var dir = join(process.cwd());

  // scrape upwards until we find a directory with migrations in it ( or we get to the top )
  while ( !_.include(fs.readdirSync(dir), 'migrations') && counter-- > 0 )
    dir = join(dir, '..');

  if ( !_.include(fs.readdirSync(dir), 'migrations') )
    throw new Error('Couldn\'t find a directory to put a migration file');

  var date = (new Date).toISOString().replace(/:/g, '-').replace('.', '-')
  fs
    .createReadStream(join(__dirname, '../lib/migration_template.js'))
    .pipe(
      fs.createWriteStream(
        join(dir, 'migrations', date + '__' + argv._[2] + '.js')
      )
    );

} else {
    
  // We skip loading some dependencies like ldap in bin mode
  GLOBAL.limbyBin = true;

  var limby = new Limby(join(process.cwd(), 'config'));

  return limby.loadNative()
  .then(function(){
    return limby.loadLimbs();
  })
  .then(function(){

    var Migrations = limby.models.Migrations;

    return when().then(function(){
      if ( command == 'redo' ) {
        var step = argv.step;
        // Clone so decrementing argv.step doesn't affect migrate
        return Migrations.rollback(argv)
          .then(function() {
            argv.step = step; // We decremented it in the first part
            return Migrations.migrate(argv)
          });
      } else if ( command == 'rollback' ) 
        return Migrations.rollback(argv)
      else if ( !command || command == 'migrate' )  {
        console.log('buh'.red);
        return Migrations.migrate(argv)
      } else {

        console.log("Please supply a command", commands);
        console.log("If you meant to start the server, please run `node index.js` from the root directory(../) or include limby in your project");

      }
    })
    .then(function(){
      process.exit(0);
    });
  });
}
