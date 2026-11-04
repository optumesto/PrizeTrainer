# PrizeTrainer v23: goldfish, drills, daily challenge, notes, edit log, tournament log

Before: the app trained prize memory, opening hands and odds, but you could not play out the first turns, practice counting resources or reading an opponent's prizes, keep matchup plans or match results, see how a list changed over time, compare two lists, or run a shared daily challenge. Card art needed a connection every time.

After: the Hand tab has a Goldfish switch, a new Drills tab holds resource count and opponent prize read, a new Notes tab holds matchup notes, an edit log and list compare, Home has a daily challenge and a tournament log, Modes has a Reach check, and card art you have seen stays available offline. Grading, odds and card grouping logic are untouched, and the look matches v20 to v22.

## Deck review tabs
- Six tabs now: Cards, Grade, Odds, Hand, Drills, Notes. On a phone the label sits under each icon so all six fit at 320px.

## Goldfish (Hand tab)
- Extends the Hand tab instead of adding a screen: a switch picks Turn 1 line (unchanged) or Goldfish 3 turns.
- Uses the same deal as the Hand tab: a legal 7, six prizes, going first or second. Then you play three turns alone with the real rules for setting up: draw each turn, one Energy and one Supporter a turn, no Supporter on turn 1 going first, no evolving on your first turn or onto a Pokémon that came in that turn, Rare Candy from Basic to Stage 2.
- Common cards have a one tap effect (Research, Iono, Arven, Nest Ball, Ultra Ball, Buddy-Buddy Poffin, Rare Candy, Switch, tools, stadiums, and abilities like Bibarel and Pidgeot ex). Anything else uses Draw, Search deck and Discard.
- A log shows every play. The summary shows the turn each line was ready, next to the Hand tab odds from that same opening hand. The card counts always add up to the list.

## Drills tab
- Resource count: the list is hidden and a game state is shown (cards in discard and in play). You say how many of each key card are left in deck and prizes, then Check shows the right counts.
- Opponent prize read: pick an opponent list (one of your decks, or paste a list). A late game or mid game board is dealt, and you guess which cards are prized. Pasted lists are cleaned before use.
- Both drills keep a running score per deck, which also shows on Progress.

## Daily challenge (Home)
- One prize game a day, the same for everyone: the shuffle is seeded from the date, with no server. It uses one built-in list (Charizard ex and Pidgeot ex).
- Your first try counts toward the daily score and streak. Replays are marked Practice replay.
- Share score gives a short text with the date, your score, time and a row of filled and empty squares, plus a link that opens today's challenge. Your streak shows on the Home card.

## Reach check (Modes)
- Covers "Can I still get X?". A new Reach check toggle in Modes. After you name the prizes and before the reveal, three questions ask whether a card can still come from your deck. The timer stops while you answer. The results show what you got right and why.

## Notes tab
- Matchup notes: a prize plan per opponent deck, with your win, loss and tie record against it from the tournament log.
- Edit log: every save from Edit deck records which cards were added, cut or changed in count, dated, with the games played on each version and a total since import. It keeps the last 40 versions. Decks from before v23 start their log at the first open. Duplicated decks note what they came from.
- Compare lists: this list against any earlier version or another deck. It shows the card differences and how the odds move (mulligan, draw a card on turn 1, attacker by turn 2, line locked in prizes, and all copies of a changed card prized), counted the same way as the Odds tab.

## Tournament log (Home)
- Log each match: event, deck, opponent, result, prizes taken and given, and notes. When you pick an opponent you have a matchup note for, its prize plan shows in the form.
- Each match records which version of the list you played, so Progress can split results by list change.
- Overall record, win rate and average prizes, a record by opponent, matches grouped by event and day, a deck filter, and Export to CSV (cells that would run as formulas are made safe).

## Progress
- Extends the existing Progress screen with a new Matches, list and drills section: your match record from the tournament log, the number of list changes with accuracy since the last change against before it, and your drill scores. Buttons open the tournament log and the edit log.

## Offline card art
- The service worker now keeps every card image you have seen in a separate art cache. It is kept across app updates and capped at 600 images. When you are offline, images are served from it.

## Safety
- All typed, pasted and linked text (notes, opponent names, pasted lists, daily links) is cleaned and shown as text, never run. Everything stays on this device and is included in Backup and restore.

## Tested
- New feature run (v23): 92 of 92, three runs in a row. Covers all six tabs fitting at 320px and 390px, goldfish rules and that every card adds up to 60, resource count and opponent read including script injection strings, matchup notes, the edit log from Edit, Duplicate and older decks, compare odds matching the Odds tab, the tournament log with CSV and filter, the reach check with the timer stopped, Progress extras, the daily challenge (same deal on the same day, a different one the next day, first try against replay, streak, link), reload and backup, light theme, no console errors, the cache name, and art served while offline.
- Existing feature run (38 checks) on v22 and v23: 38 of 38 on both, at 390px and 320px.
- The v22 feature run on v23: 59 of 61. The two misses are expected: the cache name is now prize-trainer-v23, and there are six tabs instead of four.
- Grade and Odds tabs render byte for byte the same as v22.
- No en or em dashes in either file.
- The card database and card art cannot be reached from my test machine, so both were simulated (screenshots use stand-in art). Not checked on a real phone.

## To install
Upload index.html and sw.js from this folder over the current ones (cache is prize-trainer-v23). Includes all v22 changes.
