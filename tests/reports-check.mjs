// 3.0: checks the anonymous error reports (js/report-errors.js) and the
// "this grade looks off" button (js/grade-flag.js) in jsdom, with the network
// faked: what a report holds, that nothing private goes out, the 5 per page cap,
// the Settings switch, and that the Worker refuses repo files.
// Needs jsdom from the grade check: cd tests && npm ci. Then: node tests/reports-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readAppHtml } from '../app-file.mjs';
import { isBlocked } from '../worker/rdydeck-worker.js';

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const posts = [];
const errors = []; const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
const dom = new JSDOM(readAppHtml(), {
  url: 'https://rdydeck.com/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36', configurable: true });
    w.navigator.sendBeacon = undefined;
    w.fetch = async (input, init) => {
      const url = new URL(String(input && input.url || input), 'https://rdydeck.com/');
      if (url.pathname === '/api/report') { posts.push(JSON.parse(init.body)); return new Response('{"ok":true}', { status: 200 }); }
      if (url.hostname === 'rdydeck.com') { const f = path.join(ROOT, url.pathname); if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200 }); }
      return new Response('', { status: 404 });
    };
    w.Response = Response;
    w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
    w.HTMLCanvasElement.prototype.getContext = () => null;
    Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });
    try { delete w.indexedDB; } catch (_) {}
    w.requestIdleCallback = fn => setTimeout(fn, 0);
  },
});
const w = dom.window, d = w.document;
await new Promise(r => setTimeout(r, 3500));
ok(errors.length === 0, 'app starts with no errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
ok(typeof w.rdReportPost === 'function' && w.rdReportsOn(), 'reports are on for rdydeck.com');

// An error with private looking text in it.
function boom(msg) {
  const e = new w.Error(msg);
  e.stack = `Error: ${msg}\n    at renderGrade (https://rdydeck.com/js/core.js?v=56b9082e:3061:11)\n    at chrome-extension://abc/x.js:1:1\n    at https://rdydeck.com/js/v29-rotation.js?v=5:420:3`;
  w.dispatchEvent(new w.ErrorEvent('error', { message: 'Uncaught Error: ' + msg, error: e }));
}
boom('Cannot read "Dragapult ex" for mason@example.com in deck 123456789');
await new Promise(r => setTimeout(r, 50));
const p = posts.find(x => x.kind === 'error');
ok(!!p, 'an error is reported');
if (p) {
  ok(!/Dragapult|mason|example\.com|123456789/.test(JSON.stringify(p)), 'quoted text, emails and long numbers are taken out: ' + p.msg);
  ok(p.stack === 'at renderGrade (js/core.js:3061:11)\nat ? (js/v29-rotation.js:420:3)', 'stack keeps only app files, no query or extension frames: ' + JSON.stringify(p.stack));
  ok(p.br === 'Chrome' && p.os === 'Android' && /^v\d/.test(p.v) && /^home/.test(p.page), `browser ${p.br}, system ${p.os}, version ${p.v}, screen ${p.page}`);
  const keys = Object.keys(p).sort().join(',');
  ok(keys === 'br,kind,msg,os,page,play,stack,v', 'only the listed fields go out: ' + keys);
}
boom('Cannot read "Dragapult ex" for mason@example.com in deck 123456789');
await new Promise(r => setTimeout(r, 50));
ok(posts.filter(x => x.kind === 'error').length === 1, 'the same error is sent once per page load');
for (let i = 0; i < 8; i++) boom('different ' + 'abcdefgh'[i]);
await new Promise(r => setTimeout(r, 50));
ok(posts.filter(x => x.kind === 'error').length === 5, 'at most 5 errors per page load');
w.dispatchEvent(new w.ErrorEvent('error', { message: 'Script error.' }));

// "This grade looks off": with a stand-in grade.
w.eval(`state.decks.push({ id: 'gf-test', name: 'My secret deck name', cards: [], history: [] }); state.activeDeckId = 'gf-test';
  g29Grade = () => ({ overall: 7.34 });`);
d.getElementById('grade-body') || d.body.insertAdjacentHTML('beforeend', '<div id="grade-body"></div>');
d.getElementById('grade-body').innerHTML = '<div class="g45-share"><button>Share grade</button></div>';
w.eval(`state.activeDeckId = 'none'`); w.renderGrade(); w.eval(`state.activeDeckId = 'gf-test'`);
const btn = d.querySelector('#grade-body .gf80-btn');
ok(!!btn && btn.textContent === 'This grade looks off?', 'the button sits next to Share grade');
w.gf80Open();
const opts = [...d.querySelectorAll('#x-modal-inner .gf80-opt')].map(b => b.textContent);
ok(opts.length === 5 && !d.querySelector('#x-modal-inner input, #x-modal-inner textarea'), 'five preset reasons and no text box: ' + opts.join(' / '));
await w.gf80Send('too-high');
const f = posts.find(x => x.kind === 'flag');
ok(!!f && f.reason === 'too-high' && f.grade === 7.3 && f.arch === 'Unmatched', 'flag sent: ' + JSON.stringify(f));
ok(f && !/secret/.test(JSON.stringify(f)) && Object.keys(f).sort().join(',') === 'arch,grade,kind,reason,v', 'the flag carries no deck name or list');
const n = posts.length; await w.gf80Send('too-low');
ok(posts.length === n, 'one flag per deck and grade on this device');

// Settings switch.
w.openSettings();
ok(!!d.getElementById('st80-rep'), 'Settings shows the error reports switch');
w.st80Rep(false);
ok(!w.rdReportsOn() && w.localStorage.getItem('rd_reports') === 'off', 'switching off stops reports');
const before = posts.length; boom('after switch off'); await new Promise(r => setTimeout(r, 50));
ok(posts.length === before, 'nothing is sent while off');
w.st80Rep(true);
ok(w.rdReportsOn(), 'switching on again works');

// The Worker: repo files are refused, site files are served.
for (const u of ['/CHANGES.md', '/refresh-data.mjs', '/tests/grade-check.mjs', '/.github/workflows/grade-check.yml', '/puzzle/tools/make-daily.mjs', '/puzzle/test/run.js', '/worker/rdydeck-worker.js', '/i18n-notes.md', '/README.md'])
  ok(isBlocked(u), 'Worker refuses ' + u);
for (const u of ['/', '/index.html', '/js/core.js', '/.well-known/assetlinks.json', '/sitemap.xml', '/ads.txt', '/ads.js', '/llms.txt', '/robots.txt', '/deck-slowking.html', '/data.json', '/cards.json', '/puzzle/engine.js', '/puzzle/daily.json', '/LICENSE', '/sw.js', '/manifest.json'])
  ok(!isBlocked(u), 'Worker serves ' + u);

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
