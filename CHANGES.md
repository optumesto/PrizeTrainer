# PrizeTrainer v21: cards land in the right group

Before: when the card database could not read a card (new sets it does not have yet, or no connection), the app guessed from the name, and any name it did not recognise went into Pokémon. Newer Supporters like Iris's Fighting Spirit, Jacinthe, Lt. Surge's Bargain and Black Belt's Training showed up as Pokémon. The Pokémon:, Trainer: and Energy: headers in a pasted list were thrown away, and decks saved by older versions could keep a wrong type.

After: the sections in your list decide each card's group. When a list has no headers, only card data the lookup actually confirmed is used, and the name fallback now knows every Pokémon species and treats anything else as a Trainer. Grading and odds math are untouched.

## What changed
- Import, Edit and Duplicate keep each card's section from the list's Pokémon:, Trainer: and Energy: headers (Limitless and Pokémon TCG Live exports both work).
- The Edit box now shows the list under those headers, so saving an edit keeps every card in its group.
- If the lookup returns a card whose type disagrees with the list's section (usually a same number card from another set), that data is dropped instead of trusted, and the card counts as unread.
- Old saved decks no longer trust a stale type that the lookup never confirmed.
- Name fallback: all 1025 species, ex, V, VMAX, VSTAR and Mega names go to Pokémon; Energy names go to Energy except Trainer cards like Energy Retrieval and Energy Switch; everything else, including new Supporters, goes to Trainers. Checked against all 3411 English card names from Black & White onward with no misses, leaving out one card the source data files under the wrong type.
- The warning above the cards now says when grouping comes from your list's sections.

## Tested
- Mason's Mega Feraligatr list: 20 Pokémon, 32 Trainers, 8 Energy with the lookup working, with it offline, and with the headers removed.
- Four more 60 card lists built from real cards in the Mega Evolution sets, late Scarlet & Violet and late Sword & Shield: Supporters, Items, Tools, Stadiums, Energy and ex and Mega Pokémon all in the right group, with and without headers, lookup offline. v20 put 17 to 24 cards per list in the wrong group; v21 puts none.
- Old saved deck with a wrong type, a lookup that returns the wrong card, Edit save and Duplicate: 25 of 25 checks.
- Full v20 feature run: 165 of 166, the one miss being the check that expects the old v20 cache name. No console errors.
- The card database cannot be reached from my test machine, so the lookup was simulated. Not checked on a real phone.

## To install
Upload index.html and sw.js from this folder over the current ones (cache is prize-trainer-v21). Includes all v20 changes.
