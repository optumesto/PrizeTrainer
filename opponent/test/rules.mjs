// Card rules the 5turn opponent reads for the meta lists: one small board per card, checked by its outcome.
// node opponent/test/rules.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../game.js'); require('../effects.js');
const E = G.E, I = E.internals;
const C = await import('./cards.mjs');
let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL ' + what); } };

const filler = Array.from({ length: 60 }, () => C.card('Psychic Energy'));
/** A board: each side { active: [name, energy names, dmg], bench: [...], hand: [names], deck: [names], discard: [names] }. */
function board(sides, opts = {}) {
  let s = G.newGame([filler.slice(0, 50).concat(Array(10).fill(C.card('Shuppet'))), filler.slice(0, 50).concat(Array(10).fill(C.card('Shuppet')))], { seed: 3, first: 0 });
  s.phase = 'play'; s.cur = 0; s.turns = [opts.turn || 3, opts.turn || 3]; s.turn = opts.turn || 3; s.first = true; s.mods = {};
  const ref = n => ({ uid: ++s.uid, card: C.card(n) || (() => { throw new Error('No card ' + n); })() });
  const mon = (k, x) => { const [n, en, dmg] = Array.isArray(x) ? x : [x]; const m = I.newMon(s, ref(n), k); m.turnIn = 0; (en || []).forEach(e => m.energy.push(ref(e))); m.dmg = dmg || 0; return m; };
  sides.forEach((d, k) => { const P = s.players[k]; P.hand = []; P.deck = (d.deck || []).map(ref).concat(Array.from({ length: 10 }, () => ref('Psychic Energy'))); P.discard = (d.discard || []).map(ref); P.prizes = Array.from({ length: d.prizes || 6 }, () => ref('Psychic Energy'));
    P.active = d.active ? mon(k, d.active) : null; P.bench = (d.bench || []).map(x => mon(k, x)); (d.hand || []).forEach(n => P.hand.push(ref(n))); if (d.tool) P.active.tool = ref(d.tool); });
  if (opts.stadium) s.stadium = { ref: ref(opts.stadium), owner: 0 };
  G.HOOKS_START.forEach(h => h(s));
  return s;
}
const acts = s => G.next(s).actions;
/** Play an action, then answer every question with pick(choices) (default: the first choice). */
function play(s, a, pick) { s = G.step(s, a); let n = 0; while ((s.pending || (s.promote && s.promote.length)) && n++ < 30) { const X = acts(s); if (!X.length) break; s = G.step(s, pick ? pick(X, s) || X[0] : X[0]); } return s; }
const attackNamed = (s, name) => acts(s).find(a => a.t === 'attack' && (a.via ? true : true) && atkName(s, a) === name);
function atkName(s, a) { const m = s.players[s.cur].active; if (a.via == null) return E.topOf(m).card.attacks[a.i].name;
  if (a.via.mon != null) return E.topOf(I.findMon(s, a.via.mon).m).card.attacks[a.i].name; return m.stack[a.via.stack].card.attacks[a.i].name; }
const handPlay = (s, name) => acts(s).find(a => a.t === 'trainer' && s.players[s.cur].hand.find(y => y.uid === a.uid).card.name === name);

// Dolliv's Nutrients heals 40 from 1 of your Pokemon.
{ let s = board([{ active: ['Dolliv', ['Grass Energy']], bench: [['Shuppet', [], 50]] }, { active: 'Shuppet' }]);
  s = play(s, attackNamed(s, 'Nutrients'), X => X.find(x => x.t === 'pick'));
  ok(s.players[0].bench[0].dmg === 10, 'Nutrients heals 40'); }
// Mew ex uses a Benched Pokemon's attack with its own Energy.
{ let s = board([{ active: ['Mew ex', ['Psychic Energy', 'Psychic Energy', 'Psychic Energy']], bench: ['Dusknoir'] }, { active: ['Mega Lopunny ex'] }]);
  const a = attackNamed(s, 'Shadow Bind'); ok(!!a, 'Mew ex can use Shadow Bind');
  if (a) { s = play(s, a); ok(s.players[1].active.dmg >= 150, 'Shadow Bind from Mew ex does its damage'); } }
