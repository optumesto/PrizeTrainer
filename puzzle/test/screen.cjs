// Headless check of the daily puzzle screen in index.html, in jsdom (no browser).
// Needs jsdom from the grade check: cd tests && npm ci. Then: node puzzle/test/screen.cjs [date]
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { JSDOM, VirtualConsole, ResourceLoader } = (() => { try { return require(path.join(ROOT, 'tests', 'node_modules', 'jsdom')); } catch (_) { return require('jsdom'); } })();
const FIXED_NOW = Date.parse(process.argv[2] || '2026-11-12T15:00:00Z');
class Local extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.hostname === 'rdydeck.com') { const f = path.join(ROOT, u.pathname); if (fs.existsSync(f)) return Promise.resolve(fs.readFileSync(f)); }
    return Promise.resolve(Buffer.from(''));
  }
}
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const errors = []; const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
  vc.on('error', e => errors.push('console.error ' + String(e && e.message || e)));
  const dom = new JSDOM(html, { url: 'https://rdydeck.com/', runScripts: 'dangerously', resources: new Local(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      const RealDate = w.Date;
      class FixedDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIXED_NOW); } static now() { return FIXED_NOW; } }
      w.Date = FixedDate;
      w.fetch = async (input) => { const url = new URL(String(input && input.url || input), 'https://rdydeck.com/');
        if (url.hostname === 'rdydeck.com') { const f = path.join(ROOT, url.pathname); if (fs.existsSync(f)) return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': 'application/json' } }); }
        return new Response('', { status: 404 }); };
      w.Response = Response; w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      try { delete w.indexedDB; } catch (_) {}
      w.requestIdleCallback = fn => setTimeout(fn, 0);
    } });
  const w = dom.window, d = w.document;
  await new Promise(r => setTimeout(r, 3500));
  // 3.4.22: the puzzle's number is the board's day, the same for everyone (day 1 is Mon 9 Nov 2026),
  // not a count of your own days played. Worked out here from the date, not from the app's own function.
  const BOARD_DAY = (([y, m, dd]) => Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(2026, 10, 9)) / 864e5) + 1)(w.dailyKey().split('-').map(Number));
  const numRe = new RegExp('Daily puzzle #' + BOARD_DAY + '\\b');
  const card = d.getElementById('puzzle-card');
  ok(card && numRe.test(card.textContent) && /Win this turn from a real tournament board/.test(card.textContent), 'home card: ' + (card && card.textContent.replace(/\s+/g, ' ').trim()));
  ok(/Build a deck/.test(d.querySelector('.home-cta-row').textContent), 'home has the deck builder button next to the puzzle card');
  // What's new: a brand new user never gets the home card.
  ok(d.getElementById('wn-card').innerHTML === '' && w.localStorage.getItem('rd_seen_version') === w.eval('PT_VERSION'), "new user: no What's new card, version marked seen");
  await w.openPuzzle();
  ok(d.getElementById('screen-puzzle').classList.contains('active'), 'puzzle screen opens');
  const body = d.getElementById('pz-body');
  ok(/Win this turn/.test(body.textContent) && body.querySelectorAll('.pz-mon').length >= 2, 'board drawn with ' + body.querySelectorAll('.pz-mon').length + ' Pokémon');
  const pz = w.eval('pzS'); const E = w.RdyPuzzle;
  console.log('     puzzle #' + pz.n + ' (' + pz.p.moves + ' plays): ' + pz.p.answer.join(' / '));
  // A losing try first: end the turn at once.
  let acts = E.legalActions(pz.s, { why: true });
  w.pzDo(acts.findIndex(a => a.t === 'end'));
  ok(/No win this time/.test(body.textContent), 'ending the turn shows no win');
  let R = w.eval('state').puzzle.results[pz.key];
  ok(R && R.won === false, 'first try saved as no win');
  w.pzUndo(); ok(!w.eval('pzS').over, 'undo after the end reopens the board');
  w.pzReset();
  // Play the solver's line through the screen's own buttons.
  const S = E.solve(pz.s0, { maxNodes: 200000, maxMoves: 8 }); let usedPick = 0;
  ok(S.win, 'solver finds the win on the shipped board');
  for (const a of S.line) {
    const cur = w.eval('pzS').s;
    const want = E.sig(cur, a);
    const L = E.legalActions(cur, { why: true });
    const i = L.findIndex(x => !x.why && E.sig(cur, x) === want);
    if (i < 0) continue; // the opponent's choice, already made for them
    const btn = [...body.querySelectorAll('button[onclick^="pzDo("]')].find(b => b.getAttribute('onclick') === `pzDo(${i})`);
    if (btn) { btn.click(); continue; }
    // Many answers: the pick list (tap each card, then Take).
    if (body.querySelector('.pz-pk')) {
      const names = L[i].v.map(u => { for (const z of [cur.players[0].deck, cur.players[0].hand, cur.players[0].discard]) { const r = z.find(y => y.uid === u); if (r) return r.card.name; } });
      names.forEach(n => [...body.querySelectorAll('.pz-pk-c')].find(c => c.textContent.replace(/^\d+ /, '').trim() === n).click());
      body.querySelector('.pz-pk-go .btn-primary').click(); usedPick++; continue;
    }
    ok(false, 'no button for ' + want); break;
  }
  ok(/You won in/.test(body.textContent), 'the answer line wins on screen: ' + (body.querySelector('.pz-res b') || {}).textContent);
  R = w.eval('state').puzzle.results[pz.key];
  ok(R && R.won === false, 'replay does not change the first result');
  ok(/Practice replay/.test(body.textContent), 'replay is marked as practice');
  w.pzPeek(); ok(!!d.getElementById('pz-ans'), 'answer shows');
  // A fresh day: win on the first try, then the share text.
  delete w.eval('state').puzzle.results[pz.key];
  w.pzReset();
  for (const a of S.line) { const cur = w.eval('pzS').s; const L = E.legalActions(cur, { why: true }); const i = L.findIndex(x => !x.why && E.sig(cur, x) === E.sig(cur, a)); if (i >= 0) w.pzDo(i); }
  R = w.eval('state').puzzle.results[pz.key];
  ok(R && R.won && R.moves === pz.p.moves, 'first-try win saved with ' + (R && R.moves) + ' plays');
  ok(/won this turn in/.test(w.puzzleShareText(R, pz.key)), 'share: ' + w.puzzleShareText(R, pz.key));
  w.showScreen('home'); w.renderHome();
  ok(/won/.test(d.getElementById('puzzle-card').textContent), 'home card shows the win: ' + d.getElementById('puzzle-card').textContent.replace(/\s+/g, ' ').trim());
  // Your own numbers and streaks: three earlier days played (two won in a row up to yesterday), then today.
  const P = w.eval('state').puzzle; const today = pz.key;
  const dayKey = back => { const d = new w.Date(); d.setDate(d.getDate() - back); return w.dailyKey(d.getTime()); };
  P.results = { [dayKey(5)]: { won: true, moves: 3, num: 1 }, [dayKey(2)]: { won: true, moves: 2, num: 2 }, [dayKey(1)]: { won: true, moves: 4, num: 3 } };
  ok(w.puzzleNumber(today) === BOARD_DAY, 'the number is the board\'s day (#' + BOARD_DAY + '), whatever days you played (' + w.puzzleNumber(today) + ')');
  w.renderHome();
  const cardTxt = () => d.getElementById('puzzle-card').textContent.replace(/\s+/g, ' ').trim();
  // Before you play, the home row says what the game is; your tally and runs stay on the result screen.
  ok(numRe.test(cardTxt()) && /Win this turn from a real tournament board/.test(cardTxt()) && !/solved of|in a row/.test(cardTxt()), 'home card before playing: ' + cardTxt());
  ok(/3 solved of 3 played, 2 wins in a row/.test(w.pzTally()), 'tally before playing: ' + w.pzTally());
  await w.openPuzzle();
  for (const a of S.line) { const cur = w.eval('pzS').s; const L = E.legalActions(cur, { why: true }); const i = L.findIndex(x => !x.why && E.sig(cur, x) === E.sig(cur, a)); if (i >= 0) w.pzDo(i); }
  R = P.results[today];
  ok(R && R.num === BOARD_DAY && R.won, 'today saved as #' + BOARD_DAY + ', won');
  ok(/4 solved of 4 played, 3 wins in a row/.test(body.textContent), 'result banner: ' + (body.querySelector('.pz-res span') || {}).textContent);
  console.log('     share: ' + w.puzzleShareText(R, today));
  ok(new RegExp('Daily Puzzle #' + BOARD_DAY + ': won this turn in \\d+ plays?\\. 3 wins in a row\\.').test(w.puzzleShareText(R, today)), 'share text has the day\'s number and your streak');
  w.showScreen('home'); w.renderHome(); console.log('     card: ' + cardTxt());
  P.results[today] = { won: false, moves: 5, num: 4 }; w.renderHome();
  ok(/no win/.test(cardTxt()) && /3 days in a row/.test(w.pzTally()) && !/wins in a row/.test(w.pzTally()), 'a loss today ends the win streak, keeps the days streak: ' + cardTxt() + ' / ' + w.pzTally());
  // Card sheet opens for a Pokémon and a hand card.
  w.showScreen('puzzle');
  w.pzReset(); w.showScreen('puzzle'); w.renderPuzzle();
  body.querySelector('.pz-mon').click();
  ok(/HP/.test(d.getElementById('x-modal').textContent), 'tapping a Pokémon shows its card');
  w.closeSheet();
  const chip = body.querySelector('.mt-card:not(.off)'); if (chip) { chip.click(); ok(d.getElementById('x-modal').classList.contains('active'), 'tapping a hand card shows it'); w.closeSheet(); }
  // Every shipped puzzle: labels for every action along its line, and the line wins.
  let labelled = 0, won = 0;
  const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'puzzle/daily.json'), 'utf8'));
  for (const p of pack.puzzles) {
    let s = E.fromPuzzle(Object.assign({ cards: pack.cards }, JSON.parse(JSON.stringify(p))));
    const one = E.solve(s, { maxNodes: 60000, maxMoves: 7 });
    w.eval('pzS').s = s;
    for (const a of one.line) {
      for (const x of E.legalActions(s, { why: true })) { const t = x.t === 'pick' ? w.pzPickLabel(s, x.v) : w.pzLabel(s, x); if (!t || /undefined|\[object/.test(t)) throw new Error('bad label ' + t + ' ' + JSON.stringify(x)); labelled++; }
      if (s.pending && s.pending.ask && !(s.promote && s.promote.length)) w.pzAskText(s);
      s = E.apply(s, a);
    }
    if (E.goalMet(s)) won++;
  }
  ok(won === pack.puzzles.length, `all ${pack.puzzles.length} shipped puzzles win along their line (${won}), ${labelled} action labels read cleanly`);
  // Every puzzle played through the screen (opponent choices made by the screen), timed.
  let uiWon = 0, slow = 0, oppPicks = 0;
  for (let k = 0; k < pack.puzzles.length; k++) {
    const p = pack.puzzles[k];
    const s0 = E.fromPuzzle(Object.assign({ cards: pack.cards }, JSON.parse(JSON.stringify(p))), { play: true }); // as the app deals it
    const one = E.solve(s0, { maxNodes: 60000, maxMoves: 7 });
    const P = w.eval('pzS'); P.p = p; P.s0 = s0; P.s = s0; P.hist = []; P.plays = 0; P.over = false;
    for (const a of one.line) {
      const cur = w.eval('pzS').s; if (w.eval('pzS').over) break;
      const L = E.legalActions(cur, { why: true }); const i = L.findIndex(x => !x.why && E.sig(cur, x) === E.sig(cur, a));
      if (i < 0) { oppPicks++; continue; }
      const t = Date.now(); w.pzDo(i); if (Date.now() - t > 1500) slow++;
    }
    if (E.goalMet(w.eval('pzS').s)) uiWon++;
    // Let the page's MutationObservers run between boards, as they do between taps in a browser.
    // Without this, every replaced board waits in their queue until the loop ends (over 4 GB by now).
    await new Promise(r => setTimeout(r, 0));
  }
  ok(uiWon === pack.puzzles.length, `all puzzles won through the screen (${uiWon}); ${oppPicks} opponent choices made by the screen; ${slow} taps over 1.5s`);
  // Searching your deck finds the real cards (3.3.9): Cyrano on the 18 Nov board, picked one card at a time.
  {
    const i9 = pack.puzzles.findIndex(p => p.me.hand.some(k => /cyrano/i.test(pack.cards[k].name)) && p.from.mine === 'Raging Bolt Ogerpon');
    const p = pack.puzzles[i9], s0 = E.fromPuzzle(Object.assign({ cards: pack.cards }, JSON.parse(JSON.stringify(p))), { play: true });
    const P = w.eval('pzS'); P.p = p; P.s0 = s0; P.s = s0; P.hist = []; P.plays = 0; P.over = false; P.pick = null;
    w.showScreen('puzzle'); w.renderPuzzle();
    ok(/Deck: \d+ cards, 2 you know are there/.test(body.textContent), 'deck cards that could be Prizes stay face down before a search');
    const cy = [...body.querySelectorAll('button[onclick^="pzDo("]')].find(b => /Play Cyrano/.test(b.textContent));
    ok(!!cy, 'Cyrano can be played'); cy.click();
    const chips = [...body.querySelectorAll('.pz-pk-c')].map(b => b.textContent.trim());
    ok(chips.length >= 5 && chips.includes('Raging Bolt ex') && chips.includes('Teal Mask Ogerpon ex'), 'Cyrano finds the Pokémon ex in the deck: ' + chips.join(', '));
    const tap = name => [...body.querySelectorAll('.pz-pk-c')].find(b => b.textContent.replace(/^\d+ /, '').trim() === name).click();
    tap('Raging Bolt ex'); tap('Raging Bolt ex'); tap('Teal Mask Ogerpon ex');
    const go = body.querySelector('.pz-pk-go .btn-primary');
    ok(go && /Take 3 cards/.test(go.textContent) && !go.disabled, 'three picked: ' + (go && go.textContent));
    tap('Latias ex');
    ok([...body.querySelectorAll('.pz-pk-c.on')].length === 2, 'a fourth card can\'t be added past Cyrano\'s 3');
    go.click();
    const hand = w.eval('pzS').s.players[0].hand.map(r => r.card.name);
    ok(hand.filter(n => n === 'Raging Bolt ex').length === 2 && hand.includes('Teal Mask Ogerpon ex'), 'they go to your hand: ' + hand.join(', '));
    ok(/Searched for/.test(body.textContent) && !/can't see/.test(body.textContent), 'the search is logged and is not luck');
  }
  // Sharing your score against the best line.
  {
    const key = w.dailyKey(), P = w.eval('state').puzzle;
    P.results[key] = { won: true, moves: 4, best: 3, num: 7 };
    await w.pzShareScore(key);
    const g = w.eval('_pz83');
    ok(/Share your puzzle score/.test(d.getElementById('x-modal').textContent), 'share sheet opens');
    ok(/won this turn in 4 plays\. Best possible: 3/.test(g.text) && g.W.head === '1 play over the best', 'share text: ' + g.text);
    P.results[key] = { won: true, moves: 3, best: 3, num: 7 }; await w.pzShareScore(key);
    ok(/the shortest win/.test(w.eval('_pz83').text) && w.eval('_pz83').W.head === 'Shortest win', 'shortest win: ' + w.eval('_pz83').text);
    P.results[key] = { won: false, peek: true, moves: 0, num: 7 }; await w.pzShareScore(key);
    ok(/needed the answer.*Best possible: \d+ play/.test(w.eval('_pz83').text), 'an older result gets the best line from the pack: ' + w.eval('_pz83').text);
    w.closeSheet(); delete P.results[key];
  }
  // What's new: someone who used an older version gets the card once.
  { const st = w.eval('state'), keep = st.daily;
    w.localStorage.setItem('rd_seen_version', 'v2.2');
    st.daily = { results: { '2026-11-10': { score: 6 } } };
    w.showScreen('home'); w.renderWhatsNewCard();
    const wn = () => d.getElementById('wn-card').textContent.replace(/\s+/g, ' ').trim();
    // Read the version and the update lines from the page, so this check doesn't go stale with each release.
    const WN = w.eval('WHATS_NEW'), VER = w.eval('PT_VERSION'), name = VER.replace(/^v/, 'RdyDeck ');
    ok(WN.version === VER, `What's new is written for this version (${WN.version} vs ${VER})`);
    ok(wn().includes('Updated to ' + name) && wn().includes(WN.items[0].t.replace(/^\w+: /, '')), "returning user sees the update card: " + wn());
    w.openWhatsNew();
    const sheet = d.getElementById('x-modal').textContent.replace(/\s+/g, ' ');
    ok(/What's new/.test(sheet) && WN.items.every(i => sheet.includes(i.t)), "What's new sheet lists every line of the update");
    w.closeSheet();
    ok(wn() === '', 'the card is gone once seen');
    w.renderWhatsNewCard(); ok(wn() === '', 'and stays gone');
    w.openSettings(); ok(/What's new/.test(d.getElementById('x-modal').textContent) && d.getElementById('x-modal').textContent.includes(name), "Settings has What's new and shows " + VER); w.closeSheet();
    st.daily = keep; }
  errors.splice(0, errors.length, ...errors.filter(e => !/setting 'font'|PT error/.test(e)));
  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
