// ═══════════ Watch out for ═══════════
// A box on the Grade tab, after Against the meta: up to 3 things the current meta can use against this
// deck's plan, worst first. Each line says what is weak, which cards or decks hit it, and how this
// deck's archetype did against those decks online (matchups.json, the same records as Against the meta).
//   - its main attacker's Weakness, against meta decks whose damage attackers are that type
//   - an attacker that does more damage with more cards in hand, against hand disruption
//   - Rare Candy, against Item lock; Colorless Pokemon with Abilities, against Ability lock;
//     Pokemon Tools, against Tool lock; Abilities that Knock Out their own Pokemon, against Damp;
//     many Pokemon with 70 HP or less, against Bench damage
// It reads the deck and the meta only. It changes no grade, score or weight.
// The meta facts (WO83_DATA) are written by watch-out-data.mjs from meta-cards.json and card text.
// The weekly data refresh runs watch-out-data.mjs after matchups.json, so the facts follow the meta.
// On since Mason's yes (Nov 18, 2026). WO83_ON false hides it again; ?wo or rd_wo83 set to 1 still shows it for checks.
const WO83_ON = true;
const WO83_MAX = 3;          // lines shown
const WO83_MIN = 0.03;       // a line needs at least this much of the meta behind it
const WO83_ROWS = 3;         // decks shown per line

