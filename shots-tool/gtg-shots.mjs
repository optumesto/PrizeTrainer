// Temporary: home with both daily games, phone and desktop. Not part of the site.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const log = [];
async function run(name, size, theme, mobile) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  await ctx.addInitScript(t => { try { localStorage.setItem('ptcg_theme', t); localStorage.setItem('pt_tour_v24', '1'); localStorage.setItem('rd_seen_version', 'v3.4.20'); } catch (_) {} }, theme);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  await p.evaluate(() => document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')));
  if (mobile) await p.evaluate(() => { const c = document.getElementById('rp-card'); if (c) c.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${name}-home.png`, fullPage: !mobile });
  await p.evaluate(() => openGtg());
  await p.waitForSelector('#gtg-play .gtg-in', { timeout: 90000 }).catch(() => log.push(name + ': game did not open'));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/${name}-game.png` });
  const boxes = await p.evaluate(() => ['puzzle-card','rp-card','gtg-card'].map(id => { const r = document.getElementById(id)?.getBoundingClientRect(); return id + ':' + (r ? [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)].join(',') : 'none'); }).join(' '));
  log.push(`${name}: ${boxes}; errors ${errs.length ? errs.join(' | ') : 'none'}`);
  await ctx.close();
}
await run('phone-dark', { width: 390, height: 844 }, 'dark', true);
await run('phone-light', { width: 390, height: 844 }, 'light', true);
await run('desktop-dark', { width: 1366, height: 900 }, 'dark', false);
fs.writeFileSync(`${OUT}/run.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
await browser.close();
