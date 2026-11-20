// Screenshots of Guess the Grade at phone and desktop sizes, dark and light. Run in GitHub Actions
// against the branch served on 127.0.0.1:8080. Not part of the site.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8080/';
const OUT = process.argv[3] || 'out';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const log = [];
async function run(name, size, theme, mobile) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  await ctx.addInitScript(t => {
    try { localStorage.setItem('ptcg_theme', t); localStorage.setItem('pt_tour_v24', '1'); localStorage.setItem('rd_seen_version', 'v3.4.18'); } catch (_) {}
  }, theme);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  const clear = () => p.evaluate(() => { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); });
  await clear();
  // Starter decks so home looks lived in.
  await p.evaluate(() => { const c = document.getElementById('gtg-card'); if (c) c.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${name}-1-home.png` });
  await p.evaluate(() => openGtg());
  await p.waitForSelector('#gtg-play .gtg-in', { timeout: 90000 }).catch(() => log.push(name + ': game did not open'));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/${name}-2-start.png` });
  const ans = await p.evaluate(() => gtgStore().results[dailyKey()].ans);
  await p.evaluate(a => { const f = v => Math.round(v * 10) / 10; gtgSet(a >= 9 ? f(a - 0.8) : f(a + 0.8)); gtgGuess(); gtgSet(a >= 9 ? f(a - 0.3) : f(a + 0.3)); gtgGuess(); }, ans);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${name}-3-two-guesses.png` });
  await p.evaluate(a => { gtgSet(a); gtgGuess(); }, ans);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${name}-4-won.png` });
  await p.evaluate(() => closeSheet());
  await p.evaluate(() => { const c = document.getElementById('gtg-card'); if (c) c.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/${name}-5-home-after.png` });
  await p.goto(BASE + '#guess', { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}/${name}-6-shared-link.png` });
  const share = await p.evaluate(() => { const k = dailyKey(); return gtgShareText(gtgStore().results[k], k); });
  log.push(`${name}: answer ${ans}, list ${await p.evaluate(() => gtgPick(dailyKey()).name)}, share ${JSON.stringify(share)}, errors ${errs.length ? errs.join(' | ') : 'none'}`);
  await ctx.close();
}
await run('phone-dark', { width: 390, height: 844 }, 'dark', true);
await run('phone-light', { width: 390, height: 844 }, 'light', true);
await run('desktop-dark', { width: 1366, height: 900 }, 'dark', false);
await run('desktop-light', { width: 1366, height: 900 }, 'light', false);
// Spanish, to see the longest words fit.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('ptcg_theme', 'dark'); localStorage.setItem('pt_tour_v24', '1'); localStorage.setItem('rd_seen_version', 'v3.4.18'); localStorage.setItem('rd_lang', 'de'); } catch (_) {} });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  await p.evaluate(() => { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); openGtg(); });
  await p.waitForSelector('#gtg-play .gtg-in', { timeout: 90000 }).catch(() => {});
  const ans = await p.evaluate(() => gtgStore().results[dailyKey()].ans);
  await p.evaluate(a => { const f = v => Math.round(v * 10) / 10; gtgSet(f(a + 0.1 > 10 ? a - 0.1 : a + 0.1)); gtgGuess(); }, ans);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/phone-de-hot.png` });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/run.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
await browser.close();
