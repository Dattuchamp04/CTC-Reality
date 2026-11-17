// Every English string has a Hindi and Kannada version with the same placeholders.
const test = require('node:test');
const assert = require('node:assert/strict');
const { T } = require('../src/i18n.js');

const holes = s => (s.match(/\{\w+\}/g) || []).sort().join();

for (const lang of ['hi', 'kn']) {
  test(`${lang}: no missing keys and matching placeholders`, () => {
    for (const [k, en] of Object.entries(T.en)) {
      assert.ok(k in T[lang], `${lang} is missing "${k}"`);
      const v = T[lang][k];
      if (typeof en === 'string') assert.equal(holes(v), holes(en), `${lang}.${k} placeholders differ`);
      else if (Array.isArray(en)) assert.equal(v.length, en.length, `${lang}.${k} option count differs`);
      else for (const kk of Object.keys(en)) assert.ok(kk in v, `${lang}.${k}.${kk} missing`);
    }
  });
}
