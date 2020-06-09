let test = require('tape');
let wordnet = require('../lib/wordnet');
let fixture = require('./fixture.json')

test('api', async (t) => {
  t.plan(6);
  const WORD = 'test';
  const expected = fixture[WORD];

  // TODO: Add tests for expected failure cases:
  // - Calling API functions before init.
  // - Searching for a word not in the database.

  // TODO: Add test for initializing with a custom path.
  await wordnet.init();

  let list = await wordnet.list();
  t.equal(list.length, 147306, "Check database size.");

  let definitions = await wordnet.lookup(WORD);

  t.equal(definitions.length, expected.length, "Check number of definitions.");

  definitions.forEach((definition, index) => {
    t.equal(definition.glossary, expected[index].glossary, "Check definitions match.");
    t.deepEqual(definition.meta, expected[index].meta, "Check meta matches.");
  });
});
