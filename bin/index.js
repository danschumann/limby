#!/usr/bin/env node

// Top level entry point
require('../lib/bootstrap');

var
  command,
  commands = ['rollback', 'migrate'],
  argv,
  _ = require('underscore'),
  Limby = require('../index'),
  migrationsWrapped = require('../models/migrations.js');

// We skip loading some dependencies like ldap in bin mode
GLOBAL.limbyBin = true;

var limby = new Limby(join(process.cwd(), 'config'));
limby.loadLimbs()
.then(function(){

  var Migrations = migrationsWrapped(limby).Migrations;

  argv = require('optimist').argv;

  command = argv._[0];

  when().then(function(){
    if ( command == 'redo' ) {
      var step = argv.step;
      // Clone so decrementing argv.step doesn't affect migrate
      return Migrations.rollback(argv)
        .then(function(){
          argv.step = step; // We decremented it in the first part
          return Migrations.migrate(argv)
        });
    } else if ( command == 'rollback' ) 
      return Migrations.rollback(argv)
    else if ( !command || command == 'migrate' ) 
      return Migrations.migrate(argv)
    else {

      console.log("Please supply a command", commands);
      console.log("If you meant to start the server, please run `node index.js` from the root directory(../) or include limby in your project");

    }
  })
  .then(function(){
    process.exit(0); 
  });
});
