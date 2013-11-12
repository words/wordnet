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

  lookup: lookup,

  /**
   * Lists all the words
   *
   * @param {Function} callback Std callback with error and list of words.
   */

  list: list

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
 * Synset types map
 *
 * @type {Object}
 */

var _synsetTypeMap = {
  'n': 'noun',
  'v': 'verb',
  'a': 'adjective',
  's': 'adjective satellite',
  'r': 'adverb'
};

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
 * @param {Boolean} pointers Should parse the pointers as well?
 * @param {Function} callback Std callback with error and parsed object.
 */

function parseDataLine(line, pointers, callback) {

  /* Split the glossary */
  var parts = line.split('|');
  var metadata = parts[0].split(' ');
  var glossary = parts[1] ? parts[1].trim() : '';

  /* Parse the metadata */
  var meta = {};
  meta.synsetOffset = parseInt(metadata.shift(), 10);
  meta.lexFilenum = parseInt(metadata.shift(), 10);
  meta.synsetType = _synsetTypeMap[metadata.shift()];
  meta.wordCount = parseInt(metadata.shift(), 16);
  meta.words = [];

  /* Parse the words */
  for (var wordIdx = 0; wordIdx < meta.wordCount; wordIdx++) {
    meta.words.push({
      word: metadata.shift(),
      lexId: parseInt(metadata.shift(), 16)
    });
  }

  /* Parse the pointers */
  meta.pointerCount = parseInt(metadata.shift(), 10);
  meta.pointers = [];
  for (var pointerIdx = 0; pointerIdx < meta.pointerCount; pointerIdx++) {
    meta.pointers.push({
      pointerSymbol: metadata.shift(),
      synsetOffset: parseInt(metadata.shift(), 10),
      pos: metadata.shift(),
      sourceTargetHex: metadata.shift()
    });
  }

  /* Skip the pointers data */
  if (!pointers) {
    callback(null, {
      meta: meta,
      glossary: glossary
    });
    return;
  }

  /* Parse the pointers data */
  async.each(meta.pointers, function(pointer, callback) {

    readData(pointer, false, function(err, data) {
      pointer.data = data;
      callback();
    });

  },
  function(err) {

    /* Handle error */
    if (err) {
      callback(err);
      return;
    }

    callback(null, {
      meta: meta,
      glossary: glossary
    });

  });

};

/**
 * Reads the data for specified synctactic category
 *
 * @param {Object} definition Index definition of the word.
 * @param {Boolean} pointers Should parse pointers?
 * @param {Function} callback Std callback with error and parsed result object.
 */

function readData(definition, pointers, callback) {

  var pos = definition.pos;
  var offset = definition.synsetOffset;

  if (!pos) {
    callback(null, {});
    return;
  }

  /* Read from file */
  var fd = _data[pos];
  var buffer = new Buffer(1024);
  fs.read(fd, buffer, 0, 1024, offset, function(err, bytesRead, buffer) {

    var line = buffer.toString().split('\n')[0];
    parseDataLine(line, pointers, callback);

  });

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

    var key = getKey(word.replace(/ /g, '_'));
    var definitions = _index[key];

    if (!definitions) {
      callback(new Error('Definition(s) not found.'));
      return;
    }

    var results = [];

    async.eachSeries(definitions, function(defintion, callback) {

      /* Read the word data */
      readData(defintion, true, function(err, result) {

        if (err) {
          callback(err);
          return;
        }

        results.push(result);
        callback();

      });

    }, function(err) {

      if (err) {
        callback(err);
        return;
      }

      callback(null, results);

    });

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
 * Lists all the words
 *
 * @param {Function} callback Std callback with error and list of words.
 */

function list(callback) {

  onReady(function() {

    var list = [];
    Object.keys(_index).forEach(function(key) {
      list.push(key.substring(3).replace(/_/g, ' '));
    });

    callback(null, list);

  });

}

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