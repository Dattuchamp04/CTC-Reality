// Tax engine: India, FY 2026-27, new regime.
const test = require('node:test');
const assert = require('node:assert/strict');
const { incomeTax, inRelief } = require('../src/engine.js');

const STD = 75000;
// Tax before 4% cess, given taxable income (gross minus standard deduction).
const beforeCess = ti => incomeTax(ti + STD) / 1.04;
const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1, `${msg}: got ${a}, expected ${b}`);

test('no tax up to ₹12 lakh of taxable income (Section 87A rebate)', () => {
  assert.equal(incomeTax(0), 0);
  assert.equal(incomeTax(1200000 + STD), 0);
});

test('rebate marginal relief: tax never exceeds income above ₹12 lakh', () => {
  near(beforeCess(1210000), 10000, '₹12.1L');
  near(beforeCess(1250000), 50000, '₹12.5L');
  near(beforeCess(1270000), 70000, '₹12.7L');
});

test('normal slabs take over once relief stops helping (about ₹12.71L)', () => {
  near(beforeCess(1271000), 60000 + 71000 * 0.15, '₹12.71L');
});

test('slab boundaries', () => {
  near(beforeCess(1600000), 120000, '₹16L');
  near(beforeCess(2000000), 200000, '₹20L');
  near(beforeCess(2400000), 300000, '₹24L');
  near(beforeCess(3000000), 480000, '₹30L');
});

test('4% health and education cess is applied', () => {
  assert.equal(incomeTax(2000000 + STD), Math.round(200000 * 1.04));
});

test('surcharge marginal relief just above ₹50 lakh', () => {
  const g = 5000000 + STD;
  assert.equal(incomeTax(g + 1000) - incomeTax(g), Math.round(1000 * 1.04));
});

test('property: no extra rupee of salary is taxed more than ₹1.04, from ₹10L to ₹2.5Cr', () => {
  let prev = null;
  for (let g = 1000000; g <= 25000000; g += 500) {
    const net = g - incomeTax(g);
    if (prev !== null) assert.ok(prev - net <= 0.04 * 500 + 1, `take-home fell too much at gross ₹${g}`);
    prev = net;
  }
});

test('inRelief marks exactly the rebate relief band', () => {
  assert.equal(inRelief(1200000 + STD), false);
  assert.equal(inRelief(1250000 + STD), true);
  assert.equal(inRelief(1300000 + STD), false);
});
