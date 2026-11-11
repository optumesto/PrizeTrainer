# Puzzle mode engine (work in progress)

Foundations for RdyDeck's puzzle mode ("find the out" boards). Not loaded by the app yet.

| File | What it does |
| --- | --- |
| `text.js` | Goldfish's card text reader, copied word for word from `index.html`. Generated: do not edit. |
| `tools/sync-text.mjs` | Regenerates `text.js`. `--check` fails when `index.html` changed and `text.js` is stale. |
| `engine.js` | Headless rules engine: game state, legal actions, effects, damage, Knock Outs, Prizes, puzzle loader. |
| `solver.js` | Shortest forced win this turn, winning first moves, and `replay` to check a player's line. |
| `test/run.js` | Self-checks on real card records in `test/cards.json`. |

Run the checks (Node 18 or later, nothing to install):

```
node puzzle/test/run.js
```

After changing Goldfish's text reader in `index.html`, regenerate the copy:

```
node puzzle/tools/sync-text.mjs
```

Design, open questions and next phases: see the "RdyDeck puzzle engine architecture" doc.
