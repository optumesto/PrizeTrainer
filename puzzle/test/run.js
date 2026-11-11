#!/usr/bin/env node
// Self-checks for the puzzle engine and solver.   Run:  node puzzle/test/run.js
// Card records in cards.json are real pokemontcg.io records (pokemon-tcg-data), trimmed to the fields the engine reads.
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const E = require('../engine.js');
const S = require('../solver.js');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; return; }
  fail++; console.log('FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : ''));
}
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name, { got: a, want: b }); }

/* ---------- Cards ---------- */
const raw = require('./cards.json');
const BASES = { Dusclops: 'Duskull', Charmeleon: 'Charmander', Drakloak: 'Dreepy' };
const ID = {
  duskull: 'sv6pt5-18', dusclops: 'sv6pt5-19', dusknoir: 'sv6pt5-20', munkidori: 'sv6-95', dwebble: 'sv10-11', crustle: 'sv10-12',
  counterCatcher: 'sv4-160', primeCatcher: 'sv5-157', blackBelt: 'sv8pt5-96', cape: 'sv5-152', nest: 'sv1-181', candy: 'sv1-191',
  switch: 'sv1-194', ultra: 'sv1-196', charmander: 'sv3-26', charmeleon: 'sv3-27', zard: 'sv3-125', pidgeot: 'sv3-164',
  ogerpon: 'sv6-25', thorns: 'sv6-77', dreepy: 'sv6-128', drakloak: 'sv6-129', dragapult: 'sv6-130', boss: 'sv2-172', iono: 'sv2-185',
  eswitch: 'sv1-173', tusk: 'sv5-97', poffin: 'sv5-144', ursaluna: 'sv6-141', kieran: 'sv6-154', pikaPE: 'sv8pt5-28', research: 'sv8pt5-122',
  clefairy: 'sv9-56', pikaSS: 'sv8-57', moon: 'sv4-124',
  G: 'sve-1', R: 'sve-2', W: 'sve-3', L: 'sve-4', P: 'sve-5', F: 'sve-6', D: 'sve-7', M: 'sve-8',
};
const CARDS = {};
for (const c of raw) CARDS[c.id] = E.cardFromApi(c, { base: n => BASES[n] });
const K = Object.fromEntries(Object.entries(ID).map(([k, id]) => [k, id]));
const card = k => CARDS[ID[k]];
/** A puzzle record: names in it are the short names above. */
function pz(o) {
  const conv = v => Array.isArray(v) ? v.map(conv) : typeof v === 'string' ? (ID[v] || v) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'c' || k === 'tool' || k === 'under' || k === 'energy' || k === 'hand' || k === 'deck' || k === 'discard' || k === 'prizes' || k === 'active' || k === 'bench' || k === 'me' || k === 'opp' || k === 'stadium' ? conv(x) : x])) : v;
  return E.fromPuzzle(Object.assign({ cards: JSON.parse(JSON.stringify(CARDS)), turn: 3 }, { me: conv(o.me), opp: conv(o.opp), goal: o.goal, turn: o.turn, first: o.first, stadium: o.stadium && conv(o.stadium) }));
}
const ref = k => ({ uid: 0, card: card(k) });
const acts = (s, t) => E.legalActions(s).filter(a => !t || a.t === t);
const hasAct = (s, pred) => E.legalActions(s).some(pred);
const uidOf = (s, k, zone = 'hand') => s.players[0][zone].find(x => x.card.key === ID[k]).uid;
const monOf = (s, k, who = 0) => E.mons(s.players[who]).find(m => E.topOf(m).card.key === ID[k]);
const run = (s, list) => list.reduce((st, a) => { const legal = E.legalActions(st); const f = legal.find(x => JSON.stringify(x) === JSON.stringify(a)); if (!f) throw new Error('not legal: ' + JSON.stringify(a) + ' among ' + JSON.stringify(legal)); return E.apply(st, f); }, s);

/* ---------- 1. The shared text reader matches index.html ---------- */
try { execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'sync-text.mjs'), '--check'], { stdio: 'pipe' }); ok(true, 'sync'); }
catch (e) { ok(false, 'puzzle/text.js matches index.html (run node puzzle/tools/sync-text.mjs)'); }

