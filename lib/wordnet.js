let reader = require('./reader');
let fsp = require('fs').promises;

module.exports = {};

const SPACE_CHAR = ' ';
const KEY_PREFIX = '@__';
const EXTENSIONS_MAP = {
  'adj': 'a',
  'adv': 'r',
  'noun': 'n',
  'verb': 'v'
};

const SYNSET_TYPE_MAP = {
  'n': 'noun',
  'v': 'verb',
  'a': 'adjective',
  's': 'adjective satellite',
  'r': 'adverb'
};

// These hold the data in memory.
let _index = {};
let _data = {};

// Utilities.
function toNumber(str, radix = 10) { return parseInt(str, radix) }
function getKey(word) { return `${KEY_PREFIX}${word}` }


/**
 * Parses the database files and loads them into memory.
 *
 * @return {Promise} Empty promise object.
 */
module.exports.init = async function(databaseDir) {
  const extensions = Object.keys(EXTENSIONS_MAP);

  if (!databaseDir) {
    databaseDir = __dirname + '/../db';
  }

  // Read data from all index files into memory.
  // NOTE: We have to run this serially in order to ensure consistent results.
  await extensions.reduce((p, ext) => {
    return p.then(() => {
      return readIndex(`${databaseDir}/index.${ext}`);
    });
  }, Promise.resolve());

  // Load the contents from the data files into memory.
  await Promise.all(extensions.map((ext) => {
    return readDatabase(`${databaseDir}/data.${ext}`).then((fileHandle) => {
      _data[EXTENSIONS_MAP[ext]] = fileHandle;
    });
  }));

  return Promise.resolve();
}

/**
 * Lists all the words.
 *
 * @return {Array} List of all words.
 */
module.exports.list = function() {
  return Object.keys(_index).map(function(key) {
    return key.substring(KEY_PREFIX.length).replace(/_/g, SPACE_CHAR);
  });
}

/**
 * Looks up a word.
 *
 * @param {String} word Word to search.
 * @param {Boolean} skipPointers Whether to skip inclusion of pointer data.
 * @return {Promise} Resolves with definitions for the given word.
 */
module.exports.lookup = function(word, skipPointers = false) {
  let key = getKey(word.replace(new RegExp(SPACE_CHAR, 'g'), '_'));
  let definitions = _index[key];

  if (!definitions) {
    return Promise.reject(new Error(`No definition(s) found for "${word}.`))
  }

  let promises = definitions.map((defintion) => {
    return readData(defintion, skipPointers);
  });

  return Promise.all(promises);
}


/**
 * Reads the data for specified synctactic category.
 *
 * @param {Object} definition Index definition of the word.
 * @param {Boolean} skipPointers Whether to skip inclusion of pointer data.
 */
function readData(definition, skipPointers) {
  let { pos, synsetOffset } = definition;

  if (!pos) {
    return Promise.resolve();
  }

  // Read from currently open file.
  let fileHandle = _data[pos];
  let buffer = Buffer.alloc(1024);

  return fileHandle.read(buffer, 0, 1024, synsetOffset).then(({ bytesRead, buffer }) => {
    let line = buffer.toString().split('\n')[0];
    return parseDataLine(line, skipPointers);
  });
}

function readIndex(filePath) {
  return new Promise((resolve) => {
    reader.read(filePath, (line) => {
      let result = parseIndexLine(line);

      if (!result.isComment) {
        // Prefix not to break any built-in properties.
        let key = getKey(result.lemma);
        if (!_index[key]) {
          _index[key] = [];
        }
        _index[key].push(result);
      }
    }, resolve);
  })
}

/**
 * Reads a WordNet database.
 *
 * @param {String} extension WordNet DB extension.
 * @return {Promise} Resolves with FileHandle object.
 */
function readDatabase(filePath) {
  return fsp.open(filePath, 'r');
}

/**
 * Parses an index line.
 *
 * @param {String} line Index line to parse.
 * @return {Object} Attributes of the parsed line.
 */
function parseIndexLine(line) {
  // Documentation for index lines at https://wordnet.princeton.edu/documentation/wndb5wn
  // lemma  pos  synset_cnt  p_cnt  [ptr_symbol...]  sense_cnt  tagsense_cnt   synset_offset  [synset_offset...]

  // Ignore comments.
  if (line.charAt(0) === SPACE_CHAR) {
    return { isComment: true };
  }

  let result = {};
  let [ lemma, pos, synsetCount, ...parts ] = line.split(SPACE_CHAR);
  let pointerCount = toNumber(parts.shift());

  // Iterate through the pointers.
  let pointers = [];
  for (let index = 0; index < pointerCount; index++) {
    pointers.push(parts.shift());
  }

  // Extract remaining values.
  let [ senseCount, tagSenseCount, synsetOffset, ...additionalSynsetOffsets] = parts;

  return {
    lemma,
    pos,
    synsetCount: toNumber(synsetCount),
    pointerCount,
    pointers,
    senseCount: toNumber(senseCount),
    tagSenseCount: toNumber(tagSenseCount),
    synsetOffset: toNumber(synsetOffset)
  }
}

/**
 * Parses a data file line.
 *
 * @param {String} line Data line to parse.
 * @param {Boolean} skipPointers Whether to skip inclusion of pointer data.
 * @return {Object} Attributes of the parsed line.
 */
async function parseDataLine(line, skipPointers) {
  // Documentation for data lines at https://wordnet.princeton.edu/documentation/wndb5wn
  // synset_offset  lex_filenum  ss_type  w_cnt  word  lex_id  [word  lex_id...]  p_cnt  [ptr...]  [frames...]  |   gloss

  // Separate metadata from glossary.
  let metaAndGlossary = line.split('|');
  let metadata = metaAndGlossary[0].split(' ');
  let glossary = metaAndGlossary[1] ? metaAndGlossary[1].trim() : '';

  // Extract the metadata.
  let [ synsetOffset, lexFilenum, synsetType, ...parts ] = metadata;

  // Extract the words.
  let wordCount = toNumber(parts.shift(), 16);
  let words = [];
  for (let wordIdx = 0; wordIdx < wordCount; wordIdx++) {
    words.push({
      word: parts.shift(),
      lexId: toNumber(parts.shift(), 16)
    });
  }

  // Extract the pointers.
  let pointerCount = toNumber(parts.shift());
  let pointers = [];
  for (let pointerIdx = 0; pointerIdx < pointerCount; pointerIdx++) {
    pointers.push({
      pointerSymbol: parts.shift(),
      synsetOffset: parseInt(parts.shift(), 10),
      pos: parts.shift(),
      sourceTargetHex: parts.shift()
    });
  }

  if (!skipPointers) {
    // Get the data for each pointer.
    let pointersData = await Promise.all(pointers.map((pointer) => {
      // Don't recurse further than one degree.
      return readData(pointer, true);
    }));
    // NOTE: this mutates the pointer objects.
    pointersData.forEach((data, index) => {
      pointers[index].data = data;
    });
  }

  return {
    glossary,
    meta: {
      synsetOffset: toNumber(synsetOffset),
      lexFilenum: toNumber(lexFilenum),
      synsetType: SYNSET_TYPE_MAP[synsetType],
      wordCount,
      words,
      pointerCount,
      pointers
    }
  };
}