// Relicanth: an evolved Pokemon uses its Basic's attack.
{ const s = board([{ active: ['Shuppet', ['Psychic Energy', 'Psychic Energy']], bench: ['Relicanth'] }, { active: 'Shuppet' }]);
  s.players[0].active.stack.push({ uid: 999, card: C.card('Banette') });
  ok(!!attackNamed(s, 'Hang Down'), 'Relicanth lets Banette use Hang Down'); }
// Dipplin attacks twice with Festival Grounds in play.
{ let s = board([{ active: ['Dipplin', ['Grass Energy']], bench: ['Applin', 'Applin'] }, { active: ['Shuppet'], bench: ['Shuppet'] }], { stadium: 'Festival Grounds' });
  s = play(s, attackNamed(s, 'Do the Wave'));
  ok(s.cur === 0 && !!attackNamed(s, 'Do the Wave'), 'Dipplin can attack again');
  ok(!acts(s).some(a => a.t === 'trainer' || a.t === 'retreat'), 'only the second attack or ending the turn');
  s = play(s, attackNamed(s, 'Do the Wave')); ok(s.cur === 1, 'the turn ends after the second attack'); }
// Without Festival Grounds, one attack.
{ let s = board([{ active: ['Dipplin', ['Grass Energy']], bench: ['Applin'] }, { active: ['Mega Lopunny ex'] }]);
  s = play(s, attackNamed(s, 'Do the Wave')); ok(s.cur === 1, 'Dipplin attacks once without Festival Grounds'); }
// Unown's Mysterious Signal takes 1 more Prize card.
{ let s = board([{ active: ['Unown', ['Psychic Energy', 'Psychic Energy']] }, { active: ['Shuppet', [], 20], bench: ['Shuppet'] }]);
  s = play(s, attackNamed(s, 'Mysterious Signal'));
  ok(s.players[0].prizes.length === 4, 'Mysterious Signal takes 2 Prize cards, not 1 (' + s.players[0].prizes.length + ' left)'); }
// Maractus: Knocked Out in the Active Spot, 6 damage counters on the attacker.
{ let s = board([{ active: ['Mega Lopunny ex', ['Psychic Energy', 'Psychic Energy']] }, { active: ['Maractus'], bench: ['Shuppet'] }]);
  s = play(s, attackNamed(s, 'Spiky Hopper'));
  ok(s.players[0].active.dmg === 60, 'Exploding Needles puts 6 counters on the attacker (' + s.players[0].active.dmg + ')'); }
// Hide 'n' Sneak: counters from an Ability can't go on Shuppet.
{ const s = board([{ active: ['Munkidori', ['Darkness Energy'], 30] }, { active: ['Shuppet'], bench: ['Maractus'] }]);
  const r = E.HOOKS.step.countersOn.run(s, { n: 2 }, {}, s.players[0], s.players[1]);
  ok(r.length === 1 && I.findMon(s, r[0]).m.stack[0].card.name === 'Maractus', "Hide 'n' Sneak keeps counters off Shuppet"); }
// Team Rocket's Energy pays Darkness and Colorless on a Team Rocket's Pokemon; on anything else it is discarded.
{ let s = board([{ active: ["Team Rocket's Murkrow"], bench: ['Shuppet'], hand: ["Team Rocket's Energy", "Team Rocket's Energy"] }, { active: ['Shuppet'] }]);
  const P = s.players[0], tr = acts(s).find(a => a.t === 'energy' && a.mon === P.active.id);
  s = play(s, tr); ok(!!attackNamed(s, 'Torment'), "Team Rocket's Energy pays Torment");
  s.players[0].used.energy = false; const sh = acts(s).find(a => a.t === 'energy' && a.mon === s.players[0].bench[0].id);
  s = play(s, sh); ok(s.players[0].bench[0].energy.length === 0 && s.players[0].discard.some(y => y.card.name === "Team Rocket's Energy"), "Team Rocket's Energy is discarded from Shuppet"); }