/* WO83_DATA_START */
const WO83_DATA = {
  "asOf":"2026-11-23","decks":{"dragapult-ex":{"t":{"N":1},"sp":["Dragapult ex"]},
  "basic-box-m":{"t":{"C":0.72,"P":0.28}},
  "slowking-scr":{"t":{"P":0.39,"C":0.42},"sp":["Kyurem"]},
  "n-zoroark":{"t":{"N":1}},
  "dhelmise-pbl":{"t":{}},
  "alakazam-dudunsparce":{"t":{}},
  "dragapult-dusknoir":{"t":{"N":1},"sp":["Dragapult ex"]},
  "ogerpon-meganium-hydrapple":{"t":{"G":1}},
  "mega-excadrill-ex":{"t":{"M":1}},
  "sharpedo-toxtricity":{"t":{"D":1}},
  "dragapult-blaziken":{"t":{"R":0.5,"N":0.5},"sp":["Dragapult ex"]},
  "lopunny-dudunsparce":{"t":{"C":1}},
  "alakazam-dusknoir":{"t":{"P":0.4}},
  "festival-lead":{"t":{}},
  "lucario-hariyama":{"t":{"F":1}},
  "crustle-dri":{"t":{"G":0.28,"C":0.72}},
  "mega-rayquaza-ex":{"t":{"C":0.69}},
  "mega-lucario-ex":{"t":{"F":1}},
  "cynthia-garchomp-ex":{"t":{"F":1}},
  "lopunny-dusknoir":{"t":{"P":0.42,"C":0.58}},
  "rockets-honchkrow":{"t":{"D":0.71,"W":0.29}},
  "mega-greninja-ex":{"t":{"W":0.63,"F":0.37},"sp":["Greninja ex"]},
  "grimmsnarl-froslass":{"t":{"D":1},"sp":["Marnie's Grimmsnarl ex"]},
  "greninja-ex":{"t":{"F":0.61,"P":0.39},"sp":["Greninja ex"]},
  "dragapult-dudunsparce":{"t":{"N":1},"sp":["Dragapult ex"]},
  "ogerpon-meganium-arboliva":{"t":{"G":1}},
  "toucannon-pbl":{"t":{"C":1}},
  "mew-ex-30c":{"t":{"P":0.26,"C":0.63},"sp":["Wellspring Mask Ogerpon ex"]},
  "beedrill-ex-cri":{"t":{"G":1}},
  "igglybuff-30c":{"t":{}},
  "talonflame-dusknoir":{"t":{"P":0.41,"C":0.59}},
  "mega-starmie-ex":{"t":{"W":1},"sp":["Mega Starmie ex"]},
  "ethan-typhlosion":{"t":{"R":1}},
  "rocket-mewtwo-ex":{"t":{"P":0.67,"W":0.33}},
  "mega-absol-mega-audino":{"t":{"D":1}},
  "hops-trevenant":{"t":{"C":1}},
  "seaking-pre":{"t":{}},
  "starmie-froslass":{"t":{"W":1},"sp":["Mega Starmie ex"]},
  "raging-bolt-ogerpon":{"t":{"N":0.33,"P":0.24,"C":0.43}},
  "mega-venusaur-ex":{"t":{"G":1}},
  "stevens-metagross":{"t":{"M":1}},
  "mega-chandelure-ex":{"t":{"P":1}},
  "ceruledge-ex":{"t":{"R":1}},
  "gengar-ex":{"t":{"D":0.44}},
  "manectric-eelektrik":{"t":{"L":1}},
  "toxtricity-box":{"t":{"D":1}},
  "starmie-dusknoir":{"t":{"W":1},"sp":["Mega Starmie ex"]},
  "kangaskhan-bouffalant":{"t":{"C":1}},
  "mega-darkrai-ex":{"t":{"D":0.51,"P":0.22,"C":0.27}},
  "okidogi-barbaracle":{"t":{}},
  "mega-absol-box":{"t":{"D":0.5,"C":0.5}},
  "mega-golisopod-ex":{"t":{"G":1}},
  "iron-thorns-ex":{"t":{"L":1}},
  "cinccino-ex":{"t":{"C":0.54,"M":0.46}},
  "mega-abomasnow-ex":{"t":{"W":1}},
  "toxtricity-pfl":{"t":{"D":1}},
  "mega-zygarde-ex":{"t":{"F":1},"sp":["Mega Zygarde ex"]},
  "yanmega-ex":{"t":{"G":1}},
  "mega-dragonite-ex":{"t":{"N":0.49,"R":0.51}},
  "marnie-grimmsnarl-ex":{"t":{"D":1},"sp":["Marnie's Grimmsnarl ex"]},
  "lillie-clefairy":{"t":{"P":0.48,"C":0.52},"sp":["Fezandipiti ex"]},
  "mega-lopunny-ex":{"t":{"C":0.57,"W":0.43}},
  "clefairy-ogerpon":{"t":{"C":0.66,"P":0.34}},
  "ogerpon-meganium":{"t":{"G":1}},
  "mega-malamar-ex":{"t":{"D":1}},
  "tera-box":{"t":{"W":1},"sp":["Wellspring Mask Ogerpon ex"]},
  "palafin-ex":{"t":{"W":1}},
  "rocket-spidops":{"t":{"W":1}},
  "alakazam-meg":{"t":{}}},"cards":{"Judge":{"s":0.456,"d":[["iron-thorns-ex",1],["sharpedo-toxtricity",0.97],["lucario-hariyama",0.95],["mega-rayquaza-ex",0.95],["dragapult-dudunsparce",0.95],["dragapult-ex",0.93],["dragapult-blaziken",0.9],["n-zoroark",0.88],["ogerpon-meganium-hydrapple",0.86],["manectric-eelektrik",0.83],["ogerpon-meganium",0.8],["yanmega-ex",0.75]]},"Unfair Stamp":{"s":0.379,"d":[["ogerpon-meganium-arboliva",0.98],["dragapult-blaziken",0.97],["dragapult-ex",0.96],["ogerpon-meganium-hydrapple",0.95],["sharpedo-toxtricity",0.94],["dragapult-dudunsparce",0.93],["clefairy-ogerpon",0.9],["mega-malamar-ex",0.88],["dragapult-dusknoir",0.82],["mega-rayquaza-ex",0.68],["n-zoroark",0.64],["ogerpon-meganium",0.6]]},"Xerosic's Machinations":{"s":0.055,"d":[["mega-absol-mega-audino",0.96],["crustle-dri",0.9],["mega-lopunny-ex",0.82],["mega-chandelure-ex",0.79],["mega-starmie-ex",0.41],["iron-thorns-ex",0.36],["beedrill-ex-cri",0.28],["mega-zygarde-ex",0.27],["mega-abomasnow-ex",0.25],["alakazam-meg",0.25]]},"Budew":{"s":0.339,"d":[["dragapult-blaziken",1],["dragapult-dudunsparce",1],["dragapult-ex",0.99],["grimmsnarl-froslass",0.98],["dragapult-dusknoir",0.97],["ogerpon-meganium-arboliva",0.97],["alakazam-dusknoir",0.92],["starmie-froslass",0.86],["mega-lopunny-ex",0.82],["starmie-dusknoir",0.81],["greninja-ex",0.79],["stevens-metagross",0.71]]},"Team Rocket's Watchtower":{"s":0.208,"d":[["sharpedo-toxtricity",0.97],["dragapult-blaziken",0.97],["toxtricity-box",0.97],["n-zoroark",0.94],["mega-absol-mega-audino",0.94],["dragapult-dusknoir",0.85],["mega-zygarde-ex",0.73],["cynthia-garchomp-ex",0.6],["toxtricity-pfl",0.56],["alakazam-meg",0.5],["stevens-metagross",0.41],["ethan-typhlosion",0.4]]},"Jamming Tower":{"s":0.059,"d":[["talonflame-dusknoir",0.85],["lopunny-dusknoir",0.79],["dragapult-dusknoir",0.56],["greninja-ex",0.29]]},"Tool Scrapper":{"s":0.039,"d":[["seaking-pre",0.55],["festival-lead",0.5],["igglybuff-30c",0.48],["ethan-typhlosion",0.27],["palafin-ex",0.25]]},"Psyduck":{"s":0.073,"d":[["mega-absol-mega-audino",0.94],["seaking-pre",0.77],["yanmega-ex",0.56],["festival-lead",0.52],["mega-dragonite-ex",0.45],["lopunny-dudunsparce",0.42],["mega-chandelure-ex",0.38],["palafin-ex",0.38],["kangaskhan-bouffalant",0.33],["grimmsnarl-froslass",0.29],["ceruledge-ex",0.29],["alakazam-meg",0.25]]}}};