/* ---------- 2. Reading card text ---------- */
{
  const TP = E.readTrainer(ref('ultra'));
  eq(TP.cost && TP.cost.n, 2, 'Ultra Ball costs 2 cards');
  eq(TP.steps.map(x => x.t + ':' + x.dest), ['search:hand'], 'Ultra Ball searches to hand');
  eq(E.readTrainer(ref('nest')).steps[0].dest, 'bench', 'Nest Ball searches to the Bench');
  eq(E.readTrainer(ref('boss')).steps.map(x => x.t), ['gust'], "Boss's Orders reads as a gust");
  eq(E.readTrainer(ref('primeCatcher')).steps.map(x => x.t), ['gust', 'switch'], 'Prime Catcher: gust then switch');
  ok(/more prize cards remaining/.test(E.readTrainer(ref('counterCatcher')).need), 'Counter Catcher has its Prize condition');
  eq(E.readTrainer(ref('kieran')).steps[0].opts.map(o => o.steps[0].t), ['switch', 'boost'], 'Kieran: choose switch or boost');
  eq(E.readTrainer(ref('blackBelt')).steps[0], { t: 'boost', n: 40, v: false }, "Black Belt's Training: +40 to Active ex");
  const cb = E.readAbilities(ref('dusknoir'))[0];
  eq(cb.steps.map(x => x.t), ['counters', 'koSelf'], 'Cursed Blast: counters then Knock Out itself');
  eq(E.readAbilities(ref('munkidori'))[0].energy, 'darkness', 'Adrena-Brain needs Darkness Energy');
  eq(E.readAttack(card('dusknoir').attacks[0]).base, 150, 'Shadow Bind 150');
  ok(E.readAttack(card('dragapult').attacks[1]) === null, 'Phantom Dive (spread you place) is unread, not guessed');
  ok(E.readAttack(card('zard').attacks[0]) === null, 'Burning Darkness (counts Prizes taken) is unread');
  ok(E.readAttack(card('crustle').attacks[0]).noFx, "Superb Scissors ignores effects on the opponent's Active");
  eq(E.readAttack(card('pikaSS').attacks[0]).edisc, { n: 3, type: '' }, 'Topaz Bolt discards 3 Energy');
  eq(card('dusknoir').weak, { type: 'darkness', x: 2 }, 'Weakness x2 read');
  eq(card('dusknoir').res, { type: 'fighting', n: 30 }, 'Resistance -30 read');
  eq(card('dusknoir').base, 'Duskull', 'Stage 2 records its Basic');
}

/* ---------- 3. One Energy a turn ---------- */
{
  let s = pz({ me: { active: { c: 'tusk' }, hand: ['F', 'F'], deck: 10, prizes: 6 }, opp: { active: { c: 'dreepy' }, prizes: 6, deck: 10 } });
  const e1 = acts(s, 'energy')[0];
  ok(!!e1, 'can attach an Energy');
  s = E.apply(s, e1);
  eq(acts(s, 'energy').length, 0, 'no second Energy attachment in a turn');
}

/* ---------- 4. Evolution and Rare Candy ---------- */
{
  const base = { opp: { active: { c: 'dreepy' }, prizes: 6, deck: 10 } };
  let s = pz(Object.assign({ me: { active: { c: 'tusk' }, bench: [{ c: 'duskull', turnIn: 2 }], hand: ['dusclops', 'candy', 'dusknoir'], deck: 10, prizes: 6 } }, base));
  ok(hasAct(s, a => a.t === 'evolve'), 'a Basic from last turn can evolve');
  ok(hasAct(s, a => a.t === 'candy'), 'Rare Candy: Duskull straight to Dusknoir');
  s = E.apply(s, acts(s, 'candy')[0]);
  eq(E.topOf(monOf(s, 'dusknoir')).card.name, 'Dusknoir', 'Rare Candy puts Dusknoir on Duskull');
  ok(!hasAct(s, a => a.t === 'evolve'), 'no evolving the same Pokémon twice in a turn');
  s = pz(Object.assign({ me: { active: { c: 'tusk' }, bench: [{ c: 'duskull', turnIn: 3 }], hand: ['dusclops', 'candy', 'dusknoir'], deck: 10, prizes: 6 } }, base));
  ok(!hasAct(s, a => a.t === 'evolve' || a.t === 'candy'), 'a Basic played this turn cannot evolve');
  s = pz(Object.assign({ turn: 1, me: { active: { c: 'tusk' }, bench: [{ c: 'duskull', turnIn: 0 }], hand: ['dusclops'], deck: 10, prizes: 6 } }, base));
  ok(!hasAct(s, a => a.t === 'evolve'), 'no evolving on your first turn');
}

