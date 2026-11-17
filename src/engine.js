// CTC Reality engine: tax, salary structure, living costs, offer-letter reader.
// Pure functions with no DOM access, so the same file runs in the browser and in Node tests.
// Tax rules: India, FY 2026-27, new regime (Section 115BAC).
const SLABS = [[400000, 0], [800000, .05], [1200000, .10], [1600000, .15], [2000000, .20], [2400000, .25], [Infinity, .30]];
const STD_DED = 75000, REBATE_LIMIT = 1200000;
function incomeTax(gross) {
  const ti = Math.max(0, gross - STD_DED); let tax = 0, prev = 0;
  for (const [lim, r] of SLABS) { if (ti > prev) tax += (Math.min(ti, lim) - prev) * r; prev = lim; }
  if (ti <= REBATE_LIMIT) tax = 0; else tax = Math.min(tax, ti - REBATE_LIMIT);
  return Math.round(withSurcharge(ti, tax) * 1.04);
}
function slabTax(ti) { let tax = 0, prev = 0; for (const [lim, r] of SLABS) { if (ti > prev) tax += (Math.min(ti, lim) - prev) * r; prev = lim; } return tax; }
// Surcharge with marginal relief: crossing a threshold can't cost more than the income above it. New regime caps at 25%.
function withSurcharge(ti, tax) {
  const steps = [[20000000, .25], [10000000, .15], [5000000, .10]];
  for (let i = 0; i < steps.length; i++) {
    const [th, rate] = steps[i]; if (ti <= th) continue;
    const below = i + 1 < steps.length ? steps[i + 1][1] : 0;
    return Math.min(tax * (1 + rate), slabTax(th) * (1 + below) + (ti - th));
  }
  return tax;
}
// True when the ₹12 lakh rebate's marginal relief is what sets the tax.
function inRelief(gross) { const ti = gross - STD_DED; return ti > REBATE_LIMIT && slabTax(ti) > ti - REBATE_LIMIT;
}
// Monthly living costs for one person. Starting estimates, meant to be overwritten.
const CITIES = {
  'Bengaluru': { rent: [11000, 17000, 28000], k: 1, pt: 200 }, 'Mumbai': { rent: [14000, 24000, 40000], k: 1.05, pt: 200 },
  'Gurugram': { rent: [11000, 17000, 28000], k: 1, pt: 0 }, 'Hyderabad': { rent: [9000, 14000, 22000], k: .95, pt: 200 },
  'Pune': { rent: [9000, 14000, 22000], k: .95, pt: 200 }, 'Chennai': { rent: [9000, 13000, 20000], k: .92, pt: 200 },
  'Kolkata': { rent: [7000, 10000, 15000], k: .85, pt: 200 }, 'Ahmedabad': { rent: [7000, 10000, 15000], k: .85, pt: 200 },
  'Kochi': { rent: [7000, 10000, 14000], k: .85, pt: 200 }, 'Jaipur': { rent: [6500, 9000, 13000], k: .82, pt: 200 },
  'Indore': { rent: [6000, 8000, 12000], k: .8, pt: 200 }
};
const FOOD = [5500, 9000, 14000], RIDE = [2000, 3200, 9000];
const PARTS = ['basic', 'hra', 'special', 'epfEmployer', 'gratuity', 'variable', 'oneTime', 'other'];

