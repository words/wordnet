#!/usr/bin/env node

/**
 * WordNet lookup example
 *
 * @author Dariusz Dziuk <me@dariuszdziuk.com>
 */

var program = require('commander');
var wordnet = require('../lib/wordnet.js');

program
  .version('0.0.1')
  .usage('<word>')
  .parse(process.argv);

/* Word to look up */
var word = program.args[0];
if (!word) {
  program.help();
}

wordnet.lookup(word, function(err, definition) {

  if (err) {
    console.log('An error occured: %s', err);
    return;
  }

  console.log('[%s]\n\n', word, definition);

});