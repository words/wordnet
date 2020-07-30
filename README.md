# WordNet.js

Simple Node.js module for accessing [Princeton University's WordNet](http://wordnet.princeton.edu/) dictionary.

# Installation

    $ npm install wordnet

# Usage

    const wordnet = require('wordnet');

    // (Required) Load the WordNet database.
    await wordnet.init();

    // List all available words.
    let list = await wordnet.list();

    // All methods return promises.
    wordnet.lookup('enlightened')
      .then((definitions) => {
        definitions.forEach((def) => {
          console.log(`type: ${def.meta.synsetType}`)
          console.log(`${def.glossary}\n`);
        });
      })
      .catch((e) => {
        console.error(e);
      });

Check out the [examples folder](examples) for more.


# API

### `wordnet.init([database_dir])`

Loads the WordNet database. Takes an optional folder path (as a `String`).

### `wordnet.lookup(word, [skipPointers])`

Returns definitions (metadata and glossary) for the given word. The definitions include pointers to related words, which can be omitted by passing `skipPointers = true`.

### `wordnet.list()`

Lists all available words in the WordNet database. If called before `wordnet.init()` finishes, it will return an empty array.


# License

MIT License


# 3rd-party License

[Princeton University's WordNet License](http://wordnet.princeton.edu/wordnet/license/)
