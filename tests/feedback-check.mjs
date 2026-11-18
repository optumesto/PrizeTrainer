// 3.3.x: checks Send feedback (js/feedback-send.js) in jsdom with the network faked, and the
// Worker's /api/feedback pieces: a sent message says so; a failure keeps the text and shows
// Send by email and Copy message; an empty message is not sent; only the listed fields go out;
// the email the Worker builds; the route refuses other sites and answers 503 with no binding.
// Needs jsdom from the grade check: cd tests && npm ci. Then: node tests/feedback-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readAppHtml } from '../app-file.mjs';
import worker, { cleanFeedback, feedbackMime } from '../worker/rdydeck-worker.js';

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const tick = ms => new Promise(r => setTimeout(r, ms));

const posts = []; let answer = { status: 200, body: '{"ok":true}' };
function app(url) {
  const errors = []; const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  const dom = new JSDOM(readAppHtml(), {
    url, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36', configurable: true });
      w.navigator.sendBeacon = undefined;
      w.fetch = async (input, init) => {
        const u = new URL(String(input && input.url || input), url);
        if (u.pathname === '/api/feedback') { posts.push(JSON.parse(init.body)); if (answer.status === 0) throw new TypeError('Failed to fetch'); return new Response(answer.body, { status: answer.status }); }
        if (u.pathname === '/api/report') return new Response('{"ok":true}', { status: 200 });
        const f = path.join(ROOT, u.pathname); if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200 });
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
  return { w: dom.window, d: dom.window.document, errors };
}

const { w, d, errors } = app('https://rdydeck.com/');
await tick(3500);
ok(errors.length === 0, 'app starts with no errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
w.eval(`state.decks.push({ id: 'fb-test', name: 'Test deck', cards: [{ name: 'Pikachu', count: 4, set: 'SVI', number: '1' }], history: [] }); state.activeDeckId = 'fb-test';`);

const open = () => { w.closeSheet(); w.openFeedback(); };
const status = () => (d.getElementById('fb-status') || {}).textContent || '';
const waysShown = () => { const e = d.getElementById('fb-ways'); return !!e && e.style.display !== 'none'; };

// Empty message: nothing goes out.
open(); await w.sendFeedback(); await tick(20);
ok(posts.length === 0 && /Write a few words/.test(status()), 'an empty message is not sent and says why');

// Sent.
d.getElementById('fb-text').value = 'The grade froze on my tablet';
d.getElementById('fb-deck').checked = true;
await w.sendFeedback(); await tick(20);
ok(posts.length === 1, 'one message is posted');
const p = posts[0] || {};
ok(p.text === 'The grade froze on my tablet' && p.kind === 'Bug' && /Pikachu/.test(p.deck) && p.device === 'Windows', 'the text, kind, ticked deck and device go out');
ok(Object.keys(p).sort().join(',') === 'build,deck,deckName,device,kind,lang,play,screen,text,v,website,width', 'only the listed fields go out: ' + Object.keys(p).sort().join(','));
ok(/Thanks, it's sent/.test(d.getElementById('x-modal-inner').textContent), 'a sent message says so');

// Server off (503): text kept, two ways out.
answer = { status: 503, body: '{"ok":false,"why":"off"}' };
open(); d.getElementById('fb-text').value = 'Missing Iono'; await w.sendFeedback(); await tick(20);
ok(/didn't send/.test(status()) && waysShown(), 'a failure says so and shows Send by email and Copy message');
ok(d.getElementById('fb-text') && d.getElementById('fb-text').value === 'Missing Iono', 'the message is kept after a failure');
const href = d.getElementById('fb-mail').getAttribute('href');
ok(/^mailto:support@rdydeck\.com\?subject=/.test(href) && /Missing%20Iono/.test(href), 'Send by email is a real mail link with the message in it');
ok(d.getElementById('fb-send').textContent === 'Try again' && !d.getElementById('fb-send').disabled, 'the Send button turns into Try again');
d.getElementById('fb-text').value = 'Missing Iono and Arven'; d.getElementById('fb-text').dispatchEvent(new w.Event('input', { bubbles: true }));
ok(/Arven/.test(d.getElementById('fb-mail').getAttribute('href')), 'the mail link follows edits');

// No network, and too many.
answer = { status: 0 };
open(); d.getElementById('fb-text').value = 'x'; await w.sendFeedback(); await tick(20);
ok(/didn't send/.test(status()) && waysShown(), 'a network failure says so');
answer = { status: 429, body: '{"ok":false,"why":"busy"}' };
open(); d.getElementById('fb-text').value = 'x'; await w.sendFeedback(); await tick(20);
ok(/Too many messages/.test(status()), 'too many messages says wait a minute');

// Spanish: the new lines are translated.
{
  await w.i18nPick('es'); await tick(300); open(); await tick(300);
  ok(/directamente/.test(d.getElementById('x-modal-inner').textContent), 'the sheet is in Spanish when Spanish is picked');
  d.getElementById('fb-text').value = 'x'; answer = { status: 503, body: '{}' }; await w.sendFeedback(); await tick(300);
  ok(/No se envió/.test(status()) && /Enviar por correo/.test(d.getElementById('fb-mail').textContent), 'the failure line and buttons are in Spanish');
  await w.i18nPick('en'); await tick(300);
}

// The one-file download or github.io copy: no server, so the two ways out show at once.
const off = app('https://optumesto.github.io/PrizeTrainer/');
await tick(3500);
const before = posts.length;
off.w.openFeedback(); off.d.getElementById('fb-text').value = 'hello'; await off.w.sendFeedback(); await tick(20);
ok(posts.length === before && off.d.getElementById('fb-ways').style.display !== 'none', 'off rdydeck.com nothing is posted and the email way shows');

// Worker pieces.
ok(cleanFeedback({ text: '   ' }) === null && cleanFeedback({ text: 'hi', website: 'x' }) === null, 'empty text and bot field are refused');
const f = cleanFeedback({ kind: 'Idea', text: 'Add a dark board\u0007', v: 'v3.3.7', build: 126, screen: 'home', device: 'Android', width: 412, lang: 'es', extra: 'dropped' });
ok(f && f.text === 'Add a dark board' && !('extra' in f), 'control characters and unknown fields are dropped');
const mime = feedbackMime(f, 'feedback@rdydeck.com', 'owner@example.com', 'id1', new Date('2026-11-18T12:00:00Z'));
ok(/^From: "RdyDeck feedback" <feedback@rdydeck\.com>\r\nTo: <owner@example\.com>\r\nSubject: =\?UTF-8\?B\?/.test(mime) && /Message-ID: <id1@rdydeck\.com>/.test(mime), 'the email has From, To, Subject and Message-ID');
const body = Buffer.from(mime.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8');
ok(/Add a dark board/.test(body) && /App version: v3\.3\.7 \(build 126\)/.test(body) && /cannot be answered by replying/.test(body), 'the email body holds the message and the app details');
const req = (origin, body) => new Request('https://rdydeck.com/api/feedback', { method: 'POST', headers: origin ? { Origin: origin, 'Content-Type': 'application/json' } : {}, body: JSON.stringify(body) });
let r = await worker.fetch(req('https://evil.example', { text: 'hi' }), {}, {});
ok(r.status === 403, 'other sites are refused');
r = await worker.fetch(req('https://rdydeck.com', { text: 'hi' }), {}, {});
ok(r.status === 503, 'with no email binding the route answers 503, so the app offers email');
let sent = null;
r = await worker.fetch(req('https://rdydeck.com', { text: '' }), { FEEDBACK: { send: m => { sent = m; } }, FEEDBACK_TO: 'owner@example.com' }, {});
ok(r.status === 400 && !sent, 'an empty message is refused by the Worker');

console.log(fails ? `\n${fails} FAILED` : '\nall feedback checks passed');
process.exit(fails ? 1 : 0);
