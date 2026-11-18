// Rare Candy finds the Basic under every Stage 2, also with no Stage 1 in the list, in Goldfish and the Turn 1 line.
// Needs jsdom: cd tests && npm ci. Then: node tests/rare-candy-check.cjs
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const { JSDOM, VirtualConsole, ResourceLoader } = require(path.join(ROOT, 'tests', 'node_modules', 'jsdom'));
const local = u => { const url = new URL(String(u && u.url || u), 'https://rdydeck.com/'); const f = path.join(ROOT, url.pathname); return url.hostname === 'rdydeck.com' && fs.existsSync(f) ? fs.readFileSync(f) : null; };
class Local extends ResourceLoader { fetch(u) { return Promise.resolve(local(u) || Buffer.from('')); } }
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const P = (name, stage, from, o) => Object.assign({ name, count: 3, supertype: 'Pokémon', section: 'pokemon', stage, evolvesFrom: from || undefined, hp: 100, types: ['fire'] }, o);
const CARDS = [
  P('Torchic', 'basic'), P('Blaziken ex', 'stage2', 'Combusken'),
  P('Dreepy', 'basic'), P('Drakloak', 'stage1', 'Dreepy'), P('Dragapult ex', 'stage2', 'Drakloak'),
  P('Abra', 'basic'), P('Alakazam', 'stage2', 'Kadabra', { base: 'abra' }),
  { name: 'Rare Candy', count: 4, supertype: 'Trainer', section: 'trainer', sub: ['item'], provides: ['evolution_access'] },
  { name: 'Basic Fire Energy', count: 30, supertype: 'Energy', section: 'energy' },
];
(async () => {
  const errors = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), { url: 'https://rdydeck.com/', runScripts: 'dangerously', resources: new Local(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = async u => { const b = local(u); return b ? new Response(b, { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }); };
      w.Response = Response; w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.scrollBy = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {}; w.HTMLCanvasElement.prototype.getContext = () => null;
      try { delete w.indexedDB; } catch (_) {} w.requestIdleCallback = fn => setTimeout(fn, 0);
    } });
  const w = dom.window;
  await new Promise(r => setTimeout(r, 3500));
  w.__cards = CARDS;
  w.eval("r273From('Combusken')"); await new Promise(r => setTimeout(r, 1500)); // the saved list of Standard cards loads once
  ok(w.eval("r273From('Combusken')").toLowerCase() === 'torchic', 'card data: Combusken evolves from Torchic');
  const basicOf = n => w.eval(`(() => { const G = simGroups(window.__cards); const i = G.findIndex(g => g.name === ${JSON.stringify(n)}); const L = handLineFor(G, i); return L.basic >= 0 ? G[L.basic].name : ''; })()`);
  ok(basicOf('Blaziken ex') === 'Torchic', 'Blaziken ex with no Combusken in the list grows from Torchic: ' + basicOf('Blaziken ex'));
  ok(basicOf('Dragapult ex') === 'Dreepy', 'Dragapult ex through Drakloak grows from Dreepy');
  ok(basicOf('Alakazam') === 'Abra', 'a Stage 2 whose Basic was read with it (Alakazam) grows from Abra');
  // Goldfish: on turn 2, Rare Candy offers both Stage 2s onto Basics that came in on turn 1.
  w.eval(`(() => { state.decks.push({ id: 'rc', name: 'Candy', cards: window.__cards }); state.activeDeckId = 'rc'; showScreen('review'); showReviewTab('hand'); setHandMode('gold'); gfDeal(false);
    const all = gf.hand.concat(gf.deck, gf.prizes); const take = n => all.splice(all.findIndex(x => x.card.name === n), 1)[0];
    gf.hand = ['Torchic', 'Dreepy', 'Abra', 'Rare Candy', 'Blaziken ex', 'Dragapult ex', 'Alakazam'].map(take); gf.deck = all.slice(6); gf.prizes = all.slice(0, 6);
    gf.active = null; gf.bench = []; gf.turn = 0; gf.turnOver = false; renderHand(); })()`);
  const uid = n => w.eval(`gf.hand.find(x => x.card.name === ${JSON.stringify(n)}).uid`);
  w.gfPlayBasic(uid('Abra'), 'active'); w.gfEndTurn();
  w.gfPlayBasic(uid('Torchic'), 'bench'); w.gfPlayBasic(uid('Dreepy'), 'bench'); w.gfEndTurn();
  const labels = w.eval(`gfActions(gf.hand.find(x => x.card.name === 'Rare Candy')).filter(a => !a.off).map(a => a.label)`);
  ok(labels.some(l => /Blaziken ex onto Torchic/.test(l)), 'Goldfish offers Candy: Blaziken ex onto Torchic');
  ok(labels.some(l => /Dragapult ex onto Dreepy/.test(l)), 'Goldfish offers Candy: Dragapult ex onto Dreepy');
  ok(labels.some(l => /Alakazam onto Abra/.test(l)), 'Goldfish offers Candy: Alakazam onto Abra');
  const torchic = w.eval(`gfMons().find(m => gfTop(m).card.name === 'Torchic').id`);
  w.gfCandy(uid('Rare Candy'), uid('Blaziken ex'), torchic);
  ok(w.eval(`gfTop(gfMon(${torchic})).card.name`) === 'Blaziken ex', 'Rare Candy puts Blaziken ex on Torchic');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' / ') : ''));
  console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})();
