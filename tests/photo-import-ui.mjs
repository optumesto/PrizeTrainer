// Drives photo deck import in a real browser: opens the import box, picks a test screenshot,
// waits for the review sheet, fixes a card, uses the list, and saves pictures of each step
// (dark and light, English and Spanish) for a look at how it reads on a phone.
//
// Usage: node tests/photo-import-ui.mjs <site url> <screenshot file> <out dir>
// Needs playwright with Chromium. Run by .github/workflows/art-index.yml.
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [URL0 = 'http://127.0.0.1:8080/', SHOT, OUT = 'ui-shots'] = process.argv.slice(2);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const log = [];
let failed = false;

async function run(lang, theme) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(([l, t]) => { try { localStorage.setItem('rd_lang', l); localStorage.setItem('ptcg_theme', t); } catch (_) {} }, [lang, theme]);
  await page.goto(URL0, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const tag = `${lang}-${theme}`;
  await page.evaluate(() => { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); openImportModal(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-1-import-box.jpg`, type: 'jpeg', quality: 62 });
  const t0 = Date.now();
  await page.setInputFiles('#photo-file', SHOT);
  try {
    await page.waitForSelector('#photo-modal[data-state="list"], #photo-modal[data-state="error"]', { timeout: 90000 });
  } catch (e) { failed = true; log.push(`${tag}: no review sheet (${e.message.split('\n')[0]})`); await page.screenshot({ path: `${OUT}/${tag}-x-stuck.jpg`, type: 'jpeg', quality: 62 }); await ctx.close(); return; }
  const ms = Date.now() - t0;
  const st = await page.getAttribute('#photo-modal', 'data-state');
  await page.screenshot({ path: `${OUT}/${tag}-2-review.jpg`, type: 'jpeg', quality: 62 });
  await page.screenshot({ path: `${OUT}/${tag}-2-review-full.jpg`, type: 'jpeg', quality: 62, fullPage: true });
  const info = await page.evaluate(() => ({ total: document.getElementById('pi-total').textContent, check: document.getElementById('pi-check').textContent, rows: document.querySelectorAll('.pi-row').length, msg: document.getElementById('pi-msg').textContent }));
  log.push(`${tag}: state ${st}, ${info.rows} rows, "${info.total}", "${info.check}" ${info.msg} in ${ms} ms`);
  if (st !== 'list') { failed = true; await ctx.close(); return; }
  // Change the first card through search.
  await page.evaluate(() => document.querySelector('.pi-row .pi-change').click());
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${tag}-3-change.jpg`, type: 'jpeg', quality: 62 });
  await page.fill('#pi-q', 'iono');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${tag}-4-search.jpg`, type: 'jpeg', quality: 62 });
  await page.evaluate(() => { const b = document.querySelector('#pi-found .pi-opt'); if (b) b.click(); else document.getElementById('pi-change-x').click(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = document.querySelector('.pi-row [data-act="plus"]'); if (b) b.click(); });
  await page.evaluate(() => document.getElementById('pi-use').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}-5-import-filled.jpg`, type: 'jpeg', quality: 62 });
  const list = await page.inputValue('#import-list');
  const prev = await page.textContent('#parse-preview');
  log.push(`${tag}: import box ${list.split('\n').length} lines; preview "${prev}"`);
  if (lang === 'en' && theme === 'dark') await writeFile(`${OUT}/list.txt`, list);
  if (errs.length) { failed = true; log.push(`${tag}: page errors: ${errs.join(' | ')}`); }
  await ctx.close();
}

for (const [l, t] of [['en', 'dark'], ['en', 'light'], ['es', 'dark'], ['pt', 'light'], ['fr', 'dark'], ['de', 'dark'], ['it', 'light']]) await run(l, t);
await browser.close();
console.log(log.join('\n'));
await writeFile(`${OUT}/log.txt`, log.join('\n') + '\n');
if (failed) process.exitCode = 1;