function derive(o) {
  if (o.mode === 'letter' && o.comp) return { ...o.comp };
  const ctc = o.lpa * 100000, variable = ctc * o.varPct / 100, fixed = ctc - variable, basic = fixed * o.basicPct / 100;
  const epfEmployer = o.pf === 'none' ? 0 : o.pf === 'cap' ? Math.min(basic * .12, 21600) : basic * .12, gratuity = basic * .0481;
  let hra = basic * .4, special = fixed - basic - hra - epfEmployer - gratuity; if (special < 0) { hra = Math.max(0, hra + special); special = 0; }
  return { basic, hra, special, epfEmployer, gratuity, variable, oneTime: 0, other: 0, ctc };
}
function compute(o) {
  const c = derive(o), sum = PARTS.reduce((s, k) => s + (c[k] || 0), 0), ctc = c.ctc || sum;
  const gross = c.basic + c.hra + c.special, epf = c.epfEmployer, city = CITIES[o.city] || CITIES.Bengaluru, pt = city.pt * 12;
  const taxFixed = incomeTax(gross), taxVar = incomeTax(gross + c.variable) - taxFixed, taxOnce = incomeTax(gross + c.variable + c.oneTime) - taxFixed - taxVar;
  const inHand = (gross - epf - pt - taxFixed) / 12;
  const rent = o.rent != null ? o.rent : city.rent[o.home], food = Math.round(FOOD[o.food] * city.k / 100) * 100, ride = Math.round(RIDE[o.ride] * city.k / 100) * 100;
  const spendParts = [['Rent', rent], ['Food', food], ['Travel', ride], ['Bills, phone, fun', o.other], ['EMI + sent home', o.emi]].filter(p => p[1] > 0);
  const spend = spendParts.reduce((s, p) => s + p[1], 0), left = inHand - spend;
  return { c, ctc, sum, gap: ctc - sum, gross, epf, pt, taxFixed, inHand, variableNet: c.variable - taxVar, oneTimeNet: c.oneTime - taxOnce,
    rent, food, ride, spendParts, spend, left, saveRate: inHand > 0 ? left / inHand : 0, runOutDay: left < 0 ? Math.max(1, Math.floor(30 * inHand / spend)) : null,
    neverMonthly: ctc - gross };
}
// Split a month into 30 boxes by where the money goes. Returns [{label, n}], plus borrowed boxes when short.
function monthBoxes(r) {
  const base = r.left >= 0 ? r.inHand : r.spend, items = r.spendParts.map(p => [p[0], p[1]]); if (r.left > 0) items.push(['Left over', r.left]);
  const raw = items.map(p => 30 * p[1] / base), n = raw.map(Math.floor); let rest = 30 - n.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - n[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { n[i]++; rest--; } });
  return { boxes: items.map((p, i) => ({ label: p[0], amount: p[1], n: n[i] })), funded: r.left >= 0 ? 30 : r.runOutDay };
}

