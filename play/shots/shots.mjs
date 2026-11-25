// Play Store screenshots of the live site (Play mode, no ads), three sizes at 2x.
// Run on GitHub Actions: node play/shots/shots.mjs. Writes play/shots/out/<size>-<name>.png.
import puppeteer from 'puppeteer';
import fs from 'fs';

const OUT = 'play/shots/out';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'https://rdydeck.com/?src=play';
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const TAB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SIZES = { phone: [540, 960, PHONE_UA], tablet7: [603, 1072, TAB_UA], tablet10: [810, 1440, TAB_UA] };
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(SIZES);
const STARTERS = ['dragapult', 'slowking', 'honchkrow', 'alakazam'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const L = (...a) => { const s = a.join(' '); console.log(s); log.push(s); };

async function settle(page, ms = 1500) {
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 20000 }).catch(() => {});
  await page.evaluate(async () => {
    const imgs = [...document.images].filter(i => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; });
    await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 8000); })));
  }).catch(() => {});
  await sleep(ms);
}
async function tidy(page) {
  await page.evaluate(() => {
    const t = document.getElementById('toast'); if (t) { t.classList.remove('show'); t.textContent = ''; }
  }).catch(() => {});
}
async function top(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('.review-body, .screen, #x-modal-inner, .modal').forEach(e => { try { e.scrollTop = 0; } catch (_) {} });
  });
}
async function shot(page, size, name) {
  await tidy(page);
  await sleep(300);
  const f = `${OUT}/${size}-${name}.png`;
  await page.screenshot({ path: f });
  L('shot', f);
}
async function scrollToText(page, sel, re) {
  return page.evaluate((sel, src) => {
    const re = new RegExp(src, 'i');
    const el = [...document.querySelectorAll(sel)].find(e => e.offsetParent && re.test(e.textContent));
    if (!el) return false;
    el.scrollIntoView({ block: 'start' });
    // leave a little room above
    const sc = el.closest('.review-body') || document.scrollingElement;
    try { sc.scrollTop -= 12; } catch (_) {}
    return true;
  }, sel, re);
}
async function step(name, fn) {
  try { await fn(); } catch (e) { L('FAIL', name, String(e && e.message || e)); }
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
for (const size of only) {
  const [w, h, ua] = SIZES[size];
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') log.push(`[${size} console] ${m.text()}`); });
  page.on('pageerror', e => log.push(`[${size} pageerror] ${e.message}`));
  await page.setUserAgent(ua);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem('pt_tour_v24', 'done');
    localStorage.setItem('rd_seen_version', typeof PT_VERSION !== 'undefined' ? PT_VERSION : '');
    localStorage.setItem('pt_age_v32', 'adult');
    localStorage.setItem('rd_lang', 'en');
  });
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await settle(page, 2000);
  L(size, 'version', await page.evaluate(() => typeof PT_VERSION !== 'undefined' ? PT_VERSION : '?'));
  await shot(page, size, 'z-first-open');

  await step('starters', async () => {
    for (const id of STARTERS) {
      await page.evaluate(async id => { await loadStarterDeck(id); }, id);
      await settle(page, 500);
    }
    await page.evaluate(async () => {
      for (const d of state.decks) { try { if (deckNeedsData(d)) await refreshDeckData(d); } catch (_) {} }
    });
    const left = await page.evaluate(() => state.decks.filter(d => deckNeedsData(d)).map(d => d.name));
    L(size, 'decks', await page.evaluate(() => state.decks.map(d => d.name).join(' | ')), 'need data:', left.join(',') || 'none');
    await page.evaluate(() => { closeSheet(); showScreen('home'); renderHome(); });
    await settle(page, 2500);
  });

  await step('home', async () => { await top(page); await shot(page, size, 'home'); });
  await step('topdecks', async () => {
    await page.evaluate(() => { const e = document.getElementById('td90'); if (e) e.scrollIntoView({ block: 'start' }); });
    await settle(page, 800);
    await shot(page, size, 'home-topdecks');
    const id = await page.evaluate(() => { const b = document.querySelector('.td91-open'); const m = b && b.getAttribute('onclick').match(/td91Open\('([^']+)'/); return m && m[1]; });
    if (id) {
      await page.evaluate(id => { td91Open(id); }, id);
      await sleep(1500); await settle(page, 4000);
      await shot(page, size, 'quickadd-' + id);
      await page.evaluate(() => closeSheet());
    }
    await top(page);
  });

  const ids = await page.evaluate(() => state.decks.map(d => [d.id, d.starter || d.name]));
  for (const [deckId, tag] of ids) {
    await step('grade ' + tag, async () => {
      await page.evaluate(id => { openReview(id); showReviewTab('grade'); }, deckId);
      await settle(page, 3500);
      await top(page);
      await settle(page, 500);
      await shot(page, size, 'grade-' + tag);
      if (await scrollToText(page, '#grade-body h3, #grade-body .section-title, #grade-body div, #grade-body summary', '^\\s*Fix First|^\\s*Fix first')) {
        await settle(page, 600); await shot(page, size, 'grade-fix-' + tag);
      }
    });
  }
  const drag = ids.find(x => x[1] === 'dragapult');
  if (drag) {
    await step('odds', async () => {
      await page.evaluate(id => { openReview(id); showReviewTab('odds'); }, drag[0]);
      await settle(page, 3000); await top(page); await shot(page, size, 'odds');
      if (await scrollToText(page, '#odds-body .ol-sec', 'Ask the Odds|Ask the odds')) { await settle(page, 800); await shot(page, size, 'odds-ask'); }
    });
    await step('hand', async () => {
      await page.evaluate(id => { openReview(id); const p = document.getElementById('rv-tab-practice'); if (p) p.click(); showReviewTab('hand'); }, drag[0]);
      await settle(page, 3000); await top(page); await shot(page, size, 'hand');
    });
    await step('share', async () => {
      await page.evaluate(id => { openReview(id); showReviewTab('grade'); }, drag[0]);
      await settle(page, 1500);
      await page.evaluate(() => { v45ShareGrade(); });
      await page.waitForFunction(() => { const b = document.getElementById('gs261-save'); return b && !b.disabled; }, { timeout: 30000 }).catch(() => L(size, 'share image not ready'));
      await settle(page, 2000); await shot(page, size, 'share');
      await page.evaluate(() => closeSheet());
    });
  }
  await step('quickest win', async () => {
    await page.evaluate(() => { closeSheet(); showScreen('home'); renderHome(); });
    await page.evaluate(() => { openPuzzle(); });
    await sleep(1500); await settle(page, 4000); await shot(page, size, 'quickest-win');
  });
  await step('prize check', async () => {
    await page.evaluate(() => { closeSheet(); showScreen('home'); renderHome(); });
    await page.evaluate(() => { startDaily(); });
    await sleep(1500); await settle(page, 4000); await shot(page, size, 'prize-check');
  });
  await step('gtg', async () => {
    await page.evaluate(() => { closeSheet(); showScreen('home'); renderHome(); });
    await page.evaluate(() => { openGtg(); });
    await sleep(1500); await settle(page, 4000); await shot(page, size, 'guess');
  });
  await page.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/log.txt`, log.join('\n') + '\n');
