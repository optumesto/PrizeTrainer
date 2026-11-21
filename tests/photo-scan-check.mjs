// Checks parts of photo deck import that need no card pictures: one box for each card, and the
// count read from a count badge with marks beside it. The pictures are drawn here, so the check
// runs anywhere sharp does (it renders the SVG).
//
// Usage: node tests/photo-scan-check.mjs   (needs sharp: npm install --no-save sharp)
// 3.4.31: added after a deck image (cards in a tight grid, a red count badge at the bottom of
// each) read 65 cards for 60: two cards read twice, a 3 read as 4 and a 2 read as 24.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PS = require('../js/photo-scan.js');
const sharp = require('sharp');

let fails = 0, n = 0;
function check(ok, what) { n++; if (!ok) { fails++; console.log('FAIL ' + what); } }

// 1. One box for each card: a box that mostly covers one already kept is the same card.
{
  const b = (x, y) => ({ x, y, w: 100, h: 140 });
  const out = PS.oneBoxEach([b(0, 0), b(110, 0), b(111, 1), b(220, 0), b(110, 150), b(150, 0)]);
  check(out.length === 4, `oneBoxEach keeps 4 boxes, got ${out.length}`);
  check(!out.some(o => o.x === 111), 'oneBoxEach drops the box read twice');
  check(!out.some(o => o.x === 150), 'oneBoxEach drops a box half over two cards it already has');
  check(PS.oneBoxEach([b(0, 0), b(60, 0)]).length === 2, 'oneBoxEach keeps two boxes that overlap less than half');
}

// 2. Counts from a red hexagon badge at the bottom of each card, the way some deck image makers
// draw them. Cards are grey with lines of "text" so other marks are near the badge.
const CW = 105, CH = 147, GAP = 3, COLS = 6;
const cards = [
  { n: 3 }, { n: 2, glare: true }, { n: 2 }, { n: 1, faint: '4' }, { n: 4 }, { n: 1 },
  { n: 13 }, { n: 9 }, { n: 2, glare: true }, { n: 3, faint: '4' }, { n: 1 }, { n: 4 },
];
const NAMES = ['Ralts', 'Kirlia', 'Mega Gardevoir ex', 'Frillish', 'Jellicent ex', 'Mew ex', 'Smoochum', 'Latias ex', 'Shaymin', 'Judge', 'Hilda', 'Switch'];
function cardSvg(c, x, y, i) {
  const cx = x + CW / 2, cy = y + CH * 0.83, r = CW * 0.13;
  const hex = [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 3 * k - Math.PI / 2; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
  let s = `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="5" fill="#c9b6d6" stroke="#9a9aa2" stroke-width="3"/>`;
  s += `<rect x="${x + 8}" y="${y + 18}" width="${CW - 16}" height="${CH * 0.32}" fill="#6a8a5a"/>`;
  for (let k = 0; k < 4; k++) s += `<rect x="${x + 10}" y="${(y + CH * 0.6 + k * 7).toFixed(1)}" width="${CW - 34 + (k % 2) * 12}" height="2" fill="#7a6a84"/>`;
  s += `<text x="${x + 8}" y="${y + 12}" font-family="DejaVu Sans" font-size="8" fill="#222">${NAMES[i]}</text><text x="${x + CW - 30 + (i % 3) * 4}" y="${y + 12}" font-family="DejaVu Sans" font-weight="bold" font-size="9" fill="#222">${60 + i * 10}</text>`;

  s += `<polygon points="${hex}" fill="#9e1b2e" stroke="#f0e8ec" stroke-width="1.5"/>`;
  s += `<text x="${cx}" y="${(cy + r * (c.n > 9 ? 0.38 : 0.56)).toFixed(1)}" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="${(r * (c.n > 9 ? 1.05 : 1.6)).toFixed(1)}" fill="#ffffff">${c.n}</text>`;
  if (c.glare) s += `<rect x="${(cx + r * 0.62).toFixed(1)}" y="${(cy - r * 0.42).toFixed(1)}" width="3.5" height="${(r * 0.95).toFixed(1)}" fill="#fff8f0"/>`;
  if (c.faint) s += `<text x="${(cx - 1).toFixed(1)}" y="${(cy + r * 0.35).toFixed(1)}" text-anchor="middle" font-family="DejaVu Sans" font-size="${(r * 0.85).toFixed(1)}" fill="#2a0408">${c.faint}</text>`;
  return s;
}
{
  const rows = Math.ceil(cards.length / COLS), W = 40 + COLS * (CW + GAP), H = 60 + rows * (CH + GAP);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#1e1e22"/>`;
  const boxes = [];
  cards.forEach((c, i) => { const x = 20 + (i % COLS) * (CW + GAP), y = 30 + Math.floor(i / COLS) * (CH + GAP); svg += cardSvg(c, x, y, i); boxes.push({ x, y, w: CW, h: CH }); });
  svg += '</svg>';
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  const got = PS.readCounts(px, info.width, info.height, boxes);
  cards.forEach((c, i) => check(got[i].n === c.n, `card ${i + 1}: count ${c.n}${c.glare ? ' beside a bright mark' : ''}${c.faint ? ' under a faint ' + c.faint : ''}, read ${got[i].n}`));
  // Each card found once, and every box on a card.
  const fc = PS.findCards(px, info.width, info.height).cards;
  check(fc.length === cards.length, `findCards: ${cards.length} cards, got ${fc.length}`);
}

console.log(`${n - fails} of ${n} photo scan checks pass.`);
if (fails) process.exitCode = 1;
