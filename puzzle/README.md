# Puzzle mode

RdyDeck's daily puzzle: one board a day from two top tournament lists where you can win this turn if you find the line. The app loads these files only when the puzzle opens.

| File | What it does |
| --- | --- |
| `text.js` | Goldfish's card text reader, copied word for word from `index.html`. Generated: do not edit. |
| `tools/sync-text.mjs` | Regenerates `text.js`. `--check` fails when `index.html` changed and `text.js` is stale. |
| `engine.js` | Headless rules engine: game state, legal actions, effects, damage, Knock Outs, Prizes, puzzle loader. |
| `solver.js` | Shortest forced win this turn, winning first moves, and `replay` to check a player's line. |
| `daily.json` | The puzzle pack the app plays: 120 boards, one a day, then it starts over. Generated. |
| `tools/make-daily.mjs` | Makes `daily.json` from `tests/grade-lists.json` and card data, keeping only boards the solver proves have a win. |
| `test/run.js` | Engine and solver checks on real card records in `test/cards.json`. |
| `test/screen.cjs` | The puzzle screen in `index.html`, run in jsdom: plays every puzzle in the pack through its buttons. |

Checks (Node 18 or later):

```
node puzzle/test/run.js
cd tests && npm ci && cd .. && node puzzle/test/screen.cjs
```

Make a new pack. Card data is the PokemonTCG/pokemon-tcg-data repository: a folder with `sets.json` (its `sets/en.json`) and one `<set id>.json` per set (its `cards/en/` files).

```
node puzzle/tools/make-daily.mjs --cards <folder> --n 120 --seed 11
```

The app's puzzle settings (goal, strictness, pack file, the date of puzzle #1) are at the top of the DAILY PUZZLE section of `index.html`.

After changing Goldfish's text reader in `index.html`, regenerate the copy:

```
node puzzle/tools/sync-text.mjs
```

Design, open questions and next phases: see the "RdyDeck puzzle engine architecture" doc.
