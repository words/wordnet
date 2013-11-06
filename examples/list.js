/**
 * WordNet lookup example
 *
 * @author Dariusz Dziuk <me@dariuszdziuk.com>
 */

var wordnet = require('../lib/wordnet.js');

wordnet.list(function(err, list) {

  console.log(list);

});