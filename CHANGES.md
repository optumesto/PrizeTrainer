# v37: RdyDeck

Changed files: index.html, sw.js (cache prize-trainer-v37), manifest.json, README.md, CHANGES.md, scripts/refresh-data.mjs, scripts/check-cards.mjs (new), .github/workflows/refresh-data.yml. data.json is unchanged; the weekly job adds card fixes to it.

## New name
- Prize Trainer is now RdyDeck everywhere you see a name: title, header, home screen name, share text, downloads, help and credits.
- Kept as PrizeTrainer on purpose: the repo and web address, the saved deck storage, the offline cache names and the daily challenge seed. Changing any of them would wipe saved decks, break installed copies or change today's challenge.
- The app icon shows no name, so it needed no change.

## New look
- Built like a tournament decklist sheet: condensed headings, counts in a typewriter face, ink and paper with one red for marks. Dark mode is paper on a playmat.
- Gone: the glow, the pill badges, the grade dial, the icon on every tab and button, the blurred bars.
- Card art is the same size as before. Zoom still works. Every screen fits at 320 px.
- Cards per row: the Cards tab and the daily deck list have a Per row control (3 to 6 on a phone, more on wider screens). The pick is kept on this device. Counts and rotation marks stay readable at 6 across. Pinch stays as page zoom so the two never fight.
- The results screen and the ad spots now match the sheet: square corners, plain time line, ads between two hairlines with a small AD label.

## Save and open decks (for the move to a new web address)
- Saved decks belong to one web address, so decks on optumesto.github.io will not show up on rdydeck.com by themselves. Backup and restore is now Save and open decks.
- Save: a file (rdydeck-decks-DATE.json), Share on phones that can share files, or Copy as text. It holds every deck, prize game, tournament log entry, daily result and drill stat, plus the theme, cards per row and tour settings. The age answer stays on the device.
- Open: a file or pasted text. Decks are added to the ones already there; the same deck is not added twice, and its games are joined. Replace everything takes a second tap.
- A backup is checked before anything changes. Plain text, broken files, unsafe values and bad settings are refused with a plain message. Old backup text still opens.
- To move players: on the old address, tap Save and open decks, then Save a file. On rdydeck.com, tap Save and open decks, then Open a file.

## Card accuracy (checked against pokemon-tcg-data, TCGdex and Limitless)
- Mega Pokémon ex give up 3 prizes. A card that prints both the ex rule and the Mega rule was read as 2 on the main card source.
- 6 cards printed with a G mark (like Ancient Booster Energy Capsule) were listed as H by pokemontcg.io. Fixed, so they no longer read as expected to rotate in 2027.
- A "Free" attack cost counted as one Energy. It now counts as none.
- TCGdex marks some Special Energy as Normal (like Telepathic Psychic Energy). They were read as Basic Energy, so 5 copies passed the deck rules. Now they are Special.
- Delta Reign on TCGdex had no regulation marks, called 12 Stage 1 and Stage 2 cards Basic (like Talonflame ex and Mega Golisopod ex) and left out what 30 cards evolve from. All fixed, and checked against pokemon-tcg-data.
- Azurill's Bouncy-Bounce Charge is a 0 cost attack, not an Ability.
- Coin flips: Mega Kangaskhan ex Rapid-Fire Combo averages 250, not 350. Flip attacks now use their average and say so.
- Copy attacks: N's Zoroark ex Night Joker now counts N's Zekrom's Rampaging Thunder (250, 330 with Black Belt's Training and Binding Mochi). N's Reshiram no longer gets a false "no Fire Energy" flag. Slowking's Seek Inspiration copies a random card, so it is not counted as a set number.
- Damage boosters now include Light Ball, Hop's Choice Band, Binding Mochi, Gladion's Final Battle, Premium Power Pro, Postwick and Voltaic Lightning Energy, each only where its text says it applies.
- The grade says how many hits the format's 280 and 340 HP threats take, not a vague range.
- Dhelmise's Hide 'n' Sneak style Abilities block effects, not damage. The grade now says damage still goes through.
- Goldfish tables follow the cards: Buddy-Buddy Poffin finds 70 HP or less, Level Ball 90 HP or less, Battle VIP Pass only on your first turn, and Fezandipiti ex no longer draws in goldfish, since its Ability needs a knockout first.

## Weekly card check (new)
- After the data refresh, the weekly job checks every starter deck card and every card in the two newest sets against both card databases: HP, stage, evolves from, regulation mark, attacks, damage, cost, Abilities, Special Energy and ACE SPEC.
- Where TCGdex leaves something out and pokemon-tcg-data has it, the fix goes into data.json and the app uses it. Everything else that disagrees is listed in card-check.md for a person to check.
- A test run on today's data found the Delta Reign stage and Azurill problems on its own, and flagged nothing that was right.

## Checked, not changed
- Your own saved decks live on your phone, so they were not checked here. Every deck re-reads its card data once when you open v37.
