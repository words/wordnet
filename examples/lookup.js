const program = require('commander');
const wordnet = require('../lib/wordnet.js');

program
  .version('0.0.1')
  .usage('<word>')
  .option('-d, --database <database-path>', 'Location of WordNet index and data files.')
  .parse(process.argv);

/* Word to look up */
const word = program.args[0];
if (!word) {
  program.help();
}

function printWord(def, includePointers) {
  let words = def.meta.words.reduce((str, word) => {
    return `${str} ${word.word}`;
  }, '');

  console.log(`  type: ${def.meta.synsetType}`)
  console.log(`  words: ${words.trim()}`);
  console.log(`  ${def.glossary}\n`);

  /* Print pointers */
  if (includePointers) {
    def.meta.pointers.forEach(function(pointer) {
      if (!pointer.data.meta) {
        return;
      }

      /* Print the word only if contains (or prefixes) the look up expression */
      let found = false;
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

(async () => {
  await wordnet.init();

  wordnet.lookup(word)
    .then((definitions) => {
      console.log(`\n  ${word}\n`);

      definitions.forEach((definition) => {
        printWord(definition, true);
      });
    })
    .catch((e) => {
      console.error(e);
    });

})();
