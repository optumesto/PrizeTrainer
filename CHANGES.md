# PrizeTrainer v33: full decklist before the Daily Challenge

Upload `index.html` and `sw.js` (cache is prize-trainer-v33). Builds on v32, so it includes the age question and ad spots too. data.json is unchanged.

## What changed

- Tapping Play (or Replay) on the Daily Challenge, or Play on a shared daily link, now opens **Today's deck** first: all 60 cards with their art and counts, grouped into Pokémon, Trainers and Energy, in list order.
- The hint says: "Review all 60 cards, then tap Start. The clock starts with the game. Your first try is your score." On a replay it says the day's score is already in.
- **Start** stays in reach at the bottom while you scroll. **Not now** closes it with no game.
- The shuffle is unchanged, so everyone still gets the same prizes that day, and the clock only starts on Start.

## Tested

- New checks (18), all passing at 390, 360 and 320 px: list opens before the game, 60 cards in the right groups, art on every card, plain energy names, the game waits for Start, Start begins the same daily game with the same six prizes as before, Not now, the shared link, the replay wording, fits the screen, no dashes.
- Existing checks: A 16/16, B 19/19, C 17/17, v28 45/45, regression 38/38, D 18/19 (known miss). v31 38/41 and v32 54/56: every miss is only the version number or cache name.