// Torment: the chosen attack can't be used next turn.
{ let s = board([{ active: ["Team Rocket's Murkrow", ['Darkness Energy', 'Darkness Energy']] }, { active: ['Mega Lopunny ex', ['Psychic Energy', 'Psychic Energy']] }]);
  s = play(s, attackNamed(s, 'Torment'), X => X.find(x => x.v === 'Spiky Hopper'));
  ok(s.cur === 1 && !attackNamed(s, 'Spiky Hopper') && !!attackNamed(s, 'Gale Thrust'), 'Torment stops Spiky Hopper only'); }
// Forest of Vitality: a Grass Basic played this turn can evolve into a Grass Pokemon.
{ let s = board([{ active: ['Shuppet'], hand: ['Smoliv', 'Dolliv'] }, { active: ['Shuppet'] }], { stadium: 'Forest of Vitality' });
  s = play(s, acts(s).find(a => a.t === 'bench'));
  ok(acts(s).some(a => a.t === 'evolve'), 'Forest of Vitality: Smoliv evolves the turn it is played'); }
{ let s = board([{ active: ['Shuppet'], hand: ['Applin', 'Dipplin'] }, { active: ['Shuppet'] }]);
  s = play(s, acts(s).find(a => a.t === 'bench'));
  ok(!acts(s).some(a => a.t === 'evolve'), 'without it, no evolving the turn it is played'); }
// Gladion's Final Battle: only as the last card in hand; +80 for Pokemon without a Rule Box.
{ let s = board([{ active: ['Shuppet', ['Psychic Energy']], hand: ["Gladion's Final Battle", 'Applin'] }, { active: ['Mega Lopunny ex'] }]);
  ok(!handPlay(s, "Gladion's Final Battle"), "Gladion's Final Battle needs to be the last card");
  s.players[0].hand.pop(); s = play(s, handPlay(s, "Gladion's Final Battle"));
  s = play(s, attackNamed(s, 'Hang Down')); ok(s.players[1].active.dmg === 90, 'Hang Down does 10 + 80 (' + s.players[1].active.dmg + ')'); }
// Mega Lopunny ex: Gale Thrust does 170 more after moving up from the Bench this turn.
{ let s = board([{ active: ['Shuppet', ['Psychic Energy']], bench: [['Mega Lopunny ex', ['Psychic Energy']]] }, { active: ['Dusknoir'] }]);
  s = play(s, acts(s).find(a => a.t === 'retreat')); const d = E.damageTo(s, s.players[0].active, E.readAttack(E.topOf(s.players[0].active).card.attacks[0]), s.players[1].active, true); ok(d === 230, 'Gale Thrust does 230 after retreating into the Active Spot (' + d + ')'); }
// Mega Excadrill ex: 130 more with 2 extra Energy.
{ let s = board([{ active: ['Mega Excadrill ex', Array(5).fill('Metal Energy')] }, { active: ['Dusknoir'], bench: ['Shuppet'] }]);
  const R = E.readAttack(E.topOf(s.players[0].active).card.attacks[1]); ok(E.damageTo(s, s.players[0].active, R, s.players[1].active, true) === 330, 'Maximum Drilling does 330 with 5 Energy'); }
// Pecharunt: 5 more damage counters on the opponent's Poisoned Active.
{ const s = board([{ active: ['Pecharunt'] }, { active: ['Dusknoir'] }]); s.players[1].active.poison = 1;
  G.HOOKS_END.forEach(h => h(s)); ok(s.players[1].active.dmg === 60, 'Poison does 10 + 50 with Pecharunt (' + s.players[1].active.dmg + ')'); }
// Kyurem: Trifrost for Colorless if the opponent has a Colress card in the discard pile.
{ const s = board([{ active: ['Kyurem', ['Psychic Energy']] }, { active: ['Dusknoir'], discard: ["Colress's Tenacity"] }]);
  ok(!!attackNamed(s, 'Trifrost'), 'Plasma Bane makes Trifrost cost 1 Colorless'); }
// Okidogi: +100 HP with Darkness Energy.
{ const s = board([{ active: ['Okidogi', ['Darkness Energy']] }, { active: ['Dusknoir'] }]);
  ok(E.maxHp(s, s.players[0].active) === E.topOf(s.players[0].active).card.hp + 100, 'Adrena-Power +100 HP'); }
