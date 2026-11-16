// 3.1.1: ads are for visitors in the United States only. Checks, with the
// network faked:
// - the Worker's /api/where says yes only for a US visitor, never cached;
// - the app (js/v32-ads.js) and the guide pages (ads.js) load no ad script,
//   place no ad spot and ask no age question unless /api/where said yes;
// - with the publisher id still a placeholder, or in the Play app, nobody is
//   even asked where they are.
// A stand-in publisher id and slot are filled in here only; the files keep
// their placeholders. Needs jsdom: cd tests && npm ci. Then: node tests/ads-where-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readAppHtml } from '../app-file.mjs';
import worker, { adsAllowed } from '../worker/rdydeck-worker.js';

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const FAKE_ID = 'ca-pub-1234567890123456';

// ── The Worker ──
const req = (country, method = 'GET', p = '/api/where') => ({
  url: 'https://rdydeck.com' + p, method, headers: new Headers(), cf: country === undefined ? undefined : { country },
});
for (const [c, want] of [['US', true], ['us', true], ['BR', false], ['DE', false], ['GB', false], ['CA', false], ['PR', false], ['XX', false], ['T1', false], ['', false], [undefined, false]]) {
  ok(adsAllowed(req(c)) === want, `country ${c === undefined ? '(none)' : JSON.stringify(c)}: ads ${want ? 'yes' : 'no'}`);
}
{
  const fake = { url: 'https://rdydeck.com/api/where', method: 'GET', headers: new Headers({ 'CF-IPCountry': 'US' }) };
  ok(adsAllowed(fake) === false, 'a CF-IPCountry header sent by the visitor counts for nothing');
  const r = await worker.fetch(req('US'), {}, { waitUntil() {} });
  ok(r.status === 200 && JSON.stringify(await r.json()) === '{"ads":true}', '/api/where for a US visitor: {"ads":true}');
  ok(/no-store/.test(r.headers.get('Cache-Control') || ''), '/api/where is never cached');
  const r2 = await worker.fetch(req('BR'), {}, { waitUntil() {} });
  ok(JSON.stringify(await r2.json()) === '{"ads":false}', '/api/where for a visitor in Brazil: {"ads":false}');
  const r3 = await worker.fetch(req(undefined), {}, { waitUntil() {} });
  ok(JSON.stringify(await r3.json()) === '{"ads":false}', '/api/where with no country: {"ads":false}');
  const r4 = await worker.fetch(req('US', 'POST'), {}, { waitUntil() {} });
  ok(r4.status !== 200, '/api/where takes only GET and HEAD (POST gets ' + r4.status + ')');
}

// ── The app ──
function appHtml(filled) {
  let html = readAppHtml();
  if (filled) {
    const a = "client: 'ca-pub-XXXXXXXXXXXXXXXX',  // AdSense publisher id, once AdSense approves the site";
    const b = "slots: { home: '', grade: '',";
    if (!html.includes(a) || !html.includes(b)) throw new Error('PT_ADS fill-ins not found');
    html = html.replace(a, `client: '${FAKE_ID}',`).replace(b, "slots: { home: '1111111111', grade: '1111111111',");
  }
  return html;
}
async function openApp({ answer, filled = true, query = '', age = 'adult', online = true }) {
  const asked = []; const errors = []; const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  const dom = new JSDOM(appHtml(filled), {
    url: 'https://rdydeck.com/' + query, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = async (input) => {
        const url = new URL(String(input && input.url || input), 'https://rdydeck.com/');
        if (url.pathname === '/api/where') {
          asked.push(url.pathname);
          if (answer === 'error') throw new TypeError('Failed to fetch');
          if (answer === '404') return new Response('Not found', { status: 404 });
          return new Response(JSON.stringify({ ads: answer === 'US' }), { status: 200 });
        }
        if (url.pathname === '/api/report') return new Response('{"ok":true}', { status: 200 });
        if (url.hostname === 'rdydeck.com') { const f = path.join(ROOT, url.pathname); if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200 }); }
        return new Response('', { status: 404 });
      };
      w.Response = Response;
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      Object.defineProperty(w.navigator, 'onLine', { value: online, configurable: true });
      try { delete w.indexedDB; } catch (_) {}
      w.requestIdleCallback = fn => setTimeout(fn, 0);
      // A returning player who has had the tour, so home is open and nothing else pops up.
      try {
        w.localStorage.setItem('pt_tour_v24', '1');
        w.localStorage.setItem('rd_seen_version', 'v3.1.1');
        if (age) w.localStorage.setItem('pt_age_v32', age);
      } catch (_) {}
      // jsdom has no layout: give elements a width so ad spots can be sized.
      Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 360; }, configurable: true });
      Object.defineProperty(w.HTMLElement.prototype, 'offsetParent', { get() { return null; }, configurable: true });
      w.innerWidth = 390; w.innerHeight = 800;
    },
  });
  const w = dom.window;
  await wait(3600);
  const d = w.document;
  const res = {
    asked: asked.length,
    script: [...d.querySelectorAll('script[src]')].some(s => /googlesyndication|adsbygoogle/.test(s.src)),
    spots: d.querySelectorAll('.ad32, ins.adsbygoogle').length,
    labels: [...d.querySelectorAll('.ad32-lbl')].length,
    ageSheet: !!d.getElementById('age32-in'),
    ageRow: (() => { try { w.openHelpSheet(); } catch (_) {} const r = !!d.getElementById('age32-row'); try { w.closeSheet(); } catch (_) {} return r; })(),
    kept: (() => { try { return w.sessionStorage.getItem('rd_ads_where'); } catch (_) { return null; } })(),
    errors,
  };
  dom.window.close();
  return res;
}

