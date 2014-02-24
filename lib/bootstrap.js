// Just some settings that get called before anything else
//   called by config

// This affects String.prototype
require('colors');

if (!process.env.NODE_ENV)
  console.log('Environment set to development by'.yellow, 'limby'.rainbow);

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// This shows errors that could be suppressed
// It's here because this file is needed by bin and core
if ( process.env.NODE_ENV === 'development') {
  require('when/monitor/console');
}