// ---------- offer letter reader ----------
const RULES = [
  ['skip', /employee'?s?\s+(contribution|share)|deduction|net\s+(pay|salary|take)|take[\s-]?home|in[\s-]?hand/],
  ['ctc', /cost\s+to\s+(the\s+)?company|total\s+(annual\s+)?(ctc|compensation|cost|package)|annual\s+ctc|\bctc\b|total\s+rewards?/],
  ['skip', /gross|sub[\s-]?total|total|fixed\s+(pay|compensation|salary|ctc)/],
  ['oneTime', /joining|sign[\s-]?on|relocation|one[\s-]?time|retention/],
  ['variable', /variable|performance|incentive|annual\s+bonus|target\s+bonus|bonus/],
  ['gratuity', /gratuity/],
  ['epfEmployer', /provident|\bepf\b|\bpf\b/],
  ['other', /insurance|mediclaim|medical\s+cover|\bnps\b|superannuation|esop|\brsu|stock|meal\s+(card|coupon|voucher)|food\s+coupon|\besi\b/],
  ['basic', /basic/],
  ['hra', /house\s+rent|\bhra\b/],
  ['special', /allowance|special|\blta\b|leave\s+travel|conveyance|flexi|telephone|bouquet|city\s+compensatory|statutory/]
];
function nums(line) {
  const out = []; let m;
  const lakh = /(\d+(?:\.\d+)?)\s*(lpa|lakhs?|lacs?)\b/gi; while ((m = lakh.exec(line))) out.push(parseFloat(m[1]) * 100000);
  const dated = /\b(fy|year|dated?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\d[\/-]\d/i.test(line);
  const re = /(\d{1,3}(?:,\d{2,3})+|\d{4,})(?:\.\d+)?/g;
  while ((m = re.exec(line))) { const v = parseFloat(m[1].replace(/,/g, '')); if (dated && !m[1].includes(',') && v >= 1900 && v <= 2100) continue; out.push(v); }
  return out;
}
// Fix what phone OCR typically gets wrong in Indian amounts: 4.80.000 for 4,80,000, letter O for zero.
function cleanOcr(text) {
  return text.split(/\r?\n/).map(l => l
    .replace(/([\d,])[oO](?=[\d,.]|\b)/g, '$10').replace(/([\d,])[oO](?=[\d,.]|\b)/g, '$10')
    .replace(/\b\d{1,3}(?:[.,]\d{2})*[.,]\d{3}\b(?![.,]\d)/g, m => m.replace(/\./g, ','))
    .replace(/[|]/g, ' ')).join('\n');
}
function parseLetter(text) {
  const comp = { basic: 0, hra: 0, special: 0, epfEmployer: 0, gratuity: 0, variable: 0, oneTime: 0, other: 0, ctc: 0 };
  const found = [], singles = []; let ctcSeen = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(), low = line.toLowerCase(), v = nums(line); if (!v.length || !/[a-z]/i.test(line)) continue;
    const rule = RULES.find(r => r[1].test(low)); if (!rule || rule[0] === 'skip') continue;
    const max = Math.max(...v), min = Math.min(...v);
    if (rule[0] === 'ctc') { ctcSeen = Math.max(ctcSeen, max); continue; }
    const paired = v.length >= 2 && max / min > 11.5 && max / min < 12.5, e = { bucket: rule[0], label: line.replace(/[\s:.\-–|₹]*(rs\.?|inr)?[\s:.\-–|₹]*\d[\d,.\s|₹/-]*$/i, '').trim().slice(0, 48), value: max, paired };
    found.push(e); if (!paired && rule[0] !== 'oneTime') singles.push(e);
  }
  // Decide whether unpaired figures are monthly or yearly.
  const pairedSum = found.filter(e => e.paired || e.bucket === 'oneTime').reduce((s, e) => s + e.value, 0), singleSum = singles.reduce((s, e) => s + e.value, 0);
  let k = 1;
  if (singles.length) {
    if (ctcSeen) k = Math.abs(pairedSum + 12 * singleSum - ctcSeen) < Math.abs(pairedSum + singleSum - ctcSeen) ? 12 : 1;
    else k = /per\s+month|monthly|\bp\.?\s?m\b/i.test(text) && Math.max(...singles.map(e => e.value)) < 150000 ? 12 : 1;
  }
  for (const e of found) { e.annual = e.paired || e.bucket === 'oneTime' ? e.value : e.value * k; comp[e.bucket] += e.annual; }
  const sum = PARTS.reduce((s, p) => s + comp[p], 0); comp.ctc = ctcSeen && ctcSeen >= sum * .6 && ctcSeen <= sum * 2 ? ctcSeen : sum;
  // Clauses worth a second look. Flags carry a code and values; the page words them in the reader's language.
  const flags = [], t = text.replace(/\s+/g, ' '); let m;
  const span = (n, u) => ({ n: +n, u: /day/i.test(u) ? 'day' : /month/i.test(u) ? 'month' : 'year' });
  if (comp.oneTime && (m = /(claw\s?back|recover|repay|refund|return).{0,120}/i.exec(t))) { const mo = /(\d+)\s*(months?|years?)/i.exec(m[0]); flags.push({ level: 'bad', code: mo ? 'claw' : 'claw0', p: mo ? span(mo[1], mo[2]) : null }); }
  else if (comp.oneTime) flags.push({ level: 'warn', code: 'once' });
  if ((m = /notice\s+period[^.]{0,80}?(\d+)\s*(days?|months?)/i.exec(t))) { const d = /month/i.test(m[2]) ? +m[1] * 30 : +m[1]; flags.push({ level: d >= 60 ? 'warn' : 'ok', code: d >= 60 ? 'noticelong' : 'notice', p: span(m[1], m[2]) }); }
  if (/service\s+(agreement|bond)|\bbond\b|liquidated\s+damages|training\s+cost/i.test(t)) { const amt = nums((/(service\s+(agreement|bond)|\bbond\b|liquidated\s+damages|training\s+cost).{0,160}/i.exec(t) || [''])[0]); flags.push({ level: 'bad', code: amt.length ? 'bond' : 'bond0', x: amt.length ? Math.max(...amt) : 0 }); }
  if (comp.ctc && comp.variable / comp.ctc > .15) flags.push({ level: 'warn', code: 'var', pct: Math.round(100 * comp.variable / comp.ctc) });
  if (comp.other) flags.push({ level: 'warn', code: 'ben', x: Math.round(comp.other) });
  if (comp.ctc - sum > comp.ctc * .02) flags.push({ level: 'warn', code: 'mis', x: Math.round(sum), y: Math.round(comp.ctc) });
  if ((m = /probation[^.]{0,60}?(\d+)\s*(months?|days?)/i.exec(t))) flags.push({ level: 'ok', code: 'prob', p: span(m[1], m[2]) });
  return { comp, found, flags, monthlyFigures: k === 12, ok: comp.basic > 0 && sum > 0 };
}
if (typeof module !== 'undefined') module.exports = { inRelief, incomeTax, compute, derive, monthBoxes, parseLetter, cleanOcr, CITIES };
