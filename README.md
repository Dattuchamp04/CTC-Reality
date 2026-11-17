# CTC Reality

Your offer letter, corrected in red pen. Paste an offer letter, upload the PDF, or upload a screenshot, and see what actually reaches your bank each month, what a month on it looks like, and which clauses to question. Available in English, Hindi and Kannada.

Everything runs in the browser. Offer letters are read on the device and never uploaded.

## Run it locally

```
python3 -m http.server 8000
```

Open http://localhost:8000. (The offline mode only switches on over HTTPS.)

## Deploy for free

Any static host works. Two easy options:

- **Vercel:** sign in with GitHub at vercel.com, choose "Add New Project", pick this repository, keep every setting as it is, and press Deploy.
- **GitHub Pages:** in the repository, open Settings, then Pages, set the source to the `main` branch and the `/ (root)` folder, and save.

Once it is live on HTTPS, people can install it from the browser menu ("Add to Home screen" or "Install app") and it works offline.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app: tax engine, offer-letter reader, three languages, share card |
| `manifest.webmanifest` | Name, colours and icons used when the app is installed |
| `sw.js` | Offline support |
| `vendor/` | PDF.js 3.11.174 (PDF letters) |
| `vendor/ocr/` | Tesseract.js 5.1.1 with English data (screenshots of letters). Loaded only when someone picks an image. `worker.min.js` has a one-line fix: it passes the language name instead of the raw data when initialising. `eng-traineddata.wasm` is the gzipped English model, renamed so any host serves it. |
| `icons/` | App icons |

## How the numbers are worked out

New tax regime for FY 2026-27: ₹75,000 standard deduction, no tax up to ₹12 lakh of taxable income (rebate with marginal relief), 4% cess. Monthly take-home leaves out variable pay and one-time bonuses. Rent, food and travel are rough starting estimates. This is an estimate, not tax advice.
