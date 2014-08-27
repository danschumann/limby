module.exports = function(limby) {

  var
    _           = require('underscore'),
    bookshelf   = require('bookshelf'),
    knex        = require('knex'),
    wrap        = require('param-bindings');

  // Bookshelf Init -- DB connect
  if (limby.knex) // can pass knex in options: `limby(root, {knex: ...})`
    knex = limby.knex
  else {

    if (limby.config.bookshelf)
      throw new Error('config.bookshelf is depreciated, it is now config.knex');

    if (!limby.config.knex)
      throw new Error('You must set a config.knex value.');

    knex = knex(limby.config.knex);
    limby.knex = knex;
  };
  wrap(knex, 'raw');
  limby.raw = _.bind(knex.raw, knex);
  limby.bookshelf = bookshelf = bookshelf(knex);
  limby.schema = bookshelf.schema = limby.knex.schema;

};
