// Test-branch only: screenshots of the goldfish and daily puzzle boards, for review.
// Usage: node shoot.mjs <baseUrl> <outDir> <label>
import { chromium } from 'playwright-core';
import fs from 'fs';
const [base, out, label] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const sizes = [['phone', 390, 844], ['desktop', 1280, 900]];
const seed = `(() => { let a = 1234567; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();`;
const hideCss = `.toast, #toast, .modal-overlay.active:not(#xx) { display:none !important; } .review-footer { display:none !important; }`;
const log = m => console.log(`[${label}] ${m}`);
async function prep(page, theme) {
  await page.addInitScript(({ theme }) => {
    try { localStorage.setItem('pt_tour_v24', 'done'); localStorage.setItem('ptcg_theme', theme); } catch (_) {}
  }, { theme });
  await page.addInitScript(seed);
}
for (const theme of ['dark', 'light']) {
  for (const [nm, w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.on('pageerror', e => log('pageerror ' + e.message));
    await prep(page, theme);
    await page.goto(base + '/index.html', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    // Daily puzzle
    try {
      await page.evaluate(() => openPuzzle());
      await page.waitForSelector('#pz-body .pz-wrap, #pz-body .pz-mat, #pz-body > *', { timeout: 20000 });
      await page.waitForTimeout(3000);
      await page.addStyleTag({ content: hideCss });
      await page.screenshot({ path: `${out}/${label}-puzzle-${nm}-${theme}.png`, fullPage: true });
      log('puzzle ' + nm + ' ' + theme);
    } catch (e) { log('puzzle failed ' + e.message); }
    // Goldfish: load a starter deck, set up, start turn 1, attach an Energy.
    try {
      await page.evaluate(() => { showScreen('home'); });
      await page.evaluate(async () => { await loadStarterDeck(STARTER_DECKS[0].id); });
      await page.waitForTimeout(6000);
      await page.evaluate(() => { const d = state.decks[state.decks.length - 1]; openReview(d.id); showReviewTab('hand'); setHandMode('gold'); });
      await page.waitForTimeout(2500);
      await page.evaluate(async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const clickBtn = re => { const b = [...document.querySelectorAll('#hand-body .gf-hand-acts button:not([disabled])')].find(x => re.test(x.textContent)); if (b) { b.click(); return true; } return false; };
        for (let k = 0; k < 30 && gf.hand.filter(x => gfIsBasic(x)).length < 3; k++) gfDeal(true);
        for (let k = 0; k < 7; k++) {
          const basics = gf.hand.filter(x => gfIsBasic(x));
          if (!basics.length || gf.bench.length >= 3) break;
          gfSelect(basics[0].uid); await wait(150);
          if (!clickBtn(/Active|Bench/)) break; await wait(200);
        }
        document.getElementById('gf-next').click(); await wait(500);
        const en = gf.hand.find(x => cardCategory(x.card) === 'energy');
        if (en) { gfSelect(en.uid); await wait(150); clickBtn(/Attach|Active/); await wait(300); }
        gf.sel = null; gf.selMon = null; renderHand();
      });
      await page.waitForTimeout(2500);
      await page.addStyleTag({ content: hideCss });
      await page.screenshot({ path: `${out}/${label}-goldfish-${nm}-${theme}.png`, fullPage: true });
      log('goldfish ' + nm + ' ' + theme);
    } catch (e) { log('goldfish failed ' + e.message); }
    await ctx.close();
  }
}
await browser.close();
