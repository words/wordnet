# WordNet.js

Simple Node.js module for accessing [Princeton University's WordNet](http://wordnet.princeton.edu/) dictionary.

# Installation

    $ npm install wordnet
    
# How to use

An example how to use the module is located in examples/lookup.js.

    var wordnet = require('wordnet');
    
    wordnet.lookup('define', function(err, definitions) {
    
      definitions.forEach(function(definition) {
        console.log('  words: %s', words.trim());
        console.log('  %s', definition.glossary);
      });
    
    });

# License

MIT License

# 3rd-party License

[Princeton University's WordNet License](http://wordnet.princeton.edu/wordnet/license/)
