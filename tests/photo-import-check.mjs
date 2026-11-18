// Checks photo deck import on test screenshots: how many cards are found, named right and counted
// right. Uses the same js/photo-scan.js the app loads, and the built art index.
//
// Usage: node tests/photo-import-check.mjs <shots dir> [art-index.json] [art-index.bin]
// The shots dir holds the pictures and truth.json ([{ file, layout, cards: [{ name, set, num, count }] }]).
// Needs sharp to read PNG and JPEG files.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PS = require('../js/photo-scan.js');
const sharp = require('sharp');

const DIR = process.argv[2] || 'shots';
const meta = JSON.parse(await readFile(process.argv[3] || 'art-index.json', 'utf8'));
const idx = PS.loadIndex(meta, await readFile(process.argv[4] || 'art-index.bin'));
const truth = JSON.parse(await readFile(`${DIR}/truth.json`, 'utf8'));
const only = process.env.ONLY || '';

const norm = s => String(s).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const by = {};
let T = { cards: 0, found: 0, name: 0, count: 0, both: 0, extra: 0, decks: 0, decksOk: 0, ms: 0, sureWrong: 0, unsureRight: 0 };
const misses = [];
for (const t of truth) {
  if (only && !t.file.includes(only)) continue;
  const { data, info } = await sharp(`${DIR}/${t.file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  const t0 = Date.now();
  const rows = PS.readDeck(idx, px, info.width, info.height);
  const ms = Date.now() - t0;
  const L = by[t.layout] || (by[t.layout] = { cards: 0, found: 0, name: 0, count: 0, both: 0, decks: 0, decksOk: 0 });
  let ok = true;
  const used = new Set();
  for (const c of t.cards) {
    T.cards++; L.cards++;
    // the found box over this card
    let hit = -1, bestO = 0;
    rows.forEach((r, i) => {
      if (used.has(i)) return;
      const b = r.box, a = c.box;
      if (!a) return;
      const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const o = ix * iy / (a.w * a.h + b.w * b.h - ix * iy);
      if (o > bestO) { bestO = o; hit = i; }
    });
    if (hit < 0 || bestO < 0.5) { ok = false; misses.push(`${t.file}: not found ${c.name}`); continue; }
    used.add(hit);
    T.found++; L.found++;
    const r = rows[hit], m = r.matches[0];
    const nameOk = m && norm(m.name) === norm(c.name);
    const countOk = r.count === c.count;
    if (nameOk) { T.name++; L.name++; if (r.sure < 0.35) T.unsureRight++; } else {
      if (r.sure >= 0.35) T.sureWrong++;
      // Why: was the box off, or does the picture itself not match its print?
      const b = r.box, a = c.box, ti = meta.prints.findIndex(p => p[1] === c.set && String(p[2]) === String(c.num));
      const off = `box off x ${((b.x - a.x) / a.w).toFixed(3)} y ${((b.y - a.y) / a.h).toFixed(3)} w ${(b.w / a.w).toFixed(3)} h ${(b.h / a.h).toFixed(3)}`;
      let why = ti < 0 ? 'print not in index' : '';
      if (ti >= 0) {
        const onFound = PS.scorePrint(idx, px, info.width, info.height, b, ti), onTrue = PS.scorePrint(idx, px, info.width, info.height, a, ti);
        const best = PS.matchBox(idx, px, info.width, info.height, a, 3)[0];
        const bn = best ? meta.names[meta.prints[best.i][0]] : '';
        why = `right print scores ${onFound.toFixed(3)} on found box, ${onTrue.toFixed(3)} on true box; best on true box ${bn} ${best ? best.s.toFixed(3) : ''}; top on found ${m ? m.s.toFixed(3) : ''}`;
      }
      misses.push(`${t.file}: ${c.name} ${c.set} ${c.num} [${c.src}] read as ${m ? m.name + ' ' + m.set + ' ' + m.num : 'nothing'} (sure ${r.sure.toFixed(2)}); ${off}; ${why}`);
    }
    if (countOk) { T.count++; L.count++; } else misses.push(`${t.file}: ${c.name} count ${c.count} read as ${r.count} (sure ${r.countSure.toFixed(2)})`);
    if (nameOk && countOk) { T.both++; L.both++; } else ok = false;
  }
  T.extra += rows.length - used.size;
  if (rows.length - used.size) ok = false;
  T.decks++; L.decks++; if (ok) { T.decksOk++; L.decksOk++; }
  T.ms += ms;
}
const pc = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '-');
console.log(`Index: ${meta.prints.length} prints of ${meta.names.length} cards.`);
console.log(`Screenshots: ${T.decks}. Cards: ${T.cards}. Found ${pc(T.found, T.cards)}, named right ${pc(T.name, T.cards)}, counted right ${pc(T.count, T.cards)}, both ${pc(T.both, T.cards)}. Extra boxes: ${T.extra}.`);
console.log(`Whole screenshots with every card and count right: ${T.decksOk} of ${T.decks}. Wrong but marked sure: ${T.sureWrong}. Right but marked unsure: ${T.unsureRight}. Average read time ${(T.ms / Math.max(1, T.decks)).toFixed(0)} ms.`);
for (const [k, L] of Object.entries(by)) console.log(`  ${k}: found ${pc(L.found, L.cards)}, named ${pc(L.name, L.cards)}, counted ${pc(L.count, L.cards)}, whole lists ${L.decksOk}/${L.decks}`);
if (process.env.SHOW) console.log(misses.slice(0, +process.env.SHOW || 60).join('\n'));
