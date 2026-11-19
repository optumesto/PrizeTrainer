// Headless check of Goldfish damage, attacks, healing and Abilities that move damage counters, in jsdom.
// Needs jsdom: cd tests && npm ci. Then: node tests/goldfish-check.cjs
// Card text below is the printed text (pokemon-tcg-data / TCGdex), copied word for word.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const { JSDOM, VirtualConsole, ResourceLoader } = require(path.join(ROOT, 'tests', 'node_modules', 'jsdom'));
class Local extends ResourceLoader {
  fetch(url) { const u = new URL(url); if (u.hostname === 'rdydeck.com') { const f = path.join(ROOT, u.pathname); if (fs.existsSync(f)) return Promise.resolve(fs.readFileSync(f)); } return Promise.resolve(Buffer.from('')); }
}
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const P = (name, o) => Object.assign({ name, count: 4, supertype: 'Pokémon', section: 'pokemon', stage: 'basic', tx: 1, types: ['psychic'] }, o);
const T = (name, kind, rtext, o) => Object.assign({ name, count: 4, supertype: 'Trainer', section: 'trainer', sub: [kind], tx: 1, rtext }, o);
const E = name => ({ name, count: 10, supertype: 'Energy', section: 'energy', tx: 1 });
const CARDS = [
  P('Shuppet', { hp: 50, attacks: [{ name: 'Hang Down', cost: ['psychic'], pd: '10', text: '' }] }),
  P('Banette', { hp: 80, stage: 'stage1', evolvesFrom: 'Shuppet', atext: [["Hide 'n' Sneak", "Prevent all effects of your opponent's Pokémon's attacks and Abilities done to this Pokémon. (Damage is not an effect.)"]],
    attacks: [{ name: 'Puppet Pull', cost: ['psychic'], pd: '80', text: 'You may search your deck for a card and put it into your hand. Then, shuffle your deck.' }] }),
  P('Munkidori', { hp: 110, atext: [['Adrena-Brain', "Once during your turn, if this Pokémon has any Darkness Energy attached, you may move up to 3 damage counters from 1 of your Pokémon to 1 of your opponent's Pokémon."]],
    attacks: [{ name: 'Mind Bend', cost: ['psychic', 'colorless'], pd: '60', text: "Your opponent's Active Pokémon is now Confused." }] }),
  P('Fletchinder', { hp: 80, types: ['fire'], stage: 'basic', attacks: [{ name: 'Heat Dive', cost: ['fire'], pd: '70', text: 'This Pokémon also does 10 damage to itself.' }] }),
  T('Risky Ruins', 'stadium', 'Whenever any player puts a Basic non-Darkness Pokémon onto their Bench during their turn, place 2 damage counters on that Pokémon.'),
  T('Pokémon Center Lady', 'supporter', 'Heal 60 damage from 1 of your Pokémon, and it recovers from all Special Conditions.'),
  T('Tasty Rice Ball', 'item', 'Heal 30 damage from your Active Pokémon. For each Tasty Rice Ball card in your discard pile, heal 30 more damage.'),
  E('Basic Psychic Energy'), E('Basic Darkness Energy'), E('Basic Fire Energy'),
];
(async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const errors = []; const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  const dom = new JSDOM(html, { url: 'https://rdydeck.com/', runScripts: 'dangerously', resources: new Local(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = async (input) => { const url = new URL(String(input && input.url || input), 'https://rdydeck.com/');
        if (url.hostname === 'rdydeck.com') { const f = path.join(ROOT, url.pathname); if (fs.existsSync(f)) return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': 'application/json' } }); }
        return new Response('', { status: 404 }); }; w.Response = Response;
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.scrollBy = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
      w.HTMLCanvasElement.prototype.getContext = () => null; try { delete w.indexedDB; } catch (_) {}
      w.requestIdleCallback = fn => setTimeout(fn, 0);
    } });
  const w = dom.window, d = w.document;
  await new Promise(r => setTimeout(r, 3500));
  w.__cards = CARDS;
  w.eval(`(() => { const deck = { id: 'gfchk', name: 'Goldfish check', cards: window.__cards, format: 'standard', enrichVer: ENRICH_VER };
    state.decks.push(deck); state.activeDeckId = 'gfchk'; showScreen('review'); showReviewTab('hand'); setHandMode('gold'); })()`);
  await new Promise(r => setTimeout(r, 300));
  const G = () => w.eval('gf'), body = () => d.getElementById('hand-body').textContent.replace(/\s+/g, ' ');
  // Rig a board: the hand and the top of the deck are set by name.
  const rig = (hand, top) => w.eval(`(() => { const all = gf.hand.concat(gf.deck, gf.prizes); const take = n => { const i = all.findIndex(x => x.card.name === n); return all.splice(i, 1)[0]; };
    gf.hand = ${JSON.stringify(hand)}.map(take); const tp = ${JSON.stringify(top || [])}.map(take); gf.deck = tp.concat(all.slice(6)); gf.prizes = all.slice(0, 6);
    gf.active = null; gf.bench = []; gf.discard = []; gf.stadium = null; gf.turn = 0; gf.log = []; gf.turnOver = false; gf.run = null; gf.needActive = false; renderHand(); })()`);
  const uid = n => w.eval(`(gf.hand.find(x => x.card.name === ${JSON.stringify(n)}) || {}).uid`);
  const mon = n => w.eval(`gfMons().find(m => gfTop(m).card.name === ${JSON.stringify(n)})`);

  // 1. Risky Ruins puts 2 damage counters on a Basic you bench during your turn, not during setup.
  w.eval('gfDeal(false)');
  rig(['Shuppet', 'Munkidori', 'Risky Ruins', 'Shuppet', 'Basic Darkness Energy', 'Basic Psychic Energy', 'Banette'], ['Basic Psychic Energy', 'Tasty Rice Ball', 'Pokémon Center Lady']);
  w.gfPlayBasic(uid('Shuppet'), 'active');
  w.gfEndTurn(); // turn 1
  ok(G().turn === 1, 'turn 1 starts');
  w.gfStadium(uid('Risky Ruins'));
  w.gfPlayBasic(uid('Munkidori'), 'bench');
  ok(mon('Munkidori').dmg === 20, 'Risky Ruins puts 20 damage on a benched Munkidori: ' + mon('Munkidori').dmg);
  w.gfPlayBasic(uid('Shuppet'), 'bench');
  ok(G().bench.length === 2, 'a 50 HP Shuppet benched with Risky Ruins survives with 20');
  const sh2 = G().bench.find(m => m.stack[0].card.name === 'Shuppet');
  ok(sh2 && sh2.dmg === 20, 'second Shuppet took 20');
  ok(/HP/.test(body()) && d.querySelector('.mt-dmg'), 'damage shows on the board');
  // 2. Munkidori moves up to 3 counters off your own Pokémon.
  w.gfAttach(uid('Basic Darkness Energy'), mon('Munkidori').id);
  w.gfAbility(mon('Munkidori').id, 0);
  ok(G().run && G().run.wait && G().run.wait.t === 'moveOff', 'Adrena-Brain asks which Pokémon to move counters from');
  w.gfDoMoveOff(mon('Munkidori').id, 2);
  ok(mon('Munkidori').dmg === 0, 'moved 2 counters off Munkidori');
  // 3. Going second, the Active attacks on turn 1: Shuppet's Hang Down needs Psychic.
  ok(w.eval('gfAttackWhy(gf.active, gfTop(gf.active).card.attacks[0])') === 'Not enough Energy attached.', 'attack needs its Energy');
  // 4. Turn 2: evolve, attach, attack with Puppet Pull, which searches and ends the turn.
  w.gfEndTurn();
  w.gfEvolve(uid('Banette'), G().active.id);
  w.gfAttach(uid('Basic Psychic Energy'), G().active.id);
  ok(w.eval('gfAttackWhy(gf.active, gfTop(gf.active).card.attacks[0])') === '', 'Banette can use Puppet Pull');
  w.gfAttack(0);
  ok(G().run && G().run.wait && G().run.wait.t === 'search', 'Puppet Pull searches the deck');
  w.eval(`(() => { const k = gfKey(gf.deck.find(x => x.card.name === 'Pokémon Center Lady')); gfSearch.pick[k] = 1; gfSearchDone('hand'); })()`);
  ok(G().turnOver && G().hand.some(x => x.card.name === 'Pokémon Center Lady'), 'the card came to hand and the attack ended the turn');
  ok(/Puppet Pull, 80 damage/.test(G().log.map(l => l.s).join(' | ')), 'log: ' + G().log.slice(-4).map(l => l.s).join(' | '));
  // 5. Turn 3: heal with Pokémon Center Lady and Tasty Rice Ball; add counters by hand.
  w.gfEndTurn();
  const ban = G().active; w.gfManDmg(ban.id, 1); w.gfManDmg(ban.id, 1); w.gfManDmg(ban.id, 1);
  ok(ban.dmg === 30, 'three counters added by hand');
  w.gfTrainer(uid('Pokémon Center Lady'));
  ok(G().run && G().run.wait && G().run.wait.t === 'heal', 'Pokémon Center Lady asks which Pokémon to heal');
  w.gfDoHeal(ban.id);
  ok(ban.dmg === 0 && sh2.dmg === 20, 'healed Banette, Shuppet still has 20');
  if (uid('Tasty Rice Ball')) { w.gfManDmg(ban.id, 1); w.gfManDmg(ban.id, 1); w.gfManDmg(ban.id, 1); w.gfManDmg(ban.id, 1);
    w.gfTrainer(uid('Tasty Rice Ball')); ok(ban.dmg === 10, 'Tasty Rice Ball heals 30 from the Active: ' + ban.dmg); w.gfManDmg(ban.id, -1); }
  else ok(false, 'Tasty Rice Ball was not drawn');
  // 6. KO: counters by hand up to HP knock out the Benched Shuppet.
  w.gfManDmg(sh2.id, 1); w.gfManDmg(sh2.id, 1); w.gfManDmg(sh2.id, 1);
  ok(!G().bench.includes(sh2) && /Knocked Out/.test(G().log.map(l => l.s).join(' ')), 'Shuppet is Knocked Out at 50 damage');
  // 7. Tapping a hand card opens its moves.
  w.gfSelect(G().hand[0].uid);
  ok(d.getElementById('x-modal').classList.contains('active') && d.querySelector('#x-modal .gf-sheet'), 'tapping a hand card opens it with its moves');
  w.gfShut();
  // 8. Three turns (3.4.5).
  while (!G().done && G().turn < 3) w.gfEndTurn();
  ok(G().turn === 3 && /Turn 3 of 3/.test(body()), 'turn 3 of 3');
  w.gfEndTurn();
  ok(G().done && /How your 3 turns went/.test(body()), 'the game ends after turn 3');
  // 9. Self damage: Fletchinder's Heat Dive.
  w.eval('gfDeal(false)');
  rig(['Fletchinder', 'Basic Fire Energy', 'Shuppet', 'Shuppet', 'Shuppet', 'Shuppet', 'Munkidori'], []);
  w.gfPlayBasic(uid('Fletchinder'), 'active'); w.gfEndTurn();
  w.gfAttach(uid('Basic Fire Energy'), G().active.id);
  w.gfAttack(0);
  ok(G().active.dmg === 10 && G().turnOver, 'Heat Dive does 10 damage to itself and ends the turn');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' / ') : ''));
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