const us = await openApp({ answer: 'US' });
ok(us.asked === 1, 'US visitor: /api/where asked once (' + us.asked + ')');
ok(us.script && us.spots > 0 && us.labels > 0, `US visitor: ad script loads and the home spot shows with its label (${us.spots} spot)`);
ok(us.ageRow, 'US visitor: Age setting row in Help');
ok(us.kept === '1', 'US visitor: answer kept for this visit');
ok(us.errors.length === 0, 'US visitor: no script errors' + (us.errors.length ? ': ' + us.errors.join(' | ') : ''));

const usNew = await openApp({ answer: 'US', age: '' });
ok(usNew.ageSheet, 'US visitor who never answered: the age question is asked');
ok(!usNew.script && usNew.spots === 0, 'US visitor who never answered: no ad until the age answer');

for (const [label, answer] of [['Brazil', 'BR'], ['Germany', 'DE'], ['no answer (old Worker 404)', '404'], ['network error', 'error']]) {
  const r = await openApp({ answer });
  ok(r.asked === 1, `${label}: /api/where asked once`);
  ok(!r.script, `${label}: no ad script`);
  ok(r.spots === 0 && r.labels === 0, `${label}: no ad spot and no Advertisements label`);
  ok(!r.ageRow, `${label}: no Age setting row`);
  ok(r.errors.length === 0, `${label}: no script errors` + (r.errors.length ? ': ' + r.errors.join(' | ') : ''));
}
const outNew = await openApp({ answer: 'BR', age: '' });
ok(!outNew.ageSheet, 'Brazil, never answered: no age question');

const play = await openApp({ answer: 'US', query: '?src=play' });
ok(play.asked === 0 && !play.script && play.spots === 0, 'Play app: not asked, no ad script, no spot');
const plain = await openApp({ answer: 'US', filled: false, age: '' });
ok(plain.asked === 0 && !plain.script && plain.spots === 0 && !plain.ageSheet, 'as shipped (placeholder id): nobody is asked, no ads, no age question');
const off = await openApp({ answer: 'US', online: false });
ok(off.asked === 0 && !off.script, 'offline: not asked, no ads');

// ── The guide pages (ads.js) ──
async function openGuide(answer) {
  const asked = [];
  let js = fs.readFileSync(path.join(ROOT, 'ads.js'), 'utf8')
    .replace("client: 'ca-pub-XXXXXXXXXXXXXXXX',", `client: '${FAKE_ID}',`)
    .replace("slot: '',", "slot: '2222222222',");
  const html = `<!doctype html><html><head></head><body><main><h1>Guide</h1>
    <h2>One</h2><p>a</p><h2>Two</h2><p>b</p><h2>Three</h2><p>c</p><h2>Four</h2><p>d</p></main></body></html>`;
  const dom = new JSDOM(html, {
    url: 'https://rdydeck.com/deck-slowking.html', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.fetch = async (input) => {
        const url = new URL(String(input), 'https://rdydeck.com/');
        if (url.pathname === '/api/where') { asked.push(1); return new Response(JSON.stringify({ ads: answer === 'US' }), { status: 200 }); }
        return new Response('', { status: 404 });
      };
      w.Response = Response;
      Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });
      Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 360; }, configurable: true });
      w.innerWidth = 390; w.innerHeight = 800;
    },
  });
  const s = dom.window.document.createElement('script'); s.textContent = js; dom.window.document.body.appendChild(s);
  await wait(300);
  const d = dom.window.document;
  const r = { asked: asked.length, script: [...d.querySelectorAll('script[src]')].some(x => /adsbygoogle/.test(x.src)), spots: d.querySelectorAll('.ad47').length };
  dom.window.close();
  return r;
}
const gUS = await openGuide('US');
ok(gUS.asked === 1 && gUS.script && gUS.spots > 0, `guide page, US: asked once, ad script and ${gUS.spots} spot`);
const gBR = await openGuide('BR');
ok(gBR.asked === 1 && !gBR.script && gBR.spots === 0, 'guide page, Brazil: no ad script, no spot');

// The shipped files keep their placeholders.
ok(/client: 'ca-pub-XXXXXXXXXXXXXXXX'/.test(fs.readFileSync(path.join(ROOT, 'ads.js'), 'utf8')), 'ads.js still has the placeholder id');
ok(/client: 'ca-pub-XXXXXXXXXXXXXXXX'/.test(fs.readFileSync(path.join(ROOT, 'js/v32-ads.js'), 'utf8')), 'js/v32-ads.js still has the placeholder id');
for (const f of ['js/v32-ads.js', 'ads.js', 'worker/rdydeck-worker.js', 'privacy.html', 'terms.html']) {
  ok(!/[–—]/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `no em or en dashes in ${f}`);
}

if (fails) { console.error(`\n${fails} failed.`); process.exit(1); }
console.log('\nAds US only check passed.');