/* ---------- 5. Retreat ---------- */
{
  const opp = { active: { c: 'dreepy' }, prizes: 6, deck: 10 };
  let s = pz({ me: { active: { c: 'dusknoir', under: ['duskull', 'dusclops'], energy: ['P', 'P'] }, bench: [{ c: 'dreepy' }], deck: 10, prizes: 6 }, opp });
  ok(!hasAct(s, a => a.t === 'retreat'), 'Retreat Cost 3 with 2 Energy: no retreat');
  s = pz({ me: { active: { c: 'dusknoir', under: ['duskull', 'dusclops'], energy: ['P', 'P', 'D'] }, bench: [{ c: 'dreepy' }], deck: 10, prizes: 6 }, opp });
  const r = acts(s, 'retreat');
  eq(r.length, 1, 'Retreat Cost 3 with 3 Energy: one way to pay');
  s = E.apply(s, r[0]);
  eq([E.topOf(s.players[0].active).card.name, s.players[0].discard.length], ['Dreepy', 3], 'retreating discards the Energy and switches');
  ok(!hasAct(s, a => a.t === 'retreat'), 'one retreat a turn');
}

/* ---------- 6. Damage: Weakness, Resistance, HP, boosts, prevention ---------- */
{
  const s = pz({ me: { active: { c: 'tusk' }, deck: 10, prizes: 6 }, opp: { active: { c: 'pikaPE' }, bench: [{ c: 'dusknoir', under: ['duskull', 'dusclops'] }], prizes: 6, deck: 10 } });
  const tusk = s.players[0].active, R = E.readAttack(card('tusk').attacks[1]);
  eq(E.damageTo(s, tusk, R, s.players[1].active, true), 320, 'Weakness x2: 160 to a Fighting-weak Pikachu ex is 320');
  eq(E.damageTo(s, tusk, R, s.players[1].bench[0], true), 130, 'Resistance -30: 160 to Dusknoir is 130');
  eq(E.damageTo(s, tusk, R, s.players[1].bench[0], false), 160, 'no Weakness or Resistance on the Bench');
}
{
  const s = pz({ me: { active: { c: 'dusknoir', under: ['duskull', 'dusclops'] }, deck: 10, prizes: 6 }, opp: { active: { c: 'pikaPE', tool: 'cape' }, prizes: 6, deck: 10 } });
  eq(E.maxHp(s, s.players[1].active), 290, "Hero's Cape: Pikachu ex 190 HP becomes 290");
  const R = E.readAttack(card('dusknoir').attacks[0]);
  s.mods.exBoost = 40; eq(E.damageTo(s, s.players[0].active, R, s.players[1].active, true), 190, "Black Belt's Training: 150 + 40 to an Active ex");
  s.mods.exvBoost = 30; eq(E.damageTo(s, s.players[0].active, R, s.players[1].active, true), 220, 'Kieran adds 30 more');
}
{
  const s = pz({ me: { active: { c: 'pikaSS' }, bench: [{ c: 'tusk' }], deck: 10, prizes: 6 }, opp: { active: { c: 'crustle', under: ['dwebble'] }, bench: [{ c: 'ogerpon' }], prizes: 6, deck: 10 } });
  eq(E.damageTo(s, s.players[0].active, E.readAttack(card('pikaSS').attacks[0]), s.players[1].active, true), 0, 'Crustle takes no damage from a Pokémon ex');
  eq(E.damageTo(s, s.players[0].bench[0], E.readAttack(card('tusk').attacks[1]), s.players[1].active, true), 160, 'Crustle still takes damage from a non-ex');
  eq(E.damageTo(s, s.players[0].bench[0], { base: 60 }, s.players[1].bench[0], false), 0, 'a Benched Tera Pokémon ex takes no attack damage');
}

