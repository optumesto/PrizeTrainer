// ═══════════ 3.4: Photo deck import, the picture reading ═══════════
// Reads a deck screenshot (most often Pokémon TCG Live's deck view: whole cards in a grid, each
// with a count) on this device. Nothing here sends the picture anywhere: it is read from the
// file the player picks into a canvas, and only card names, sets, numbers and counts come out.
//
// Three steps, all plain pixel math with no library:
// 1. Find the cards: what differs from the background, grouped into card shaped boxes. Cards that
//    touch are split by the size of the cards that stand alone.
// 2. Match each card's picture against art-index.bin, a small fingerprint of every print of every
//    Standard legal card (built weekly by build-art-index.mjs from the official card images).
// 3. Read the count: small digit shapes near the card, compared with digit shapes from common
//    fonts. The count badge sits in the same place on every card, so the place most cards agree
//    on is trusted most.
//
// The same file runs in Node for tests/photo-import-check.mjs and build-art-index.mjs, so the
// fingerprint the index stores and the one the app reads are made by the same code.
(function (root) {
  'use strict';

  // ── Fingerprint of a card picture ──
  // The card's top four fifths (name, art, and the top of the text box; the count badge often
  // covers the bottom), as an 8 x 10 grid of brightness and a 4 x 5 grid of colour.
  const FX = 8, FY = 10, CX = 4, CY = 5;
  const FEAT = FX * FY + 2 * CX * CY;   // 120 bytes a print
  const WIN = { x0: 0.07, x1: 0.93, y0: 0.045, y1: 0.78 };
  const CARD_AR = 63 / 88;              // width over height of a card

  /** Fingerprint of the card in box r = {x, y, w, h} of an RGBA picture. */
  function feat(px, W, H, r) {
    const out = new Uint8Array(FEAT);
    const ys = new Float64Array(FX * FY), cb = new Float64Array(FX * FY), cr = new Float64Array(FX * FY);
    const x0 = r.x + r.w * WIN.x0, x1 = r.x + r.w * WIN.x1, y0 = r.y + r.h * WIN.y0, y1 = r.y + r.h * WIN.y1;
    const cw = (x1 - x0) / FX, ch = (y1 - y0) / FY;
    for (let gy = 0; gy < FY; gy++) {
      const ya = Math.max(0, Math.floor(y0 + gy * ch)), yb = Math.min(H, Math.max(ya + 1, Math.floor(y0 + (gy + 1) * ch)));
      for (let gx = 0; gx < FX; gx++) {
        const xa = Math.max(0, Math.floor(x0 + gx * cw)), xb = Math.min(W, Math.max(xa + 1, Math.floor(x0 + (gx + 1) * cw)));
        let sr = 0, sg = 0, sb = 0, n = 0;
        for (let y = ya; y < yb; y++) {
          let i = (y * W + xa) * 4;
          for (let x = xa; x < xb; x++, i += 4) { sr += px[i]; sg += px[i + 1]; sb += px[i + 2]; n++; }
        }
        if (!n) n = 1;
        const R = sr / n, G = sg / n, B = sb / n, k = gy * FX + gx;
        ys[k] = 0.299 * R + 0.587 * G + 0.114 * B;
        cb[k] = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
        cr[k] = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
      }
    }
    for (let k = 0; k < FX * FY; k++) out[k] = Math.round(ys[k]);
    for (let gy = 0; gy < CY; gy++) for (let gx = 0; gx < CX; gx++) {
      let b = 0, c = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const k = (gy * 2 + dy) * FX + gx * 2 + dx; b += cb[k]; c += cr[k]; }
      out[FX * FY + gy * CX + gx] = Math.round(b / 4);
      out[FX * FY + CX * CY + gy * CX + gx] = Math.round(c / 4);
    }
    return out;
  }

  /** Brightness part, centred and scaled to length 1, so lighting and contrast do not matter. */
  function normY(f, off) {
    const v = new Float32Array(FX * FY);
    let m = 0;
    for (let k = 0; k < FX * FY; k++) m += f[off + k];
    m /= FX * FY;
    let s = 0;
    for (let k = 0; k < FX * FY; k++) { v[k] = f[off + k] - m; s += v[k] * v[k]; }
    s = Math.sqrt(s) || 1;
    for (let k = 0; k < FX * FY; k++) v[k] /= s;
    return v;
  }

  /** The index: names and prints from art-index.json, fingerprints from art-index.bin. */
  function loadIndex(meta, bin) {
    const n = meta.prints.length;
    const raw = bin instanceof Uint8Array ? bin : new Uint8Array(bin);
    if (raw.length < n * FEAT) throw new Error('art index is short');
    const ny = new Float32Array(n * FX * FY), col = new Int16Array(n * 2 * CX * CY);
    for (let i = 0; i < n; i++) {
      ny.set(normY(raw, i * FEAT), i * FX * FY);
      for (let k = 0; k < 2 * CX * CY; k++) col[i * 2 * CX * CY + k] = raw[i * FEAT + FX * FY + k] - 128;
    }
    return { meta, n, ny, col };
  }

  const COL_W = 0.0045;   // how much colour counts against shape, tuned on the test screenshots

  /** Score of fingerprint q against print i: higher is closer, about 1 for the same picture. */
  function scoreOne(idx, qy, qc, i) {
    let d = 0;
    const o = i * FX * FY;
    for (let k = 0; k < FX * FY; k++) d += qy[k] * idx.ny[o + k];
    let c = 0;
    const oc = i * 2 * CX * CY;
    for (let k = 0; k < 2 * CX * CY; k++) c += Math.abs(qc[k] - idx.col[oc + k]);
    return d - COL_W * c / (2 * CX * CY) * 4;
  }
  function query(f) {
    const qc = new Int16Array(2 * CX * CY);
    for (let k = 0; k < 2 * CX * CY; k++) qc[k] = f[FX * FY + k] - 128;
    return { qy: normY(f, 0), qc };
  }

  /**
   * Best prints for the card in box r. The box is tried a little to each side and a little
   * larger and smaller, since a found box is never exact.
   * Returns [{ i, s }] best first, one per card name (the best print of each name).
   */
  function matchBox(idx, px, W, H, r, keep) {
    const base = query(feat(px, W, H, r));
    const all = [];
    for (let i = 0; i < idx.n; i++) all.push({ i, s: scoreOne(idx, base.qy, base.qc, i) });
    all.sort((a, b) => b.s - a.s);
    const short = all.slice(0, 40);
    const tries = [];
    for (const sc of [0.96, 1, 1.04]) for (const dx of [-0.025, 0, 0.025]) for (const dy of [-0.02, 0, 0.02]) {
      if (sc === 1 && !dx && !dy) continue;
      const w = r.w * sc, h = r.h * sc;
      tries.push(query(feat(px, W, H, { x: r.x + (r.w - w) / 2 + dx * r.w, y: r.y + (r.h - h) / 2 + dy * r.h, w, h })));
    }
    for (const c of short) for (const q of tries) { const s = scoreOne(idx, q.qy, q.qc, c.i); if (s > c.s) c.s = s; }
    short.sort((a, b) => b.s - a.s);
    const seen = new Set(), out = [];
    for (const c of short) {
      const nm = idx.meta.names[idx.meta.prints[c.i][0]];
      if (seen.has(nm)) continue;
      seen.add(nm); out.push(c);
      if (out.length >= (keep || 6)) break;
    }
    return out;
  }

  // ── Finding the cards ──

  /** A smaller copy, at most `max` wide or high, by averaging (so JPEG noise smooths out). */
  function shrink(px, W, H, max) {
    const f = Math.max(1, Math.max(W, H) / max);
    const w = Math.max(1, Math.round(W / f)), h = Math.max(1, Math.round(H / f));
    const out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      const ya = Math.floor(y * f), yb = Math.max(ya + 1, Math.min(H, Math.floor((y + 1) * f)));
      for (let x = 0; x < w; x++) {
        const xa = Math.floor(x * f), xb = Math.max(xa + 1, Math.min(W, Math.floor((x + 1) * f)));
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) { const i = (yy * W + xx) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
        const o = (y * w + x) * 4;
        out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
      }
    }
    return { px: out, W: w, H: h, f };
  }

  /** Background colour near each pixel: the most common colour in each band of rows, read
   *  from the picture's left and right edges (a screen background can shade from top to bottom). */
  function background(s) {
    const { px, W, H } = s;
    const band = Math.max(4, Math.round(H / 24)), edge = Math.max(2, Math.round(W * 0.02));
    const rows = [];
    for (let b0 = 0; b0 < H; b0 += band) {
      const vals = [[], [], []];
      for (let y = b0; y < Math.min(H, b0 + band); y++) for (const xs of [[0, edge], [W - edge, W]]) for (let x = xs[0]; x < xs[1]; x++) {
        const i = (y * W + x) * 4; vals[0].push(px[i]); vals[1].push(px[i + 1]); vals[2].push(px[i + 2]);
      }
      rows.push(vals.map(v => { v.sort((a, b) => a - b); return v[v.length >> 1]; }));
    }
    return y => rows[Math.min(rows.length - 1, Math.floor(y / band))];
  }

  /** Pixels that are not background, as 0/1. */
  function foreground(s) {
    const { px, W, H } = s, bg = background(s);
    const d = new Float32Array(W * H);
    const hist = new Uint32Array(256);
    for (let y = 0; y < H; y++) {
      const c = bg(y);
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const v = Math.abs(px[i] - c[0]) + Math.abs(px[i + 1] - c[1]) + Math.abs(px[i + 2] - c[2]);
        d[y * W + x] = v; hist[Math.min(255, v >> 1)]++;
      }
    }
    // Otsu's threshold on the distance, never below a small floor (a flat background is all near 0).
    let sum = 0, tot = W * H;
    for (let k = 0; k < 256; k++) sum += k * hist[k];
    let sB = 0, wB = 0, best = 0, th = 20;
    for (let k = 0; k < 256; k++) {
      wB += hist[k]; if (!wB) continue;
      const wF = tot - wB; if (!wF) break;
      sB += k * hist[k];
      const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; th = k; }
    }
    const cut = Math.max(30, Math.min(60, th));
    const m = new Uint8Array(W * H);
    for (let k = 0; k < W * H; k++) m[k] = d[k] > cut ? 1 : 0;
    const out = close(m, W, H, 1);
    out.bg = bg; out.cut = cut;
    return out;
  }

  function close(m, W, H, r) {
    const dil = new Uint8Array(W * H), out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = 0;
      for (let dy = -r; dy <= r && !v; dy++) for (let dx = -r; dx <= r; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < H && xx >= 0 && xx < W && m[yy * W + xx]) { v = 1; break; }
      }
      dil[y * W + x] = v;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = 1;
      for (let dy = -r; dy <= r && v; dy++) for (let dx = -r; dx <= r; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < H && xx >= 0 && xx < W && !dil[yy * W + xx]) { v = 0; break; }
      }
      out[y * W + x] = v;
    }
    return out;
  }

  /** Connected parts of a 0/1 mask, with their boxes and pixel counts. */
  function parts(m, W, H) {
    const lab = new Int32Array(W * H), out = [];
    const stack = new Int32Array(W * H);
    let id = 0;
    for (let s = 0; s < W * H; s++) {
      if (!m[s] || lab[s]) continue;
      id++;
      let sp = 0, x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
      stack[sp++] = s; lab[s] = id;
      while (sp) {
        const p = stack[--sp], x = p % W, y = (p / W) | 0;
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && m[p - 1] && !lab[p - 1]) { lab[p - 1] = id; stack[sp++] = p - 1; }
        if (x < W - 1 && m[p + 1] && !lab[p + 1]) { lab[p + 1] = id; stack[sp++] = p + 1; }
        if (y > 0 && m[p - W] && !lab[p - W]) { lab[p - W] = id; stack[sp++] = p - W; }
        if (y < H - 1 && m[p + W] && !lab[p + W]) { lab[p + W] = id; stack[sp++] = p + W; }
      }
      out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
    }
    return out;
  }

  function median(a) { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; }

  /** Share of the box that is foreground. */
  function fill(m, W, b) {
    let n = 0;
    const x1 = Math.min(W, Math.round(b.x + b.w)), y1 = Math.round(b.y + b.h);
    for (let y = Math.max(0, Math.round(b.y)); y < y1; y++) for (let x = Math.max(0, Math.round(b.x)); x < x1; x++) n += m[y * W + x] || 0;
    return n / Math.max(1, b.w * b.h);
  }

  /** Brightness of the small copy. */
  function lumOf(s) {
    const L = new Float32Array(s.W * s.H);
    for (let k = 0; k < s.W * s.H; k++) L[k] = s.px[k * 4] * 0.299 + s.px[k * 4 + 1] * 0.587 + s.px[k * 4 + 2] * 0.114;
    return L;
  }

  /** Card edges by column (dir 'v') or by row ('h'): how many strong changes of brightness each has. */
  function edgeProfile(s, L, m, dir) {
    const { W, H } = s, out = new Float32Array(dir === 'v' ? W : H);
    if (dir === 'v') { for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) { const k = y * W + x; if ((m[k] || m[k - 1]) && Math.abs(L[k] - L[k - 1]) > 18) out[x]++; } }
    else { for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if ((m[k] || m[k - W]) && Math.abs(L[k] - L[k - W]) > 18) out[y]++; } }
    const sm = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) sm[i] = Math.max(out[i], out[i - 1] || 0, out[i + 1] || 0);   // a line one pixel off still counts
    return sm;
  }

  /**
   * The card grid along a profile: step (card plus gap), card size and start, found by trying
   * them all. A grid scores by how much stronger the edges on its lines are than edges overall,
   * times the square root of its line count, so a grid of half the cards (every other card) or
   * lines through the middle of cards both lose to the real one.
   */
  function bestGrid(E, lo, hi, sizeOf, from, to) {
    let mean = 0; for (let i = from; i <= to; i++) mean += E[i]; mean /= Math.max(1, to - from + 1);
    let best = null;
    for (let st = Math.max(4, Math.floor(lo)); st <= hi; st += 0.25) {
      for (const size of sizeOf(st)) for (let p0 = from - st + 1; p0 <= from; p0 += 1) {
        let sum = 0, n = 0;
        for (let k = 0; ; k++) {
          const a = Math.round(p0 + k * st); if (a > to) break;
          const b = Math.round(p0 + k * st + size);
          if (a >= from) { sum += E[a] || 0; n++; }
          if (b >= from && b <= to) { sum += E[b] || 0; n++; }
        }
        if (n < 2) continue;
        const sc = (sum / n - mean) * Math.sqrt(n);
        if (!best || sc > best.s) best = { step: st, size, start: p0, s: sc };
      }
    }
    return best;
  }

  /**
   * Card boxes in the picture, in reading order, in the picture's own pixels.
   * Returns { cards: [{x, y, w, h}], cardW, cardH }.
   */
  function findCards(px, W, H) {
    const s = shrink(px, W, H, 900);
    const m = foreground(s);
    const L = lumOf(s);
    const ps = parts(m, s.W, s.H).filter(p => p.w >= s.W * 0.035 && p.h >= s.H * 0.02 && p.w * p.h >= s.W * s.H * 0.0012);
    if (!ps.length) return { cards: [], cardW: 0, cardH: 0 };
    // Most deck screens (Pokémon TCG Live's included) leave a gap round every card, so many cards
    // stand alone. When enough do, their size and places give the grid directly, and a header,
    // tab bar or caption bar across the picture cannot pull it off.
    const fromSingles = gridFromSingles(s, m, ps);
    if (fromSingles) {
      const f = s.f, full = { px, W, H, bg: y => m.bg(y / f), cut: m.cut };
      return {
        cards: fromSingles.boxes.map(b => snap(full, { x: b.x * f, y: b.y * f, w: b.w * f, h: b.h * f })),
        cardW: fromSingles.cw * f, cardH: fromSingles.ch * f,
      };
    }
    const big = ps.filter(p => p.w * p.h >= s.W * s.H * 0.004);
    const fx = Math.min(...big.map(p => p.x)), tx = Math.max(...big.map(p => p.x + p.w));
    const fy = Math.min(...big.map(p => p.y)), ty = Math.max(...big.map(p => p.y + p.h));
    // Columns: the card width and the step from one card to the next, from the card edges.
    const EV = edgeProfile(s, L, m, 'v');
    const gx = bestGrid(EV, Math.max(s.W / 18, (tx - fx) / 16), Math.min(s.W / 1.6, tx - fx), st => [st], fx, tx);
    if (!gx) return { cards: [], cardW: 0, cardH: 0 };
    // The card width inside each step: the gap between cards is background in most rows.
    {
      const MC = new Float32Array(s.W);
      for (let y = fy; y < ty; y++) for (let x = 0; x < s.W; x++) MC[x] += m[y * s.W + x];
      const A = new Float32Array(Math.ceil(gx.step) + 1), An = new Float32Array(A.length);
      for (let x = fx; x < tx; x++) { const o = Math.floor(((x - gx.start) % gx.step + gx.step) % gx.step); A[o] += MC[x]; An[o]++; }
      for (let o = 0; o < A.length; o++) A[o] = An[o] ? A[o] / An[o] : 0;
      const top = Math.max(...A);
      // The gap: the longest run of low columns (going round the step), so the card starts where it ends.
      const n = A.length - 1;
      let bestRun = 0, bestEnd = 0;
      for (let o = 0; o < n; o++) {
        let r = 0;
        while (r < n && A[(o + r) % n] < top * 0.55) r++;
        if (r > bestRun && r < n * 0.25) { bestRun = r; bestEnd = (o + r) % n; }
      }
      gx.size = Math.max(gx.step * 0.84, gx.step - bestRun);
      if (bestRun) gx.start += bestEnd;
      while (gx.start > fx) gx.start -= gx.step;
    }
    // Sharper: the same columns read again at full size, where a pixel is a smaller error.
    {
      const f = s.f, Y0 = Math.max(0, Math.round(fy * f)), Y1 = Math.min(H, Math.round(ty * f)), X0 = fx * f, X1 = tx * f;
      const E0 = new Float32Array(W), E = new Float32Array(W);
      // Only where the picture changes between background and card: a card's own frame has edges too.
      for (let y = Y0; y < Y1; y += 2) {
        const c = m.bg(y / f);
        let prev = false;
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const fg = Math.abs(px[i] - c[0]) + Math.abs(px[i + 1] - c[1]) + Math.abs(px[i + 2] - c[2]) > m.cut;
          if (x && fg !== prev) E0[x]++;
          prev = fg;
        }
      }
      for (let x = 0; x < W; x++) E[x] = Math.max(E0[x], E0[x - 1] || 0, E0[x + 1] || 0);
      let best = null;
      for (let st = gx.step * f * 0.985; st <= gx.step * f * 1.015; st += 0.1)
        for (let sz = gx.size * f * 0.96; sz <= Math.min(st, gx.size * f * 1.04); sz += 0.25)
          for (let p0 = gx.start * f - 5; p0 <= gx.start * f + 5; p0 += 0.5) {
            let sc = 0;
            for (let k = 0; ; k++) {
              const a = p0 + k * st; if (a > X1 + 2) break;
              if (a + sz < X0 - 2) continue;
              if (a >= X0 - 3) sc += E[Math.round(a)] || 0;
              if (a + sz <= X1 + 3) sc += E[Math.round(a + sz)] || 0;
            }
            if (!best || sc > best.s) best = { s: sc, st, sz, p0 };
          }
      if (best) { gx.step = best.st / f; gx.size = best.sz / f; gx.start = best.p0 / f; }
    }
    const cw = gx.size, ch = cw / CARD_AR;
    // Rows: the step from one row to the next (a count under the card makes it longer than a card).
    const EH = edgeProfile(s, L, m, 'h');
    const gy = bestGrid(EH, ch * 0.98, ch * 1.45, () => [ch], fy, ty);
    const rowStep = gy ? gy.step : ch * 1.1;
    const boxes = [];
    for (const p of ps) {
      if (p.w < cw * 0.6 || p.h < ch * 0.55) continue;
      // Columns follow the grid found above (every card of a grid shares them).
      const cols = [];
      for (let k = Math.floor((p.x - gx.start) / gx.step) - 1; ; k++) {
        const x = gx.start + k * gx.step;
        if (x > p.x + p.w - cw * 0.6) break;
        if (x + cw < p.x + cw * 0.6) continue;
        cols.push(x);
      }
      // Rows: where in this part the card tops and bottoms line up best (a title above the
      // cards or a count below them can be part of it too).
      let y0 = p.y, bestS = -1;
      for (let o = 0; o < rowStep && p.y + o + ch <= p.y + p.h + ch * 0.15; o += 0.5) {
        let sc = 0;
        for (let y = p.y + o; y + ch * 0.85 <= p.y + p.h; y += rowStep) sc += (EH[Math.round(y)] || 0) + (EH[Math.round(y + ch)] || 0);
        if (sc > bestS) { bestS = sc; y0 = p.y + o; }
      }
      const rowsY = [];
      for (let y = y0; y + ch * 0.85 <= p.y + p.h + 1; y += rowStep) rowsY.push(y);
      for (const y of rowsY) for (const x of cols) {
        const b = { x, y, w: cw, h: ch };
        if (fill(m, s.W, b) > 0.6) boxes.push(b);
      }
    }
    // Reading order: rows, then left to right.
    boxes.sort((a, b) => (Math.abs(a.y - b.y) < ch * 0.4 ? a.x - b.x : a.y - b.y));
    const f = s.f, full = { px, W, H, bg: y => m.bg(y / f), cut: m.cut };
    return {
      cards: boxes.map(b => snap(full, { x: b.x * f, y: b.y * f, w: b.w * f, h: b.h * f })),
      cardW: cw * f, cardH: ch * f,
    };
  }

  /** Steady spacing of positions v (one per card standing alone): step and start, fitted over
   *  all of them. min is the least the step can be (a card and nothing more). */
  function spacing(v, min, fallback) {
    const c = [];
    for (const x of v.slice().sort((a, b) => a - b)) { const l = c[c.length - 1]; if (l && x - l.at < min * 0.4) { l.sum += x; l.n++; l.at = l.sum / l.n; } else c.push({ at: x, sum: x, n: 1 }); }
    let step = 0;
    for (let i = 1; i < c.length; i++) { const d = c[i].at - c[i - 1].at; if (d >= min * 0.9 && (!step || d < step)) step = d; }
    if (!step) return { step: fallback, start: c[0].at, one: true };
    // Every gap between places is a whole number of steps: refit the step over all of them.
    let a = 0, b = 0;
    for (let i = 1; i < c.length; i++) { const d = c[i].at - c[0].at, k = Math.round(d / step); if (k) { a += d * k; b += k * k; } }
    if (b) step = a / b;
    let st = 0, n = 0;
    for (const x of c) { const k = Math.round((x.at - c[0].at) / step); st += x.at - k * step; n++; }
    return { step, start: st / n };
  }

  /** The grid from the cards that stand alone (see findCards), or null when too few do. */
  function gridFromSingles(s, m, ps) {
    const singles = ps.filter(p => {
      const ar = p.h / p.w;
      return ar > 1.28 && ar < 1.6 && p.w >= s.W * 0.04 && p.n / (p.w * p.h) > 0.4;
    });
    if (singles.length < 3) return null;
    const mw = median(singles.map(p => p.w));
    const ok = singles.filter(p => Math.abs(p.w - mw) < mw * 0.12);
    if (ok.length < 3) return null;
    const cw = median(ok.map(p => p.w)), ch = cw / CARD_AR;
    const gx = spacing(ok.map(p => p.x), cw, cw * 1.1), gy = spacing(ok.map(p => p.y), ch, ch * 1.08);
    if (gx.step > cw * 1.4 || gy.step > ch * 1.6) return null;
    const gap = gx.step - cw;
    const cols = [];
    for (let k = Math.floor((-gx.start) / gx.step); ; k++) { const x = gx.start + k * gx.step; if (x > s.W - cw * 0.85) break; if (x >= -cw * 0.15) cols.push(x); }
    const boxes = [];
    for (let k = Math.floor((-gy.start) / gy.step); ; k++) {
      const y = gy.start + k * gy.step;
      if (y > s.H - ch * 0.85) break;
      if (y < -ch * 0.15) continue;
      const row = cols.map(x => ({ x, y, w: cw, h: ch })).filter(b => fill(m, s.W, b) > 0.55);
      if (!row.length) continue;
      // A lone box needs to be mostly card: a deck icon or a button in a header is not.
      if (row.length === 1 && fill(m, s.W, row[0]) < 0.64) continue;
      // A real row of cards has background in the gaps between them; a bar across the picture
      // fills them all.
      if (gap >= 1.5) {
        const gs = [];
        for (let i = 1; i < row.length; i++) {
          if (row[i].x - row[i - 1].x > gx.step * 1.5) continue;
          gs.push(fill(m, s.W, { x: row[i - 1].x + cw + gap * 0.2, y: y + ch * 0.12, w: Math.max(1, gap * 0.6), h: ch * 0.6 }));
        }
        // At least one clear gap, since a glowing card can spill into the gaps on both its sides.
        if (gs.length && !gs.some(v => v < 0.35)) continue;
      }
      boxes.push(...row);
    }
    if (boxes.length < 3) return null;
    return { boxes, cw, ch };
  }

  /** Nudge a box (keeping its size) so its sides sit on the card's edges: the strongest change of
   *  brightness on both sides together, and on its top edge. */
  function snap(s, b) {
    const { px, W, H } = s;
    const fg = (x, y) => {
      x = Math.max(0, Math.min(W - 1, Math.round(x))); y = Math.max(0, Math.min(H - 1, Math.round(y)));
      const i = (y * W + x) * 4, c = s.bg(y);
      return Math.abs(px[i] - c[0]) + Math.abs(px[i + 1] - c[1]) + Math.abs(px[i + 2] - c[2]) > s.cut ? 1 : 0;
    };
    const edgeV = (x, y0, y1) => { let e = 0; for (let y = y0; y < y1; y += 2) e += fg(x, y) !== fg(x - 1, y) ? 1 : 0; return e; };
    const edgeH = (y, x0, x1) => { let e = 0; for (let x = x0; x < x1; x += 2) e += fg(x, y) !== fg(x, y - 1) ? 1 : 0; return e; };
    const rx = Math.max(2, Math.round(b.w * 0.02)), ry = Math.max(2, Math.round(b.h * 0.06));
    let bx = b.x, by = b.y, best = -1;
    for (let d = -rx; d <= rx; d++) { const e = edgeV(b.x + d, b.y + b.h * 0.3, b.y + b.h * 0.7) + edgeV(b.x + b.w + d, b.y + b.h * 0.3, b.y + b.h * 0.7) - Math.abs(d) * 0.1; if (e > best) { best = e; bx = b.x + d; } }
    best = -1;
    for (let d = -ry; d <= ry; d++) { const e = edgeH(b.y + d, bx + b.w * 0.25, bx + b.w * 0.75) - Math.abs(d) * 0.1; if (e > best) { best = e; by = b.y + d; } }
    return { x: bx, y: by, w: b.w, h: b.h };
  }

  // ── Reading the count ──
  /* DIGITS_START */
  const DIGITS = [
    '00800048d5fcd951002af8f7b1f5fb3396ff840078ffa2d1ff4e0042ffddeaff3e0031fff5eaff3e0031fff6d1ff4f0042ffdd96ff850079ffa22af8f8b1f5fb340049d5fcd95100',
    '10729ad5fdffb40000f1f7f4ffb400003109abffb400000000abffb400000000abffb400000000abffb400000000abffb400000000abffb40000bdd6f1fff3d6c4e2ffffffffffea',
    '207389d0f5fcdd7a03ecedb7d7ffff7a63090004caffcc00000000a7ffc30000002ef4ff5c000036eaff8a010044f1fe7e010055f8fc69000000f1fffbe9e9e9d3f2ffffffffffe7',
    '307370dff8fce3940d97d0abc5ffff940c000000b4ffc200050d2cd8ff7f0069ffffffad04003f9ab9fdff840000000088fff01c0000008cfff3fac9a9c3feff99b1e4fcf8d57b07',
    '4084000007dbffcd00000072ffffcd000014eec9ffcd000093ea4fffcd002afa6a3fffcd00b4d5053fffcd00f6d5adc1ffefadf6ffffffffffff282a2a5effd52a0000003fffcd00',
    '50759cffffffffff409cffefe9e9e93a9cff45000000009cffd5d6b74d009cf6d8f0fffd532a0b000dc7ffc50000000079ffe64f030003b5ffccf8e4b4d5ffff5f96d9f9fad15d00',
    '60780021aff3f9d23612e2ffd1abd95782ffad0200010acdff626e6d1f00eefffafffff338f2ffc835a6ffbadbff720044ffe5a0ff89005affce30faf7b0ecff6a004bd5fce37401',
    '7076fefffffffffffef2f3f3f3faffee00000000c2ff8c00000031fefc240000009cffb300000014f5ff4800000076ffd902000004e0ff6e00000051fff210000000bcff96000000',
    '80770e9debfde9960a93ffeeaef1ff86c1ff6b0079ffb386ffaa30b5ff7806b4ffffffa70375fed584dbfe66e7ff3c004bffd8efff470057ffe0a7ffeaaeeeff98109debfde9960c',
    '9077027be5fcd34a0077ffeab1f9fa32deff53008dffa5f7ff370073ffe1d3ff8d19befff853fcfffffefff400398a8870ffd30b000002aaff8667d5abd2ffe21441d6faf2ad2000',
    'x11496ff78006fffa026fce006dafd2e00afff9affb700003cffffff43000001c8ffd001000005ddffe508000057fffbff610001c9ff6efed3023fffca01c3ff49b2ff5d0055ffbc',
    '00680062ddfce16a003efde38cdcfe49a2ff530044ffafd2ff240014ffe1e6ff16000afbf6e5ff16000afbf6cfff250016ffdf9bff560049ffa934fbe48ee0fd3e0056dafcdc5c00',
    '10690045daff9a000097fee9ff9a0000bc546cff9a000004006bff9a000000006bff9a000000006bff9a000000006bff9a000000006bff9a00007179b2ffca7971eeffffffffffed',
    '20690584e4fde790097effdf96dbff8ba3d234003effcf000000005fffbb00000036eefd47000056f5fb67000068fceb4400004bfce325000000dfffcb9c9c9c9bfafffffffffffd',
    '3072016fdffde688055dffdf92dfff747ec633004affac0000000179ff7e00006cebf68c07000054b6f0e5410000000029fdd5b0e425001afde780ffdf98d5ff9e0481e2fdea980d',
    '408000000080ffbb0000001df4fdbb000000a3c7e9bb000037fc3cecbb0002c5a700ecbb0059f61f00ecbb00d8d27e7ef5dd72e2f6f6f6fefde004050505ecbc0400000000ecbb00',
    '507358ffffffffff6168ffaa7575752d77ff560000000086ff809d9c440095fffff0fffd55598d460063ffcb000000000dfcec88b0170031ffd38bffd595e3ff6c078de8fdde7101',
    '60690041cdfbeb860327f5ef93d5ff6395ff570020602bd2fe1547501300edf8d0ffffef36f1ff8b1a82ffbddeff200011ffeaa8ff4b0029ffd939fbe78bd5ff7e0050d4fce88605',
    '7069faffffffffffef9ea1a1a1a9fee0000000008aff5a00000038fbba01000004cefb2c0000005cffa800000001ccff3f00000026ffea040000005fffb8000000007cff9f000000',
    '80720487e6fde5850471ffc263c8ff6cabff470051ffa47cff720079ff7607a1fee8fd9b0649f2cb80cef34bd0fe1f0025ffcee1fe19001fffdc96ffb663b7ff920a92e8fde7910a',
    '9069078be7fcd959008dffd48eebfc3ae8ff230056ffa2f7fe09002cffd4ccff680889ffe74bfafff8dbffe40029706027ffca4b82150062ff8e7effca93f2f2220796eefac93c00',
    'x1058cff4e0043ff9a1bf6be00b3fa240095fe57fca100001ff9f6fc28000000a1ffad00000000c4ffd40200003fffd4ff510000b8f421efc80134fe99008fff45acfe2b0023fcbe',
    '00800047d5fbd445002af7f4b2f4f72797ff530056ff94d5f5060007f6d2efdd000000dfedefdd000000dfedd5f4050006f6d398ff520055ff962bf8f4b5f5f82a0048d5fbd54700',
    '1045001c88eefffff999f8ffeffffff9ebc9573dfffff933010038fffff900000038fffff900000038fffff900000038fffff900000038fffff900000038fffff900000038fffff9',
    '2073037de3fbd866007effdea7eeff5de1fa180046ffb82827000039ffb000000007c0ff4a000008b1ff8c00000ab7ff9602000cbdff97020000b6fff9adabab99ddffffffffffe5',
    '30750062d9fadd670059ffe4a2e5ff5393d527003dffa10000000063ff8000006addfd9f0b000052abe9ef53000000001ffce5c0db1b001cfcf382ffe7b0e7ff960378dffae18106',
    '408200000095ffe700000027f9ffe7000000acf2dae700003afe7fc2e70001c4e60dc2e70051ff6700c2e700d1f87672ddf270eafffffffffff931363636d5ec3500000000cae700',
    '507454ffffffffff646affc5acacac4481ff3b0000000098ff508f8d2f00aefff6ebfff83d3570290062ffbb0000000006f6e6c9de17002ffecb82ffdea3eaff5a037ae1fbd85e00',
    '60760030c4fae26e0018ebfcc7ecff6083ff680022d4a3c9f7176b7c2b00ebe7cff6fef741f0ff860551fec1dcff160000dfeea1ff440019f6d531f9efa1dfff690048d1fce16e01',
    '7071f4ffffffffffeeaab1b1b1c3ffe9000000008bff8c00000017f4f4170000008aff8d00000017f3f4180000008aff8e00000016f2f51900000089ff8f00000014f2f61b000000',
    '80760065dafada640051ffdf90dfff5298ff410040ff9a6eff660065ff70069dfcdefd9e063fede6a7e7ed40cffc240024fcd2ebfa130013faee94ffcc82ccff970581e1fbe18206',
    '90760170e2fbcf45006affdfa0eff82ed6f6190045ff9ef0de000015ffdac5fd46017effef47fafef0d5e7ea0031847219f6c9a4d2200064ff8363ffeac2fbec18016fe2fac43000',
    'x10098ff66005fff962dfdca00c8fd2a00bbfe52feb600004effe8ff47000003dfffd70200000defffe60700006dffcaff5e0003d9f42afbcd014cffa300b4ff40bbff3a004bffb0',
    '00670069e1fcdd5e0044fee698effd38a6ff4d0066ff9ad9fe180029ffcbedfc090016fee0effc090015fee1dcfe180026ffceaaff4d005dff9c45fee396e8fd390066e0fcdc5e00',
    '10450000000186ffe13c4e77c8ffffe1f8ffffffffffe10f0f0f42ffffe100000036ffffe100000036ffffe100000036ffffe100000036ffffe100000036ffffe100000036ffffe1',
    '20680171e0fde484055fffeaa2e1ff8bb8ff47002affe87390130010fff0000000007effa500000994fecf16002ad4fe940a0027edf953000000a7ffedb8b8b8ace1ffffffffffee',
    '30660689e6fde177027dffcf95e8ff65c7ff230063ffa5161b010089ff73000035daffba0300001e7cd6ff7c010200001effeee2fd1d0021fff08bffd794ddff940686e6fde48506',
    '4072000000a0ffef00000037fcffef000003c9a2faef000062ef19faef0010e76f01faef008dd00501faef00e5f0e2e2fffdd9b1c4c4c4fefbbc00000001faef0000000001faef00',
    '506800e4ffffffff7f13fdcfb3b3b3593bff440000000067ffa6e5d7670092ffd8b1f5ff5b2739090052ffc40000000017ffe1adb60b0048ffc2a2ffcc9eeefe520c95ecfcd45700',
    '6067003fcbfaec8e0624f5ed97cbff798dff5a000e553dc8ff3f7f822d00e1fff5eafef945e4ff6c0050ffc4d2fd100001f6e8a1ff360025fdcd3cfde595dfff640054d8fce26e01',
    '7072f1ffffffffffedb9c4c4c4ceffd900000000a4fa3900000052ff8600000008e1e40b00000064ff7400000000c4fc1700000013fbcb0000000047ff980000000072ff78000000',
    '80680064dcfce171014fffdd94d4ff6294ff2c0016fca661ff710759ff7302b7fffeffc6047dffa43f97ff90e1fc110006f5f3dffe250017f9f07fffde95d8ff900278e0fde48205',
    '90660172e1fcd8520070ffd895e7fc41dafd1e003bffaff1f2020012ffe6ccff4b006dfffa4ffcfdeaf7fef6003e9b9f46ffd95a7113004fff998fffcd97edf72c088febfbce4200',
    'x098a0ff89008cff9c2bfde50be6fd2800b2ff9cffaf00003bfffffe38000001c3ffc001000001cbffc801000045fffdff420000bdff88ffb90036fedc06ddfe32adff7d0080ffaa',
    '00710047d4fbd0410029f8d575daf52497ff35003dff90d4f0020005f4ceecdb000000e2e7ecdb000000e2e7d3f0020005f4cd97ff35003cff902af8d575daf5240048d5fbd14200',
    '1063000055f3fd03000488fefffd0300abffc4fefd0300477c0cfdfd0300000006fdfd0300000006fdfd0300000006fdfd0300000006fdfd030012696cfefe6b5e2cffffffffffe5',
    '20670060d7fce5800355fed077c8ff74aef31c002cffc20207000039ffb600000002b0ff5400000183ff9d01000181ffa805000182ffaa0500007ffff1a0a5a58afbfffffffffff3',
    '30680049ccfbea8c0632fadc74b7ff7e83fa340018febb000200003bff90000011caf9ba0e00000b88cafd670000000008f2dea4d70f000bf3e072ffc771bfff83027ae3fde17d04',
    '40770000001ff1d600000001b7ffd600000062fccad600001cef9098d60001b2de0c98d6005dfe440098d600d2fbd8d8eff9c0679c9c9cd7ef830000000098d6000000000098d600',
    '5066009bffffffff9a00c7eba5a5a23b04efa80000000021ffb87c691b0046fef9f3fff24001220e045fffca0000000004f3f2050f000023fecfa1f08f79dafd5435b2f2f9c84e00',
    '606700000089eea501000051ffda11000019ebf32c000001b7ff8639060055ffffffffdb23baff761782ffaedef0010005fbe1c4f80d001ffec85effc178d5ff59006bdffcd95f00',
    '7069e4fffffffffff48daaaaaab0fdcc0000000076ff5c0000000deadd0500000076ff6a0000000ce9e70a00000074ff790000000be7f01000000072ff870000000ae6e317000000',
    '80650055c9e9c8520046fed176d4fd4194ff48004eff8e74ff6c0072ff6f0ab9fcdbfcb40956f8d08ad2f750d6ff200026ffd0e2ff17001dffdd8effb761bbff880786e3fde28205',
    '90670167dafcdf730168ffc777c1ff6cd5f810000af2cee8f5060005efe1a8ffa457a8ffbb17bafbf4f2ff5700000e4ffbb802000026edeb1b000010d6fe51000003b4fc8e000000',
    'x093b3ff750068ff9547ffda02c1fc2803d7ff59fbb400006dfff0ff4500000ff1ffd70200001af7fff00f000080ffd9ff6c0008e6e546ffd5025cff9103dfff43cafb350079ffae',
    '00581db6f1fef2ba219fffeaaee9ffa7ceff7c0077ffd6deff6d0065ffe7e4ff690061ffede4ff690061ffeddeff6d0065ffe7ceff7c0077ffd69fffeaaee9ffa71db6f1fef2ba21',
    '1035094792ddffffeef0ffffffffffeedbac86fcffffee010016faffffee000016faffffee000016faffffee000016faffffee000016faffffee000016faffffee000016faffffee',
    '20559ee6f8fef1bc25a9c1b2b9f8ffbb000000009bffe900000004b7ffe1001171dbffff974ff0ffffe17707ceffe153050000e8ff9000000000edffdbafafafa3edffffffffffed',
    '3055caebfbfce7a213bbb1abc0feff9600000000cdffbd0000000adcff9d00b5f3f7ffb91b0088b6c4fdf35300000000b8ffc900000000b4ffd7bfb1abbcfdffa6d3edfcfce6a217',
    '40650003e3ff590000003effef0b00000095ff9d00000005e7ff3f38530144ffdd03ccf3039bff810df9f303e5ffd7d1fffcb1dcececf0fffed100000035fff30300000035fff303',
    '5055d2ffffffffff68d2ffd6afafaf47d2ff7d00000000d2ffa55e592400d2fffffffffc5b686a6374eaffcb000000009dffe900000000aaffddb0b6b0c2fcffa2bceafbfde9a314',
    '60580383dffcf9df6b69fffcbeacbb75b9ff9600000000d7ff73314d3101e3ffe2ffffff80e4ffc15db2ffdddcff740057fff2c4ff7f005effe884ffebade0ffb610aef0fef4be27',
    '7057e6ffffffffffe1a3b4b4b4ecffd500000011f2ff7f0000006ffffa1d000002d6ffb100000044ffff48000000aeffde0400001efaff7a00000083fff91a000007e6ffab000000',
    '806124b8f1fdefb11bb2ffe2ade8ff9ed7ff68007bffc4bbff6e0083ffa935daf5d7f8d22b68f7e6b6ecf357e1ff5e0073ffcdf0ff5d0071ffdcc4ffe2ade7ffb12bbcf2feefb421',
    '90601db7f2fef2b313a0ffe4adebff86d1ff6d007cffbedbff670071ffd4c8ffba5dc0ffdc6cfeffffe6ffdb002d4d3571ffcf0000000092ffaf62baacbcfbff625de0f9fce08303',
    'x080b8ff99007affbc55ffea06ceff5a07e8ff71feeb09008cfff8ff9000002afeffff2f000027feffff3100008bfff4ff960009eafe60fff00e5dffcc02d8ff67c3ff740081ffcc',
    '0068004bd7f9d950002af7610659f83093c4000000bb9bcb8a00000080d3e2750000006beae2750000006aeacb8a00000080d393c4000000ba9b2af7610659f830004bd7f9d95100',
    '10619bc9f2ff590000674147ff590000000032ff590000000032ff590000000032ff590000000032ff590000000032ff590000000032ff59000007093aff5f0909bfffffffffffe6',
    '206464c0f1fbd97302a85f180a58f77d0100000000a7d30000000000c0c3000000005bfd510000004df77f00000054f7790000005ef96d00000067fa6504040404e6ffffffffffeb',
    '30646dd3f3f9dc7b04583d0a074cf47b0000000000bab30000000339ee630025eef2fc810100020e165cf075000000000089e9000000000088e86b20030b54ef87ade2f8f5d06e03',
    '40750000004dff9c0000000cdbd19c0000008b8fa79c000031e10ea79c0003c75b00a79c006ac00200a79c00e29c7272cec86e88959595dad68f00000000a79c0000000000a79c00',
    '506484ffffffffff3184d1040404040184d0000000000084ecb0b78f2900526c4b57b4f6420000000002c0cc00000000007df70000000000a3df862e081474fc70a8e2fbf7cc5f00',
    '6067001aa4eef7d1330fda9617063f2e7fcf0200000000ce8870ad9d4000efeda85082f954f1d80300009ad1d9a700000067f69ec200000081e12ff7600536e97e0049d2f9e67f03',
    '7067e6ffffffffffda090909091af584000000006afb2000000001d1b30000000039ff4b000000009fdf0400000011f57b000000006ef91900000001d2aa000000003cff43000000',
    '8067088fe8fae4840487e832043ef172bb9f000000b3a678d914001ce5630290f3d6f4800166e95c2e65ed54e87a0000008dd3f26f00000082dda7dc2e0338e6920f9aeafae68f09',
    '90670278e3f9d54f0072ee3b0558f736d78b000000b7a6ec710000009de1c7a4000002cff84df9874fa1eef7003c9bae7482d60000000001c7882a4206148fdf132dcff6efa91e00',
    'x09873e1090005d7810ae3700063eb100066e916e174000006d9d4e30a00000061ff6b0000000096ff8c00000024f88bf51c0000a3b901c597002dfa360041f924b0ad000001baa3'];
  /* DIGITS_END */
  const TW = 7, TH = 10;
  let TPL = null;
  function templates() {
    if (TPL) return TPL;
    TPL = DIGITS.map(s => {
      const v = new Float32Array(TW * TH);
      for (let k = 0; k < TW * TH; k++) v[k] = parseInt(s.substr(4 + k * 2, 2), 16);
      return { ch: s[0], ar: parseInt(s.substr(1, 3), 10) / 100, v: unit(v) };
    });
    return TPL;
  }
  function unit(v) {
    let m = 0; for (let k = 0; k < v.length; k++) m += v[k]; m /= v.length;
    let s = 0; for (let k = 0; k < v.length; k++) { v[k] -= m; s += v[k] * v[k]; }
    s = Math.sqrt(s) || 1; for (let k = 0; k < v.length; k++) v[k] /= s;
    return v;
  }

  /** The glyph in box g of a 0/1 ink mask (w x h), as the best digit and how sure. */
  function readGlyph(ink, w, g) {
    const v = new Float32Array(TW * TH);
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
      const xa = g.x + Math.floor(tx * g.w / TW), xb = g.x + Math.max(Math.floor(tx * g.w / TW) + 1, Math.floor((tx + 1) * g.w / TW));
      const ya = g.y + Math.floor(ty * g.h / TH), yb = g.y + Math.max(Math.floor(ty * g.h / TH) + 1, Math.floor((ty + 1) * g.h / TH));
      let n = 0, c = 0;
      for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) { n++; c += ink[y * w + x]; }
      v[ty * TW + tx] = n ? c / n : 0;
    }
    unit(v);
    const ar = g.w / g.h;
    let best = null, second = -2;
    const by = {};
    for (const t of templates()) {
      let d = 0; for (let k = 0; k < TW * TH; k++) d += v[k] * t.v[k];
      d -= Math.abs(Math.log(ar / t.ar)) * 0.35;
      if (!(t.ch in by) || d > by[t.ch]) by[t.ch] = d;
    }
    for (const ch in by) {
      if (!best || by[ch] > best.s) { if (best) second = Math.max(second, best.s); best = { ch, s: by[ch] }; }
      else second = Math.max(second, by[ch]);
    }
    return { ch: best.ch, s: best.s, gap: best.s - second };
  }

  /**
   * Number shapes in a region of the picture, light on dark and dark on light.
   * Returns [{ n, s, cx, cy, hgt }] in the region's own pixels.
   */
  function numbersIn(px, W, H, R, gh) {
    const x0 = Math.max(0, Math.round(R.x)), y0 = Math.max(0, Math.round(R.y));
    const w = Math.min(W, Math.round(R.x + R.w)) - x0, h = Math.min(H, Math.round(R.y + R.h)) - y0;
    if (w < 6 || h < 6) return [];
    const L = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y + y0) * W + x + x0) * 4; L[y * w + x] = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114; }
    const found = [];
    // Local threshold: a pixel is ink when it is well brighter (or darker) than the area around it.
    const rad = Math.max(3, Math.round(gh * 0.9));
    const sat = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) { let rs = 0; for (let x = 0; x < w; x++) { rs += L[y * w + x]; sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + rs; } }
    const mean = (x, y) => {
      const xa = Math.max(0, x - rad), xb = Math.min(w, x + rad + 1), ya = Math.max(0, y - rad), yb = Math.min(h, y + rad + 1);
      return (sat[yb * (w + 1) + xb] - sat[ya * (w + 1) + xb] - sat[yb * (w + 1) + xa] + sat[ya * (w + 1) + xa]) / ((xb - xa) * (yb - ya));
    };
    for (const pol of [1, -1]) {
      const ink = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ink[y * w + x] = pol * (L[y * w + x] - mean(x, y)) > 28 ? 1 : 0;
      const gl = parts(ink, w, h).filter(p => p.h >= gh * 0.55 && p.h <= gh * 1.8 && p.w <= p.h * 1.05 && p.w >= p.h * 0.12 && p.n >= p.w * p.h * 0.15 && p.n <= p.w * p.h * 0.9);
      gl.sort((a, b) => a.x - b.x);
      const used = new Set();
      for (let a = 0; a < gl.length; a++) {
        if (used.has(a)) continue;
        const run = [gl[a]]; used.add(a);
        for (let b = a + 1; b < gl.length; b++) {
          const last = run[run.length - 1], g = gl[b];
          if (used.has(b)) continue;
          if (g.x - (last.x + last.w) > last.h * 0.45) break;
          if (Math.abs(g.h - last.h) > last.h * 0.25 || Math.abs((g.y + g.h) - (last.y + last.h)) > last.h * 0.25) continue;
          run.push(g); used.add(b);
          if (run.length >= 3) break;
        }
        let txt = '', s = 0, k = 0;
        for (const g of run) {
          const r = readGlyph(ink, w, g);
          if (r.ch === 'x') { if (txt === '') continue; else break; }
          txt += r.ch; s += r.s; k++;
        }
        if (!k || txt.length > 2) continue;
        const n = parseInt(txt, 10);
        if (!(n >= 1 && n <= 60)) continue;
        const bx0 = run[0].x, bx1 = run[run.length - 1].x + run[run.length - 1].w;
        const by0 = Math.min(...run.map(g => g.y)), by1 = Math.max(...run.map(g => g.y + g.h));
        found.push({ n, s: s / k, cx: x0 + (bx0 + bx1) / 2, cy: y0 + (by0 + by1) / 2, hgt: by1 - by0, pol });
      }
    }
    return found;
  }

  /**
   * Counts for every card box. First every number shape near each card, then the place (relative
   * to the card) where most cards have one, then each card's number nearest that place.
   * Returns [{ n, sure }] in the order of the boxes; n is null when nothing could be read.
   */
  function readCounts(px, W, H, boxes) {
    const cand = boxes.map(b => {
      const R = { x: b.x - b.w * 0.12, y: b.y - b.h * 0.08, w: b.w * 1.24, h: b.h * 1.32 };
      const out = [];
      for (const gh of [b.h * 0.05, b.h * 0.07, b.h * 0.12]) for (const c of numbersIn(px, W, H, R, gh)) {
        if (out.some(o => Math.abs(o.cx - c.cx) < c.hgt * 0.5 && Math.abs(o.cy - c.cy) < c.hgt * 0.5)) continue;
        out.push(Object.assign(c, { rx: (c.cx - b.x) / b.w, ry: (c.cy - b.y) / b.h, rh: c.hgt / b.h }));
      }
      return out;
    });
    // Where do counts sit? Each candidate votes for its spot; card text numbers (HP, damage)
    // land in different spots on different cards, the badge lands in one.
    const spots = [];
    cand.forEach((cs, i) => cs.forEach(c => { if (c.s > 0.55) spots.push({ rx: c.rx, ry: c.ry, rh: c.rh, i }); }));
    let best = null, bestN = 0;
    for (const a of spots) {
      const near = new Set();
      for (const b of spots) if (Math.abs(a.rx - b.rx) < 0.08 && Math.abs(a.ry - b.ry) < 0.06 && Math.abs(a.rh - b.rh) < a.rh * 0.35) near.add(b.i);
      const score = near.size + (a.ry > 0.75 ? 0.5 : 0);   // a tie goes to the spot near the bottom
      if (score > bestN) { bestN = score; best = a; }
    }
    return cand.map(cs => {
      if (!cs.length) return { n: null, sure: 0 };
      let pick = null, ps = -9;
      for (const c of cs) {
        let s = c.s;
        if (best && boxes.length > 2) {
          const d = Math.abs(c.rx - best.rx) / 0.08 + Math.abs(c.ry - best.ry) / 0.06;
          s -= d * 0.25;
        }
        if (s > ps) { ps = s; pick = c; }
      }
      const sure = Math.max(0, Math.min(1, (ps - 0.45) / 0.4));
      return { n: pick.n, sure };
    });
  }

  /**
   * The whole read: card boxes, best matches and counts.
   * Returns [{ box, matches: [{ name, set, num, s }], count, countSure, sure }].
   */
  /** The best score any print reaches for box r (no shifting). */
  function bestScore(idx, px, W, H, r) {
    const q = query(feat(px, W, H, r));
    let b = -9;
    for (let i = 0; i < idx.n; i++) { const v = scoreOne(idx, q.qy, q.qc, i); if (v > b) b = v; }
    return b;
  }
  /**
   * Each row of cards moved up or down to where its pictures match cards best. A count badge
   * under the cards, a header above them or a row step a little off can leave a row's boxes a
   * tenth of a card low or high, and the art then matches nothing. The art itself says where
   * the cards are: a card's own picture scores about 1, a box half on the gap far less.
   */
  function placeRows(idx, px, W, H, cards) {
    if (!cards.length) return cards;
    const ch = cards[0].h, rows = [];
    for (const b of cards) {
      const r = rows.find(r => Math.abs(r.y - b.y) < ch * 0.4);
      if (r) r.b.push(b); else rows.push({ y: b.y, b: [b] });
    }
    for (const r of rows) {
      // a few cards spread along the row are enough to place it
      const pick = r.b.length <= 3 ? r.b : [r.b[0], r.b[r.b.length >> 1], r.b[r.b.length - 1]];
      const at = dy => pick.reduce((a, b) => a + bestScore(idx, px, W, H, { x: b.x, y: Math.max(0, Math.min(H - b.h, b.y + dy)), w: b.w, h: b.h }), 0) / pick.length;
      let best = 0, bs = at(0);
      for (let k = -8; k <= 8; k++) { if (!k) continue; const dy = k * 0.03 * ch, v = at(dy); if (v > bs + 0.01) { bs = v; best = dy; } }
      let fine = best;
      for (const d of [-0.015, -0.0075, 0.0075, 0.015]) { const dy = best + d * ch, v = at(dy); if (v > bs) { bs = v; fine = dy; } }
      if (fine) for (const b of r.b) b.y = Math.max(0, Math.min(H - b.h, b.y + fine));
    }
    return cards;
  }

  function readDeck(idx, px, W, H) {
    const cards = placeRows(idx, px, W, H, findCards(px, W, H).cards);
    const counts = readCounts(px, W, H, cards);
    return cards.map((box, k) => {
      const ms = matchBox(idx, px, W, H, box, 6).map(c => {
        const p = idx.meta.prints[c.i];
        return { name: idx.meta.names[p[0]], set: p[1], num: p[2], s: c.s };
      });
      const top = ms[0] ? ms[0].s : 0, gap = ms[1] ? top - ms[1].s : top;
      // How sure the match is: a close picture, clearly ahead of the next card name.
      const sure = Math.max(0, Math.min(1, (top - 0.55) / 0.35)) * Math.max(0.2, Math.min(1, gap / 0.12));
      return { box, matches: ms, count: counts[k].n, countSure: counts[k].sure, sure };
    });
  }

  /** Cards of one name and print that appear twice (a second screenshot, or a wrapped row) add up. */
  function mergeRows(rows) {
    const out = [];
    for (const r of rows) {
      const m = r.matches[0];
      const same = m && out.find(o => o.matches[0] && o.matches[0].name === m.name && o.matches[0].set === m.set && o.matches[0].num === m.num);
      if (same) { same.count = (same.count || 1) + (r.count || 1); same.countSure = Math.min(same.countSure, r.countSure); continue; }
      out.push(Object.assign({}, r));
    }
    return out;
  }

  /** For tests: how well print i matches the card in box r (no shifting). */
  function scorePrint(idx, px, W, H, r, i) { const q = query(feat(px, W, H, r)); return scoreOne(idx, q.qy, q.qc, i); }

  const api = { FEAT, CARD_AR, feat, loadIndex, matchBox, findCards, readCounts, readDeck, mergeRows, shrink, scorePrint, foreground, parts };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PhotoScan = api;
})(typeof self !== 'undefined' ? self : this);
