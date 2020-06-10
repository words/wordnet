const util = require('util');
const wordnet = require('../lib/wordnet.js');

(async () => {
  await wordnet.init();

  let results = await wordnet.list();

  console.log(util.inspect(results, false, null, true));
})();
