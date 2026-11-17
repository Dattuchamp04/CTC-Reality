// Salary structure, monthly take-home and the 30-box month.
const test = require('node:test');
const assert = require('node:assert/strict');
const { compute, monthBoxes, inRelief } = require('../src/engine.js');

const base = { mode: 'quick', lpa: 12, varPct: 10, basicPct: 50, pf: 'full', city: 'Bengaluru', home: 1, food: 1, ride: 0, other: 6500, emi: 0, rent: null };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1, `${msg}: got ${a}, expected ${b}`);

test('12 LPA in Bengaluru: worked example', () => {
  const r = compute(base);
  assert.equal(r.ctc, 1200000);
  near(r.sum, 1200000, 'components add up to CTC');
  near(r.inHand, 76835.5, 'monthly take-home');
  near(r.left, 76835.5 - 34500, 'left after rent, food, travel, bills');
});

test('PF capped at ₹1,800 a month raises take-home', () => {
  assert.ok(compute({ ...base, pf: 'cap' }).inHand > compute(base).inHand);
});

test('own rent overrides the city estimate', () => {
  assert.equal(compute({ ...base, rent: 9000 }).rent, 9000);
});

test('the month always splits into exactly 30 boxes', () => {
  for (const o of [base, { ...base, lpa: 5, home: 2, ride: 2 }, { ...base, lpa: 40 }]) {
    const n = monthBoxes(compute(o)).boxes.reduce((s, b) => s + b.n, 0);
    assert.equal(n, 30);
  }
});

test('when spending exceeds pay, it reports the day money runs out', () => {
  const r = compute({ ...base, lpa: 4.5, home: 2, ride: 2 });
  assert.ok(r.left < 0);
  assert.ok(r.runOutDay >= 1 && r.runOutDay < 30);
});

test('property: monthly take-home never drops as CTC rises, outside the rebate relief band (3 to 60 LPA)', () => {
  let prev = -1;
  for (let l = 3; l <= 60; l += 0.1) {
    const r = compute({ ...base, lpa: +l.toFixed(1) });
    if (!inRelief(r.gross)) assert.ok(r.inHand >= prev - 0.5, `dropped at ${l.toFixed(1)} LPA`);
    prev = r.inHand;
  }
});
