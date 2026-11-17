// Builds index.html from src/. No dependencies: run `node build.js` (or `npm run build`).
const fs = require('fs');
const path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');

const html = src('template.html')
  .replace('/*__ENGINE__*/', () => src('engine.js'))
  .replace('/*__I18N__*/', () => src('i18n.js'))
  .replace('/*__APP__*/', () => src('app.js'));

for (const mark of ['__ENGINE__', '__I18N__', '__APP__']) {
  if (html.includes(mark)) throw new Error(`Placeholder ${mark} was not replaced`);
}
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log(`Built index.html (${(html.length / 1024).toFixed(1)} KB)`);
