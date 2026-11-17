// Offer-letter reader: three common layouts, OCR clean-up, and clause warnings.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLetter, cleanOcr, compute } = require('../src/engine.js');

const ANNUAL = `ANNEXURE A - COMPENSATION DETAILS
Component                      Per Annum (INR)
Basic Salary                   4,80,000
House Rent Allowance           2,40,000
Special Allowance              1,86,312
Employer's contribution to PF  57,600
Gratuity                       23,088
Medical Insurance Premium      13,000
Performance Linked Bonus       1,00,000
Joining Bonus (one time)       1,00,000
Total Cost to Company          12,00,000
The joining bonus shall be recovered in full if you resign within 12 months of joining.
Your notice period will be 90 days. You will be on probation for 6 months.`;

const MONTHLY_AND_ANNUAL = `Salary Structure
Particulars | Monthly | Annual
Basic | 30,000 | 3,60,000
HRA | 15,000 | 1,80,000
Conveyance Allowance | 1,600 | 19,200
Special Allowance | 9,957 | 1,19,484
Gross Salary | 56,557 | 6,78,684
Employer PF | 1,800 | 21,600
Gratuity | 1,443 | 17,316
Variable Pay (annual, subject to performance) | | 82,400
CTC | | 8,00,000
You are required to sign a service agreement for 24 months with liquidated damages of Rs. 2,00,000.`;

const MONTHLY_ONLY = `Monthly compensation (per month)
Basic 25000
House Rent Allowance 12500
Other Allowance 10500
PF (Employer) 1800
Your annual CTC will be 6.5 LPA including a performance bonus of 52,400.`;

test('annual-only table: every component lands in the right bucket', () => {
  const { comp } = parseLetter(ANNUAL);
  assert.deepEqual(
    { basic: comp.basic, hra: comp.hra, special: comp.special, epf: comp.epfEmployer, grat: comp.gratuity, var: comp.variable, once: comp.oneTime, other: comp.other, ctc: comp.ctc },
    { basic: 480000, hra: 240000, special: 186312, epf: 57600, grat: 23088, var: 100000, once: 100000, other: 13000, ctc: 1200000 });
});

test('annual-only table: clawback, notice period, benefits and probation are flagged', () => {
  const codes = parseLetter(ANNUAL).flags.map(f => f.code);
  assert.deepEqual(codes, ['claw', 'noticelong', 'ben', 'prob']);
  assert.deepEqual(parseLetter(ANNUAL).flags[0].p, { n: 12, u: 'month' });
});

test('monthly + annual columns: uses the annual figure, skips the gross subtotal', () => {
  const { comp } = parseLetter(MONTHLY_AND_ANNUAL);
  assert.equal(comp.basic, 360000);
  assert.equal(comp.special, 19200 + 119484);
  assert.equal(comp.epfEmployer, 21600);
  assert.equal(comp.variable, 82400);
  assert.equal(comp.ctc, 800000);
});

test('service bond amount is extracted', () => {
  const bond = parseLetter(MONTHLY_AND_ANNUAL).flags.find(f => f.code === 'bond');
  assert.equal(bond.x, 200000);
});

test('monthly-only figures are annualised, and "6.5 LPA" is read as the CTC', () => {
  const r = parseLetter(MONTHLY_ONLY);
  assert.equal(r.monthlyFigures, true);
  assert.equal(r.comp.basic, 300000);
  assert.equal(r.comp.epfEmployer, 21600);
  assert.equal(r.comp.ctc, 650000);
});

test('a letter without a Basic pay line is rejected', () => {
  assert.equal(parseLetter('Dear candidate, welcome aboard.').ok, false);
});

test('OCR clean-up: Indian amounts read with dots, and letter O for zero', () => {
  assert.equal(cleanOcr('Basic Salary 4.80.000'), 'Basic Salary 4,80,000');
  assert.equal(cleanOcr('Gratuity 23,O88'), 'Gratuity 23,088');
  assert.equal(parseLetter(cleanOcr('Basic Salary 4.80.000\nHouse Rent Allowance 2.40.000\nTotal Cost to Company 7.20.000')).comp.basic, 480000);
});

test('parsed letter flows into take-home', () => {
  const comp = parseLetter(ANNUAL).comp;
  const r = compute({ mode: 'letter', comp, city: 'Bengaluru', home: 1, food: 1, ride: 0, other: 6500, emi: 0, rent: null });
  assert.equal(r.ctc, 1200000);
  assert.ok(r.inHand > 60000 && r.inHand < 80000);
});