/* WO83_DATA_END */

const WO83_TY = { grass: 'G', fire: 'R', water: 'W', lightning: 'L', psychic: 'P', fighting: 'F', darkness: 'D', metal: 'M', fairy: 'Y', dragon: 'N', colorless: 'C' };

function wo83On() {
  if (WO83_ON) return true;
  try { if (/[?&]wo(?:=|&|$)/.test(location.search)) return true; } catch (_) {}
  try { return safeLocalGet('rd_wo83') === '1'; } catch (_) { return false; }
}

/** The archetype whose records Against the meta shows for this deck: the one picked there, the graded one, or the closest. */
function wo83Arch(deck, data) {
  let graded = null;
  try { const R = typeof g29Grade === 'function' ? g29Grade(deck) : null; graded = R && R.res ? data.decks.find(d => d.id === R.res.id) || null : null; } catch (_) {}
  const pick = (typeof mu60Picks === 'function' ? mu60Picks() : {})[deck.id];
  return data.decks.find(d => d.id === pick) || graded || (typeof mu60Match === 'function' ? mu60Match(deck, data) : null);
}

/**
 * Up to WO83_MAX lines, worst first: { id, sev, head, say: [sentences], cards: [[name, share]], decks: [{ d, w }] }.
 * sev is about the share of the meta that can do it, scaled by how much it hurts; nothing here feeds the grade.
 */
