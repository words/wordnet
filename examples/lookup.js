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

wordnet.lookup(word, function(err, definitions) {

  if (err) {
    console.log('An error occured: %s', err);
    return;
  }

  console.log('\n  %s\n', word);

  /* Definitions */
  definitions.forEach(function(definition) {

    console.log('  type : %s', definition.meta.synsetType);
    var words = '';
    definition.meta.words.forEach(function(word) {
      words += word.word + ' ';
    });
    console.log('  words: %s', words.trim());
    console.log('  %s', definition.glossary);

    console.log();

  });

});