/* ---------- 7. Gusts and Prize conditions ---------- */
{
  const opp = { active: { c: 'tusk' }, bench: [{ c: 'pikaPE', dmg: 70 }], prizes: 2, deck: 10 };
  let s = pz({ me: { active: { c: 'dusknoir', under: ['duskull', 'dusclops'], energy: ['P', 'P', 'P'] }, hand: ['counterCatcher', 'boss'], deck: 10, prizes: 2 }, opp });
  ok(!hasAct(s, a => a.t === 'trainer' && a.uid === uidOf(s, 'counterCatcher')), 'Counter Catcher needs you behind on Prizes');
  s = pz({ me: { active: { c: 'dusknoir', under: ['duskull', 'dusclops'], energy: ['P', 'P', 'P'] }, hand: ['counterCatcher'], deck: 10, prizes: 4 }, opp });
  ok(hasAct(s, a => a.t === 'trainer'), 'Counter Catcher is playable when behind');
  s = pz({ me: { active: { c: 'dusknoir', under: ['duskull', 'dusclops'], energy: ['P', 'P', 'P'] }, hand: ['boss'], deck: 10, prizes: 2 }, opp });
  s = E.apply(s, acts(s, 'trainer')[0]);
  eq(s.pending && s.pending.ask.kind, 'oppBench', "Boss's Orders asks which Benched Pokémon");
  s = E.apply(s, acts(s, 'pick')[0]);
  eq(E.topOf(s.players[1].active).card.name, 'Pikachu ex', 'Pikachu ex is now Active');
  ok(!hasAct(s, a => a.t === 'trainer'), 'one Supporter a turn');
  s = E.apply(s, acts(s, 'attack')[0]);
  eq([s.taken[0], E.goalMet(s)], [2, true], 'Shadow Bind Knocks Out Pikachu ex: 2 Prizes, game won');
  ok(s.players[0].hand.every(x => x.card.key === '?'), 'Prizes taken this turn go to hand face down');
  s = pz({ turn: 1, first: true, me: { active: { c: 'tusk' }, hand: ['boss'], deck: 10, prizes: 6 }, opp: { active: { c: 'dreepy' }, bench: [{ c: 'pikaPE' }], prizes: 6, deck: 10 } });
  ok(!hasAct(s, a => a.t === 'trainer'), 'no Supporter on the first turn of the game');
  s = pz({ me: { active: { c: 'tusk' }, hand: ['primeCatcher'], deck: 10, prizes: 6 }, opp: { active: { c: 'dreepy' }, bench: [{ c: 'pikaPE' }], prizes: 6, deck: 10 } });
  s.players[1].active.tool = { uid: 999, card: card('cape') }; // a Tool does not block ACE SPECs by itself
  ok(hasAct(s, a => a.t === 'trainer'), 'Prime Catcher is playable');
}

/* ---------- 8. Abilities: Cursed Blast, Adrena-Brain, Iron Thorns ---------- */
{
  let s = pz({ me: { active: { c: 'tusk' }, bench: [{ c: 'dusknoir', under: ['duskull', 'dusclops'] }], deck: 10, prizes: 6 },
    opp: { active: { c: 'dreepy' }, bench: [{ c: 'munkidori', dmg: 0 }], prizes: 6, deck: 10 } });
  s = E.apply(s, acts(s, 'ability')[0]);
  const mk = monOf(s, 'munkidori', 1);
  s = E.apply(s, acts(s, 'pick').find(a => a.v === mk.id));
  eq([s.taken[0], s.taken[1]], [1, 1], 'Cursed Blast: 130 Knocks Out Munkidori (1 Prize), Dusknoir is Knocked Out (opponent takes 1)');
  ok(!monOf(s, 'dusknoir'), 'Dusknoir is in the discard pile');
}
{
  const opp = { active: { c: 'tusk' }, prizes: 6, deck: 10 };
  let s = pz({ me: { active: { c: 'dreepy', dmg: 30 }, bench: [{ c: 'munkidori', energy: ['P'] }], deck: 10, prizes: 6 }, opp });
  ok(!hasAct(s, a => a.t === 'ability'), 'Adrena-Brain without Darkness Energy: not usable');
  s = pz({ me: { active: { c: 'dreepy', dmg: 30 }, bench: [{ c: 'munkidori', energy: ['D'] }], deck: 10, prizes: 6 }, opp });
  s = E.apply(s, acts(s, 'ability')[0]);
  const mv = acts(s, 'pick');
  eq(mv.map(a => a.v.n), [3, 2, 1], 'Adrena-Brain moves up to 3 counters');
  s = E.apply(s, mv[0]);
  eq([s.players[0].active.dmg, s.players[1].active.dmg], [0, 30], 'counters moved to the opponent');
}
{
  const s = pz({ me: { active: { c: 'tusk' }, bench: [{ c: 'pidgeot' }, { c: 'dusknoir', under: ['duskull', 'dusclops'] }], deck: ['boss', 'nest'], prizes: 6 },
    opp: { active: { c: 'thorns' }, prizes: 6, deck: 10 } });
  const ab = acts(s, 'ability').map(a => E.topOf(E.mons(s.players[0]).find(m => m.id === a.mon)).card.name);
  eq(ab, ['Dusknoir'], 'Iron Thorns ex Active: Pidgeot ex (Rule Box) loses Quick Search; Dusknoir keeps Cursed Blast');
}

