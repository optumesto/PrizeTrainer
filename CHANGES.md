# PrizeTrainer v26

Bug fixes on top of v25. Upload index.html and sw.js in place of the v25 files. Nothing else changed.

## Grade and Odds fixes

Tested on two Hide 'n' Sneak lists rebuilt from your screenshots (HnS Legacy and Reddy 4th Place). Before and after: HnS Legacy 3.6 to 7.9, Reddy 4th Place 5.7 to 8.1. The same list always gives the same numbers.

1. A Pokemon played for its Ability was flagged critical for its attack cost. Shaymin got "has no Grass Energy". Now a Pokemon with an Ability is not flagged for an attack it never needs to use.
2. A Pokemon was flagged for a missing Energy type even when another of its attacks could be paid. Now it is flagged only when no attack can be paid.
3. When the card database did not have your printing, the app read another printing by name and trusted its attack costs. That printing's costs now give a "Check this card's attack cost" warning, not a critical.
4. "Damage ceiling is too low" was critical for anything under 230. A hit of 170 or more knocks out a 340 HP threat in two hits, so it is now a warning ("Two hits for the biggest threats"). Viability now rises with damage instead of jumping between three fixed levels, so different builds get different scores.
5. Conditional damage: a bonus that needs cards in the discard pile (Dhelmise's 140 more with 4 Hide 'n' Sneak Pokemon there) now counts only when your list holds enough of those cards. The grade says what it hits early and what it hits once the condition is met.
6. Hide 'n' Sneak and other Abilities that stop effects or damage are now credited ("Hard to disrupt"). The prize trade now counts how many of your Pokemon give up two prizes, and one-prize attackers that two-shot are credited.
7. Odds picked the main attacker by its best printed damage and called it "ready" by turn 2. It now uses realistic damage. When the full hit waits on the discard pile it says "in hand by turn 2" and explains that filling the discard pile is not counted.
8. "Line locked in prizes" showed 0.0% on one list and <0.1% on the other. A lock that can happen now always shows <0.1% when it is that rare.
9. Names ending in ex showed as "Ex" ("Latias Ex"). Fixed.
10. Saved decks read their card data again once, the next time you open them online, so they pick up the new Ability and damage details.
11. HnS Legacy's Energy section was there (7 Energy, 60 cards). Your screenshot was cut off above it.

Note: other decks can score differently too. The Charizard test deck went from 3.7 to 6.0, because Rotom V is played for its Ability and is no longer flagged for having no Lightning Energy.

## App fixes

Home, help and dialogs
1. Send feedback said "Could not open a new tab" even when GitHub opened. Fixed.
2. Escape did not close any dialog outside a game, and tapping the dim area never closed a sheet. Both close it now, unless you have typed something in it.
3. Loading the same starter deck twice made a second copy. It now opens the one you have.

Prize game, results and data
4. A new personal best was lost on reload. It is saved now.
5. Escape during the Reach check could leave its question open over Home, and answering it recorded the game you quit. Fixed.
6. A timed game you left (by opening a deck or daily link) could end itself later and pop up Results. Leaving a game now stops its clock.
7. In a tournament block, the big Play again button quietly ended the block. Mid block it now reads Next game and continues the block.
8. Restoring a damaged backup wiped all decks. Now nothing changes and you get a message.
9. Edit deck accepted a list under 10 cards. It now has the same check as Import.
10. A deck link with broken encoding failed with no message. It now says the link could not be read.
11. Prized energy showed as "Basic {R} Energy" after a game. It now shows "Basic Fire Energy".
12. On a computer, Play again sat far below the results. It now stays in view at the bottom.
13. Table check hand cards were 36px wide on phones. Now 44px.
14. The card in view was cut off on shorter phones and in Table check. It now fits.

Practice, notes and logs
15. After Edit deck saved a new list, Hand, Goldfish, Resource count and Opponent prize read kept dealing cards from the old list. They now start fresh.
16. Compare with the original scrolled under the sticky tabs. It now lands right below them.
17. Editing a logged match whose deck was deleted moved it to another deck. It now keeps the deleted deck.
18. A matchup note for an opponent that already had one replaced it without asking. It now asks first.
19. Several small buttons were under 44px on phones (Resource count and prize read steppers, Search deck filter, the prize plan link). All 44px now.
20. Progress said "Same as the 10 before" when fewer than 10 games came before. It now says the real number.

## Checked, not changed

Duplicate in Edit ignores list changes in the same box. Importing a second deck with an existing name gives no warning. Android back leaves the app. The game screen does not show "game N of M" in a tournament. These have been this way for a while and need your call.

## Not checked here

Starter lists and real card data, because the card database is not reachable from where I build. Art caching from the real card image sites.