function wo83Lines(deck, R, data, arch) {
  if (!deck || !R || !Array.isArray(R.entries) || typeof WO83_DATA === 'undefined') return [];
  // The deck's own cards (types, Weakness, HP, attack text); the grade's rows for what the grade read from them.
  const D = (deck.cards || []).filter(c => c && c.supertype && c.count > 0);
  const mon = c => /^pok/i.test(c.supertype);
  const qty = f => D.filter(c => { try { return f(c); } catch (_) { return false; } }).reduce((n, c) => n + c.count, 0);
  const E = R.entries.filter(e => e && e.card && e.qty > 0);
  const meta = data.decks.filter(d => WO83_DATA.decks[d.id] && (!arch || d.id !== arch.id));
  const share = d => Math.max(0, +d.share || 0) / 100;
  const C = WO83_DATA.cards;
  const card = n => C[n] || { s: 0, d: [] };
  const lines = [];
  // Decks that run any of these cards, by how much of the meta they bring with them.
  const byCards = names => {
    const at = new Map();
    names.forEach(n => card(n).d.forEach(([id, s]) => at.set(id, Math.max(at.get(id) || 0, s))));
    return meta.filter(d => at.has(d.id)).map(d => ({ d, w: share(d) * at.get(d.id) })).sort((a, b) => b.w - a.w);
  };
  const any = names => 1 - names.reduce((p, n) => p * (1 - card(n).s), 1);
  const chips = names => names.filter(n => card(n).s >= 0.005).map(n => [n, card(n).s]);

  // 1. The main attacker's Weakness, against meta decks that attack with that type.
  const main = R.via && R.via.main;
  const me = main && D.find(c => mon(c) && String(c.name || '').toLowerCase() === String(main.key || main.name || '').toLowerCase());
  const wk = me && String(me.weak || '').toLowerCase();
  if (wk && WO83_TY[wk]) {
    const L = WO83_TY[wk];
    const decks = meta.map(d => ({ d, w: share(d) * (WO83_DATA.decks[d.id].t[L] || 0) })).filter(x => x.w > 0).sort((a, b) => b.w - a.w);
    const ex = decks.reduce((a, x) => a + x.w, 0);
    const T = wk[0].toUpperCase() + wk.slice(1);
    if (decks.length) lines.push({ id: 'weak', sev: ex, head: `Weak to ${T}`,
      say: [`Your main attacker takes double damage from ${T} attacks.`, `Decks that attack with them are about ${Math.max(1, Math.round(ex * 100))}% of the meta.`], cards: [], decks });
  }
  // 2. Damage that grows with the cards in your own hand, against hand disruption.
  const hand = qty(c => mon(c) && (c.attacks || []).some(a => /for each card in your hand/i.test(a.text || '')));
  if (hand >= 2) {
    const N = ['Judge', 'Unfair Stamp', "Xerosic's Machinations"];
    lines.push({ id: 'hand', sev: any(N) * 0.5, head: 'Hand disruption',
      say: ['Your attacker does more damage the more cards you hold.', 'These cards shrink your hand.'], cards: chips(N), decks: byCards(N) });
  }
  // 3. Rare Candy, against Item lock.
  if (qty(c => /^rare candy$/i.test(c.name || '')) >= 2) {
    const N = ['Budew'];
    lines.push({ id: 'item', sev: any(N) * 0.5, head: 'Item lock',
      say: ['Your Stage 2 Pokemon lean on Item cards to evolve.', 'This Pokemon stops you playing Items for a turn.'], cards: chips(N), decks: byCards(N) });
  }
  // 4. Colorless Pokemon with Abilities, against Team Rocket's Watchtower.
  const tower = qty(c => mon(c) && (c.types || []).some(t => /^colorless$/i.test(t)) && (c.atext || []).length > 0);
  if (tower >= 3) {
    const N = ["Team Rocket's Watchtower"];
    lines.push({ id: 'tower', sev: any(N) * 0.5 * Math.min(1, tower / 4), head: 'Ability lock',
      say: [`This deck plays ${tower} Colorless Pokemon with Abilities.`, 'This Stadium turns those Abilities off.'], cards: chips(N), decks: byCards(N) });
  }
  // 5. Pokemon Tools, against Jamming Tower and Tool Scrapper.
  const tools = qty(c => c.ttype === 'tool');
  if (tools >= 3) {
    const N = ['Jamming Tower', 'Tool Scrapper'];
    lines.push({ id: 'tool', sev: any(N) * 0.4 * Math.min(1, tools / 4), head: 'Tool lock',
      say: [`This deck plays ${tools} Pokemon Tools.`, 'These cards turn them off or discard them.'], cards: chips(N), decks: byCards(N) });
  }
  // 6. Abilities that Knock Out their own Pokemon (Dusknoir's Cursed Blast), against Psyduck's Damp.
  const self = E.filter(e => e.card.t === 'pkmn' && (e.card.abDmg || []).some(x => x && x.selfKO)).reduce((n, e) => n + e.qty, 0);
  if (self >= 2) {
    const N = ['Psyduck'];
    lines.push({ id: 'damp', sev: any(N) * 0.6, head: 'Blocked Abilities',
      say: ['Your plan uses an Ability that Knocks Out its own Pokemon.', 'This Pokemon stops those Abilities while it is in play.'], cards: chips(N), decks: byCards(N) });
  }
  // 7. Many low HP Pokemon, against Bench damage.
  const low = qty(c => mon(c) && c.hp > 0 && c.hp <= 70);
  if (low >= 6) {
    const decks = meta.filter(d => (WO83_DATA.decks[d.id].sp || []).length).map(d => ({ d, w: share(d) })).sort((a, b) => b.w - a.w);
    const ex = decks.reduce((a, x) => a + x.w, 0);
    if (decks.length) lines.push({ id: 'bench', sev: ex * 0.5 * Math.min(1, low / 10), head: 'Bench damage',
      say: [`${low} of your Pokemon have 70 HP or less.`, 'These decks damage the Bench.'], cards: [], decks });
  }
  // A bad record against the decks named makes a line worse; a good one does not hide it.
  if (arch) lines.forEach(l => l.decks.slice(0, WO83_ROWS).forEach(x => {
    const r = mu60Sum(arch.vs[x.d.id]), n = r[0] + r[1] + r[2], p = mu60Pct(r);
    if (n >= MU60_FEW && p != null && p < 50) l.sev += share(x.d) * (50 - p) / 50;
  }));
  return lines.filter(l => l.sev >= WO83_MIN).sort((a, b) => b.sev - a.sev).slice(0, WO83_MAX);
}

