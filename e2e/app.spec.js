// The whole flow a user goes through, in a real browser.
const { test, expect } = require('@playwright/test');
const path = require('path');
const fixture = f => path.join(__dirname, '..', 'tests', 'fixtures', f);

// On phones only one offer is shown at a time; tap its tab first, as a person would.
async function openOffer(page, isMobile, k) {
  if (isMobile) await page.locator(`#tabs button[data-k="${k}"]`).click();
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', e => { throw e; });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('opens with two example offers and a verdict', async ({ page }) => {
  await expect(page.locator('#verdict')).toContainText('more every month');
  await expect(page.locator('#o0-in')).toHaveText('₹76,836');
});

test('sample letter fills Offer A and shows the clause warnings', async ({ page }) => {
  await page.locator('#o0-read').click();
  await page.locator('#rd-sample').click();
  await expect(page.locator('#o0-flags li')).toHaveCount(4);
  await expect(page.locator('#o0-flags')).toContainText('12 months');
});

test('reads a PDF offer letter', async ({ page, isMobile }) => {
  await openOffer(page, isMobile, 1);
  await page.locator('#o1-read').click();
  await page.locator('#rd-file').setInputFiles(fixture('offer-monthly-annual.pdf'));
  await expect(page.locator('#o1-ctc')).toHaveText('₹8,00,000', { timeout: 20000 });
  await expect(page.locator('#o1-flags')).toContainText('₹2,00,000');
});

test('reads a screenshot of an offer letter on the device (OCR)', async ({ page, isMobile }) => {
  await openOffer(page, isMobile, 1);
  await page.locator('#o1-read').click();
  await page.locator('#rd-file').setInputFiles(fixture('offer-screenshot.png'));
  await expect(page.locator('#o1-ctc')).toHaveText('₹12,00,000', { timeout: 60000 });
  expect(await page.evaluate(() => window.__ctc.S[1].comp.basic)).toBe(540000);
});

test('switches to Hindi and Kannada', async ({ page }) => {
  await page.locator('.langs button[data-lang="hi"]').click();
  await expect(page.locator('#verdict')).toContainText('हर महीने');
  await page.locator('.langs button[data-lang="kn"]').click();
  await expect(page.locator('#verdict')).toContainText('ಪ್ರತಿ ತಿಂಗಳು');
});

test('makes both share-card sizes', async ({ page }) => {
  for (const [f, w, h] of [['45', 1080, 1350], ['169', 1600, 900]]) {
    await page.locator('#o0-share').click();
    await page.locator(`.fmt button[data-f="${f}"]`).click();
    await expect.poll(() => page.evaluate(() => { const i = document.getElementById('sh-img'); return i.naturalWidth + 'x' + i.naturalHeight; })).toBe(`${w}x${h}`);
    await page.locator('#sh-x').click();
  }
});

test('on phones, offers switch with tabs and the page never scrolls sideways', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await expect(page.locator('#o1-sheet')).toBeHidden();
  await page.locator('#tabs button[data-k="1"]').click();
  await expect(page.locator('#o1-sheet')).toBeVisible();
  await expect(page.locator('#o0-sheet')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
