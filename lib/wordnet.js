/**
 * WordNet Node Wrapper
 *
 * @author Dariusz Dziuk
 */

var reader = require('./reader');
var async = require('async');
var fs = require('fs');

/**
 * Public interface
 *
 * @type {Object}
 */

module.exports = {

  /**
   * Looks up a word
   *
   * @param {String} word Word to look up.
   * @param {Function} callback Std callback with error and definition.
   */

  lookup: function(word, callback) {
    lookup(word, callback);
  }

};

/**
 * List of WordNet db extensions
 *
 * @type {Array}
 */

var _extensions = [
  'adj',
  'adv',
  'noun',
  'verb'
];

/**
 * Index lookup
 *
 * @type {Object}
 */

var _index = {};

/**
 * Open file handlers
 *
 * @type {Object}
 */

var _data = {};

/**
 * Awaiting callbacks
 *
 * @type {Array}
 */

var _callbacks = [];

/**
 * Is module ready?
 *
 * @type {Boolean}
 */

var _isReady = false;

/**
 * Parses an index line
 *
 * @param {String} line Input line.
 * @param {Function} callback Callback with error and result object.
 */

function parseIndexLine(line, callback) {

  if (line.charAt(0) === ' ') {
    callback(null, {isComment: true});
    return;
  }

  var tokens = line.split(' ');
  var result = {};

  /* Parse the data */
  result.lemma = tokens.shift();
  result.pos = tokens.shift();
  result.synsetCount = parseInt(tokens.shift(), 10);

  /* Pointers */
  result.pointerCount = parseInt(tokens.shift(), 10);
  result.pointers = [];
  for (var index = 0; index < result.pointerCount; index++) {
    result.pointers.push(tokens.shift());
  }

  result.senseCount = parseInt(tokens.shift(), 10);
  result.tagSenseCount = parseInt(tokens.shift(), 10);
  result.synsetOffset = parseInt(tokens.shift(), 10);

  callback(null, result);

};

/**
 * Parses a data file line
 *
 * @param {String} line Data line to parse.
 * @param {Function} callback Std callback with error and parsed object.
 */

function parseDataLine(line, callback) {

};

/**
 * Gets a key for specified word
 *
 * @param {String} word Word to build key for.
 * @return {String} Key for the word.
 */

function getKey(word) {

  return '@__' + word;

};

/**
 * Looks up a word
 *
 * @param {String} word Word to look up.
 * @param {Function} callback Standard callback with error and result.
 */

function lookup(word, callback) {

  onReady(function() {

    var key = getKey(word);
    var definitions = _index[key];

    if (!definitions) {
      callback(new Error('Definition(s) not found.'));
      return;
    }

    callback(null, definitions);

  });

};

/**
 * Reads a WordNet database
 *
 * @param {String} extension WordNet DB extension.
 * @param {Function} callback Standard callback with error and index array.
 */

function readDatabase(extension, callback) {

  reader.read(__dirname + '/../db/index.' + extension, function(line) {

    parseIndexLine(line, function(err, result) {
      if (!result.isComment) {
        /* Prefix not to break any built-in properties */
        var key = getKey(result.lemma);
        if (!_index[key]) {
          _index[key] = [];
        }
        _index[key].push(result);
      }
    });

  }, function() {
    callback();
  });

};

/**
 * Waits till the dictionary is loaded
 *
 * @param {Function} callback Callback to be called when ready.
 */

function onReady(callback) {

  if (!_isReady) {
    _callbacks.push(callback);
  }
  else {
    callback();
  }

};

/**
 * Initializes the module after preparing the dictionary
 */

function init() {

  _isReady = true;
  _callbacks.forEach(function(callback) {
    callback();
  })

}

/* Read all files */
async.eachSeries(_extensions, readDatabase, function(err) {

  /* Extension to pos value mapper */
  var extensionToPos = {
    'adj': 'a',
    'adv': 'r',
    'noun': 'n',
    'verb': 'v'
  };

  /* Open file handlers */
  _extensions.forEach(function(extension) {
    _data[extensionToPos[extension]] = fs.openSync(__dirname + '/../db/data.' + extension, 'r');
  });

  /* Init */
  init();

});