const wo83Pc = s => Math.max(1, Math.round(s * 100)) + '%';

function wo83Section(deck) {
  const data = typeof mu60Data !== 'undefined' ? mu60Data : null;
  if (!data || !deck || deck.format === 'expanded' || deck.format === 'prerelease') return '';
  const R = typeof g29Grade === 'function' ? g29Grade(deck) : null;
  if (!R) return '';
  const arch = wo83Arch(deck, data);
  const lines = wo83Lines(deck, R, data, arch);
  // 3.5.4: folded by default; the folded line names what to watch for.
  // 3.5.5 (Muse brief changes 1 and 5): open on load when there is something to watch for, and the folded line
  // names the card behind each threat with its share of top lists, so the line says where the risk comes from.
  const src = l => l.cards.length ? ` <span class="wo83-src">(<span data-no-tr>${esc(l.cards[0][0])}</span> <b>${wo83Pc(l.cards[0][1])}</b>)</span>` : '';
  const what = lines.length ? lines.map(l => `<span>${esc(l.head)}</span>${src(l)}`).join('<span>, </span>') : '<span>Nothing popular right now targets this deck\'s plan.</span>';
  let h = `<details class="g-sec g29-fold" id="wo83-sec"${lines.length ? ' open data-go37-open' : ''}><summary><span class="r38-t"><span class="g36-tr"><span class="g-sec-t">Watch out for</span>${lines.length ? `<span class="g29-n">${lines.length}</span>` : ''}</span><span class="r38-line">${what}</span></span></summary>
    <div class="g-sec-i">What the current meta can use against this deck's plan. It does not change the grade.</div>`;
  if (!lines.length) return h + `<p class="mu60-p">Nothing popular right now targets this deck's plan.</p></details>`;
  let few = false, tbl = false;
  lines.forEach(l => {
    h += `<div class="wo83-l" data-wo="${l.id}"><div class="wo83-h">${esc(l.head)}</div><p class="mu60-p">${l.say.map(esc).join(' ')}</p>`;
    if (l.cards.length) h += `<div class="wo83-cards">${l.cards.map(([n, s]) => `<span class="wo83-c"><span data-no-tr>${esc(n)}</span><b>${wo83Pc(s)}</b></span>`).join('')}</div>
      <p class="mu60-f wo83-cf">Share of top lists that play each card.</p>`;
    const rows = l.decks.slice(0, WO83_ROWS);
    // With no record against any of them (or no deck picked), the decks show as names, not a table of empty rows.
    const known = arch && rows.some(x => { const r = mu60Sum(arch.vs[x.d.id]); return r[0] + r[1] + r[2] > 0; });
    if (rows.length && !known) h += `<div class="wo83-cards">${rows.map(x => `<span class="wo83-c"><span data-no-tr>${esc(x.d.name)}</span></span>`).join('')}</div>
      <p class="mu60-f wo83-cf">Most played in these decks.</p>`;
    else if (rows.length && (tbl = true)) h += `<div class="mu60-t wo83-t" role="table" aria-label="Decks that do this most">
      <div class="mu60-r mu60-h" role="row"><span role="columnheader">Against</span><span role="columnheader">Win rate</span><span role="columnheader">Matches</span></div>
      ${rows.map(x => {
        const r = arch ? mu60Sum(arch.vs[x.d.id]) : [0, 0, 0], n = r[0] + r[1] + r[2], p = mu60Pct(r);
        const thin = n < MU60_FEW;
        if (thin) few = true;
        return `<div class="mu60-r${thin ? ' thin' : ''}" role="row"><span role="cell">${esc(x.d.name)}</span>
          <span role="cell" class="mu60-p2 ${thin || p == null ? '' : mu60Tone(p)}">${p == null ? 'None' : mu60Fmt(p)}</span>
          <span role="cell" class="mu60-n">${n}</span></div>`;
      }).join('')}</div>`;
    h += `</div>`;
  });
  if (!arch) h += `<p class="mu60-f">Pick the closest deck under Against the meta to see how it did against these.</p>`;
  else if (tbl) h += `<p class="mu60-f">Win rates are for all ${esc(arch.name)} lists, as in Against the meta.</p>`;
  if (few) h += `<p class="mu60-f">Gray rows have fewer than ${MU60_FEW} matches, too few to trust.</p>`;
  return h + `</details>`;
}

(function () {
  if (typeof renderGrade !== 'function') return;
  const _rg = renderGrade;
  renderGrade = function () {
    const r = _rg.apply(this, arguments);
    try {
      if (!wo83On()) return r;
      const deck = state.decks.find(d => d.id === state.activeDeckId);
      const el = document.getElementById('grade-body');
      if (!deck || !el || el.querySelector('#wo83-sec')) return r;
      const after = el.querySelector('#mu60-sec') || el.querySelector('#r29-sec') || el.querySelector('#g29-fix');
      if (!after) return r;
      const h = wo83Section(deck);
      if (h) after.insertAdjacentHTML('afterend', h);
    } catch (e) { console.warn('[watch out]', e); }
    return r;
  };
})();
