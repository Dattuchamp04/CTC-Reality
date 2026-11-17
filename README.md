# CTC Reality

[![CI](https://github.com/Dattuchamp04/CTC-Reality/actions/workflows/ci.yml/badge.svg)](https://github.com/Dattuchamp04/CTC-Reality/actions/workflows/ci.yml)

**Your offer letter, corrected in red pen.** Paste an offer letter, upload the PDF, or upload a phone screenshot of it. CTC Reality shows what actually reaches your bank each month, what a month on that money looks like in your city, and which clauses to question before you sign. It works in English, हिन्दी and ಕನ್ನಡ.

**Live:** [ctc-reality.vercel.app](https://ctc-reality.vercel.app) · installs on Android as an app and works offline.

Everything runs in the browser. Offer letters are read on your device and never uploaded.

---

## The problem

An offer letter says "₹12 lakh CTC". Most freshers divide by 12 and expect ₹1,00,000 a month. On a typical structure, about ₹76,800 arrives:

| Part of the CTC, per month | Amount | Why it isn't in your monthly pay |
|---|---|---|
| Variable pay (10%) | ₹10,000 | Paid yearly, only if targets are met |
| Employer PF | ₹5,400 | Goes into your PF account |
| Your PF | ₹5,400 | Also your savings, also locked |
| Gratuity | ₹2,165 | Paid only after about 5 years |
| Professional tax | ₹200 | Taxed away |
| Income tax | ₹0 | Nil under the new regime at this level |

Existing calculators ask you to type every component yourself and show a table. People comparing two offers during placement season need something that reads the letter they actually have, explains the gap in plain language, and tells them which offer leaves more money on the 30th.

## What it does

- **Reads the letter for you.** Pasted text, digital PDFs (PDF.js) and phone screenshots (Tesseract.js, running locally in WebAssembly).
- **Corrects the headline number.** The CTC is struck through in red, and the monthly take-home is written next to it, with every component and why it is or isn't cash.
- **Flags clauses.** Joining-bonus clawbacks, service bonds (with the amount), long notice periods, heavy variable pay, benefits counted as salary, and components the letter doesn't explain.
- **Shows the month in 30 boxes.** Rent, food, travel and bills for the chosen city and lifestyle; if the money runs out, the unfunded days turn red.
- **Compares two offers.** A lower CTC in a cheaper city often leaves more.
- **Share cards.** 4:5 for Instagram and LinkedIn, 16:9 for X and WhatsApp, with no employer names.

## Architecture

```
src/engine.js     Tax engine, salary structure, living costs, offer-letter parser. Pure functions, no DOM.
src/i18n.js       All interface text in English, Hindi and Kannada.
src/app.js        Rendering, letter reader (PDF.js, Tesseract.js), share cards, phone tabs.
src/template.html Markup and styles.
build.js          Inlines the three scripts into index.html (no bundler, no dependencies).
sw.js             Service worker: offline app shell, fonts cached on first use.
vendor/           PDF.js 3.11.174 and Tesseract.js 5.1.1, self-hosted so nothing loads from third-party CDNs at runtime.
tests/            Unit tests (Node's built-in test runner) and sample letters.
e2e/              End-to-end tests in headless Chromium, desktop and phone.
```

The engine has no dependencies and no DOM access, so the exact code that runs in the browser is what the tests exercise in Node.

## Hard parts

**1. Reading letters that all look different.** Offer letters list annual figures, monthly figures, or both side by side, and name the same thing many ways ("Employer's contribution to PF", "PF (Employer)", "EPF"). The parser classifies each line with ordered rules (skip employee deductions and subtotals first, then match CTC, one-time bonuses, variable pay, PF, gratuity, benefits, basic, HRA, allowances). When a line has two amounts about 12× apart, it takes the annual one. For lines with a single amount, it decides monthly or annual by checking which reading adds up closer to the stated CTC.

**2. OCR on Indian number formats.** Tesseract often reads `4,80,000` as `4.80.000` and swaps zero for the letter O. A small clean-up pass fixes those patterns before parsing, so a phone screenshot gives the same result as a PDF.

**3. Tax edge cases.** FY 2026-27 new regime: ₹75,000 standard deduction, the Section 87A rebate up to ₹12 lakh of taxable income with marginal relief just above it, surcharge from ₹50 lakh with its own marginal relief, and 4% cess. A property test sweeps gross pay from ₹10 lakh to ₹2.5 crore in ₹500 steps and asserts that no extra rupee is taxed more than ₹1.04. That test caught a real bug: surcharge was first applied without marginal relief, overstating tax just above ₹50 lakh. It also documents a genuine quirk of the law. Between about ₹12.75 and ₹13.46 lakh gross, take-home falls slightly as salary rises, because cess is added on top of the relief. The app labels this on the tax line instead of hiding it.

**4. Privacy without a backend.** Salary letters are sensitive, so there is no server. PDF parsing and OCR run in the browser; the OCR engine (about 11 MB) loads only when someone picks an image. The page works offline once installed.

## Testing

```
npm test          # 24 unit tests: tax, salary, letter parser, translations (no install needed)
npm run e2e       # end-to-end in Chromium, desktop and phone (run `npm install` and `npx playwright install chromium` first)
npm run check     # confirms index.html matches src/
```

GitHub Actions runs all three on every push.

## Run it locally

```
npm run build
node e2e/serve.js     # then open http://localhost:4173
```

## Deploy

Static files only. On Vercel, import the repository with Framework Preset **Other** and no build command; `index.html` is committed already built. Visitor counts use Vercel Web Analytics, which sets no cookies and collects no personal data.

## Roadmap

- Researched rent ranges by area for each city, replacing the current single estimates
- Appraisal-letter mode: what a "12% hike" adds per month after tax
- Payslip decoder, using the same parser
- Old vs new tax regime comparison for people with large deductions

## Notes

Estimates, not tax advice. Real payslips depend on each company's payroll rules.

Built by [Sridatta Khoday](https://github.com/Dattuchamp04). MIT licence.