/* ---------- 9. Luck and unread cards never count ---------- */
{
  let s = pz({ me: { active: { c: 'tusk' }, hand: ['research'], deck: 20, prizes: 1 }, opp: { active: { c: 'dreepy' }, prizes: 6, deck: 10 } });
  s = E.apply(s, acts(s, 'trainer')[0]);
  ok(s.luck, "Professor's Research draws unknown cards: the line is luck");
  ok(!E.goalMet(s), 'a lucky state never meets the goal');
  s = pz({ me: { active: { c: 'dragapult', under: ['dreepy', 'drakloak'], energy: ['R', 'P'] }, deck: 10, prizes: 6 }, opp: { active: { c: 'dreepy' }, prizes: 6, deck: 10 } });
  ok(E.readCheck(s).some(x => /Phantom Dive/.test(x)), 'readCheck lists Phantom Dive');
  s = E.apply(s, acts(s, 'attack').find(a => a.i === 1));
  ok(s.unread.length > 0 && !E.goalMet(s), 'using an unread attack marks the line unread');
  const n = pz({ me: { active: { c: 'tusk' }, hand: ['nest'], deck: 3, prizes: 6 }, opp: { active: { c: 'dreepy' }, prizes: 6, deck: 10 } });
  const n2 = E.apply(n, acts(n, 'trainer')[0]);
  eq(acts(n2, 'pick').map(a => a.v.length), [0], 'searching a face-down deck finds nothing you can count on');
}

/* ---------- 10. Solver ---------- */
// You have 2 Prizes left and need both this turn. Great Tusk (160) is Active, Pikachu ex (190) on the Bench.
// Dusknoir's 150 does not Knock Out either. The out: Dusclops's Cursed Blast puts 50 on Pikachu ex, Boss's Orders
// brings it up, Shadow Bind finishes it. Black Belt's Training is the trap (one Supporter a turn).
const OUT = {
  me: { active: { c: 'dusknoir', under: ['duskull', 'dusclops'], energy: ['P', 'P', 'D'] }, bench: [{ c: 'dusclops', under: ['duskull'] }],
    hand: ['boss', 'blackBelt'], deck: 10, prizes: 2 },
  opp: { active: { c: 'tusk' }, bench: [{ c: 'pikaPE' }], prizes: 3, deck: 10 },
};
{
  const s = pz(OUT);
  eq(E.readCheck(s), [], 'every card in the out puzzle reads');
  const r = S.solve(s);
  ok(r.complete, 'solver finishes within its budget', r.nodes);
  eq([r.win, r.moves], [true, 3], 'solver finds the 3-move out');
  eq(r.firstMoves, 2, 'two first moves work (Cursed Blast first, or Boss first)');
  ok(!S.obviousWin(s), 'attacking right away does not win');
  // Our line, then the same plays in the other order.
  const won = r.line.reduce((st, a) => E.apply(st, a), s);
  ok(E.goalMet(won), 'the main line wins when played');
  const dc = monOf(s, 'dusclops').id, pk = s.players[1].bench[0].id;
  const alt = [{ t: 'trainer', uid: uidOf(s, 'boss') }, { t: 'pick', v: pk }, { t: 'ability', mon: dc, i: 0 }, { t: 'pick', v: pk }, { t: 'attack', i: 0 }];
  const rp = S.replay(s, alt);
  eq([rp.ok, rp.won], [true, true], 'replay accepts the other winning order');
  const bad = [{ t: 'trainer', uid: uidOf(s, 'blackBelt') }, { t: 'trainer', uid: uidOf(s, 'boss') }];
  const rb = S.replay(s, bad);
  eq([rb.ok, rb.at], [false, 1], 'replay rejects a second Supporter');
  const miss = [{ t: 'trainer', uid: uidOf(s, 'blackBelt') }, { t: 'attack', i: 0 }];
  const rm = S.replay(s, miss);
  eq([rm.ok, rm.won], [true, false], 'a legal line that falls short is not a win');
  // Without Boss's Orders there is no out.
  const none = pz(Object.assign({}, OUT, { me: Object.assign({}, OUT.me, { hand: ['blackBelt'] }) }));
  eq(S.solve(none).win, false, 'without the gust there is no out');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