// Full Metal Lab: Metal Pokemon take 30 less.
{ const s = board([{ active: ['Dusknoir'] }, { active: ['Mega Excadrill ex'] }], { stadium: 'Full Metal Lab' });
  const d = E.damageTo(s, s.players[0].active, { base: 100 }, s.players[1].active, true); ok(d === 70, 'Full Metal Lab: 100 becomes 70 (' + d + ')'); }
// N's Zoroark ex: Night Joker uses a Benched N's Pokemon's attack.
{ let s = board([{ active: ["N's Zoroark ex", ['Darkness Energy', 'Darkness Energy']], bench: ["N's Zorua"] }, { active: ['Dusknoir'] }]);
  s = play(s, attackNamed(s, 'Night Joker')); ok(s.players[1].active.dmg === 40, "Night Joker uses N's Zorua's Scratch, 20 doubled by Dusknoir's Darkness Weakness (" + s.players[1].active.dmg + ')'); }
// Adventure Lantern: attaching it puts a Fire and a Lightning Energy into the hand.
{ let s = board([{ active: ['Shuppet'], hand: ['Adventure Lantern'], deck: ['Fire Energy', 'Lightning Energy'] }, { active: ['Dusknoir'] }]);
  s = play(s, acts(s).find(a => a.t === 'tool')); const h = s.players[0].hand.map(y => y.card.name).sort().join(',');
  ok(h === 'Fire Energy,Lightning Energy', 'Adventure Lantern finds the two Energy (' + h + ')'); }
// Mega Chandelure ex: the opponent's Active retreats for 1 more.
{ const s = board([{ active: ['Shuppet'] }, { active: ['Mega Chandelure ex'] }]);
  ok(E.retreatCost(s, s.players[0].active, 0) === E.topOf(s.players[0].active).card.retreat + 1, 'Binding Flame: Retreat Cost 1 more'); }
// Acerola's Mischief: no damage from Pokemon ex next turn.
{ let s = board([{ active: ['Shuppet'], hand: ["Acerola's Mischief"] }, { active: ['Mega Lopunny ex', ['Psychic Energy', 'Psychic Energy']] }]);
  s.players[1].prizes = s.players[1].prizes.slice(0, 2);
  s = play(s, handPlay(s, "Acerola's Mischief")); s = play(s, acts(s).find(a => a.t === 'end'));
  s = play(s, attackNamed(s, 'Spiky Hopper')); ok(s.players[0].active && s.players[0].active.dmg === 0, "Acerola's Mischief stops Spiky Hopper"); }
// Terapagos ex: no Unified Beatdown on the first turn when going second.
{ const s = board([{ active: ['Terapagos ex', ['Psychic Energy', 'Psychic Energy']], bench: ['Shuppet'] }, { active: ['Dusknoir'] }], { turn: 1 }); s.first = false;
  ok(!attackNamed(s, 'Unified Beatdown'), 'Unified Beatdown waits on the first turn going second'); }
// Giratina: Chaos Crawler not two turns in a row, and no damage to it next turn.
{ let s = board([{ active: ['Giratina', ['Psychic Energy', 'Psychic Energy', 'Psychic Energy']] }, { active: ['Mega Lopunny ex', ['Psychic Energy', 'Psychic Energy']], bench: ['Shuppet'] }]);
  s = play(s, attackNamed(s, 'Chaos Crawler')); s = play(s, attackNamed(s, 'Spiky Hopper'));
  ok(s.players[0].active.dmg === 0, 'Chaos Crawler prevents damage next turn');
  ok(!attackNamed(s, 'Chaos Crawler'), 'Chaos Crawler not again the next turn'); }
// Sinistcha's Matcha Spin with 6 Hide 'n' Sneak Pokemon in the discard pile.
{ let s = board([{ active: ['Sinistcha', ['Psychic Energy']], discard: Array(6).fill('Shuppet') }, { active: ['Dusknoir'], bench: ['Mega Lopunny ex'] }]);
  s = play(s, attackNamed(s, 'Matcha Spin')); ok(s.players[1].active.dmg === 40 && s.players[1].bench[0].dmg === 40, 'Matcha Spin: 4 counters on each'); }

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
