#!/usr/bin/env node

require('when/monitor/console');

var
  commands = ['rollback', 'migrate'],
  argv,
  _ = require('underscore'),
  Limby = require('../index'),
  join = require('path').join,

  debug = require('debug')('limby:bin'),
  argv = require('optimist').argv,
  fs = require('fs'),
  when = require('when');

debug('starting')

// we need to remove the first arg if it is a path
// this happens when running 'node path/to/limby/bin/index.js' on windows
if (argv._[0]) {

  // the path of this bin file ( this file you're reading right now )
  var thisPath = join(__dirname, __filename);

  // absolute path
  if (argv._[0][0] == '/') {

    // If the arg is the same as the path we ditch it
    if (thisPath == join(argv._[0]))
      argv._.shift()

  // relative path
  } else {

    // If the arg is the same as the path we ditch it
    if (thisPath == join(process.cwd(), argv._[0]))
      argv._.shift()
  }
};

var command = argv._[0];

var commands = ['generate', 'g', 'migrate', 'rollback', 'redo', 'version']

if (command && !_.include(commands, command)) {
  console.log(('Valid commands include: ' + commands.join(', ')).red);
  process.exit(1)
}

if (argv.v || command == 'version') {
  console.log('Limby version '.blue, require('../package.json').version);

} else if ((command == 'generate' || command == 'g')) {

  if ((argv._[2] && argv._[1] !== 'migration') || !argv._[1]) {
    console.log(
        ('if you are generating something, ' + 
        'the syntax is `limby g migration MY_MIGRATION` or `limby g MY_MIGRATION`').red
    );
    process.exit(1);
  }

  var migrationName = argv._[2] || argv._[1];

  console.log('generating migration'.blue, migrationName);

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
        join(dir, 'migrations', date + '__' + migrationName + '.js')
      )
    );

} else {
    
  debug('constructor')
  var limby = new Limby(process.cwd());

  debug('loadNative');
  return limby.load()
  .then(function(){
    debug('loadLimbs');
    return limby.loadLimbs();
  })
  .then(function(){

    debug('starting migrations');
    var Migrations = limby.models.Migrations;

    return when().then(function(){
      if ( command == 'redo' ) {
        debug('starting redo');
        var step = argv.step;
        // Clone so decrementing argv.step doesn't affect migrate
        return Migrations.rollback(argv)
          .then(function() {
            argv.step = step; // We decremented it in the first part
            return Migrations.migrate(argv)
          });
      } else if ( command == 'rollback' ) {
        debug('starting rollback');
        return Migrations.rollback(argv)
      } else if ( !command || command == 'migrate' )  {
        debug('starting migrate');
        return Migrations.migrate(argv)
      } else {
        console.log("Please supply a command", commands);
        console.log("If you meant to start the server, please run `node index.js` from the root directory(../) or include limby in your project");

      }
    })
    .then(function(){
      process.exit(0);
    });
  })
  .otherwise(function(er){
    console.log('migration err'.red, er, er.stack);
    process.exit(1);
  });

};
