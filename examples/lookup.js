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

    function printWord(definition, usePointers) {

      console.log('  type : %s', definition.meta.synsetType);
      var words = '';
      definition.meta.words.forEach(function(word) {
        words += word.word + ' ';
      });
      console.log('  words: %s', words.trim());
      console.log('  %s', definition.glossary);
      console.log();

      /* Print pointers */
      if (usePointers) {
        definition.meta.pointers.forEach(function(pointer) {

          if (!pointer.data.meta) {
            return;
          }

          /* Print the word only if contains (or prefixes) the look up expression */
          var found = false;
          pointer.data.meta.words.forEach(function(aWord) {
            if (aWord.word.indexOf(word) === 0) {
              found = true;
            }
          });

          if (found || ['*', '='].indexOf(pointer.pointerSymbol) > -1) {
            printWord(pointer.data, false);
          }

        });
      }

    }

    printWord(definition, true);

  });

});