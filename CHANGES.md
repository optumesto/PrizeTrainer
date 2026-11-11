# RdyDeck changelog

Versions: 2.0, 2.1 and so on for feature releases, 2.1.1 for small fixes. Each release also has a build number, which keeps counting from the 1.x builds and names the update cache in sw.js.

# RdyDeck 2.1 (build 65): Trainers, Special Energy and the ACE SPEC in the grade, a tighter Synergy and Power, delete deck in the deck menus, and Against the meta over two sets (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v65), CHANGES.md, matchups.json, refresh-matchups.mjs, .github/workflows/refresh-data.yml, .github/matchups-cache.json.

Decks
- Delete deck is now the last row of the deck menu on home and of a new menu on the deck page header, next to Hide or Show, behind one confirm. It no longer sits at the bottom of Game modes.

Against the meta
- The matchup stats cover the last two sets, from the day the older one came out (now the 30th Celebration), and roll forward when a new set comes out. The page says which set the window starts at.
- Every deck with 10 or more lists since the newest set keeps a row, and the opponents are the decks played most since that set came out.
- The weekly job keeps events it already read when it has to stop, reads at a slower pace, and a manual backfill can read up to 150 events at once.

Grade
- Every Trainer and Special Energy is checked against the rest of the list, from its own card text. A card that needs something the list does not run (Glass Trumpet or Area Zero Underdepths with no Tera Pokemon, Hyper Aroma with no Stage 1, Team Rocket's Energy with no Team Rocket's Pokemon) shows under Fix first and lowers Synergy.
- An evolution deck with 3 or fewer cards that find Pokemon, or any deck with fewer than 7 Supporters, gets a warning.
- The ACE SPEC gets its own line under How it plays: what it does and whether it works with the list. A list with no ACE SPEC, or one whose ACE SPEC has nothing to work with, gets a warning and a lower grade. A list with 2 or more is already marked not legal above the grade; the line now names the cards to cut down to one. When the list has a clear hole (nothing pulls up a Benched Pokemon, very few ways to find Pokemon or draw), the line can name an ACE SPEC that fills it, as a suggestion only.
- Secret Box no longer counts as a way to find Pokemon (its "Pokemon Tool" was read as a Pokemon). This also fixes the odds for lists that run it.
- Saved decks are read again once to store Special Energy text.
- Synergy now also measures how tightly the list fits together, from the cards themselves: how many Energy types the real attackers need, how much of the Energy each attacker can use, how many Pokemon lines the list spreads over, Basic Energy nothing uses, and how many Trainers and Pokemon are single copies. Pairs that work together (Rare Candy into a Stage 2, a copier) count in its favor. A toolbox deck spreads on purpose, so its spread counts half. When the fit holds a list back, How it plays says why in one line.
- The overall grade only feels the fit once it falls below what most winning lists reach, so focused lists keep their grades and random piles drop.
- Checked on the top 16 lists from the last 8 Limitless events (128 lists): Synergy now runs from 5.7 to 10 (median 8.4, 6 lists at 10, was 127 at 10). Overall grades: 2 lists move, by 0.1 and 0.3. No new warnings. A random 60 card pile that graded 8.4 now grades 5.4.
- Power counts only attackers that can reach the board: every Pokemon a card evolves from has to be in the list, or the list runs 2 or more Rare Candy for a Stage 2 whose Stage 1 is missing. An Ability like Mew ex's Memory Helix borrows attacks only from Pokemon that can reach the Bench, and a spread engine counts only from cards that can reach the board.
- An attack counts only when the list runs as many Energy cards of each type as it asks for. A Special Energy that works only on some Pokemon (Prism Energy on Basic Pokemon, Neo Upper Energy on Stage 2, Team Rocket's Energy on Team Rocket's Pokemon) counts only for those.
- The hardest hit counts for less when the list runs few Energy that attacker can use for it (a warning names it), and when it rests on one copy with no attacker close behind (a warning names it, except in decks with 3 or more other strong attackers).
- Eevee ex (Rainbow DNA) now counts as the Eevee that Pokemon ex like Jolteon ex evolve from. Before, a list with Eevee ex and Jolteon ex was told Jolteon ex could never reach the board.
- Checked on the same 128 lists: Power is unchanged in range (6.6 to 9.3, median 8.6). Overall grades: 7 lists move. One Mega Rayquaza list goes from 6.8 to 8.6 (the Eevee ex fix), five Team Rocket's Honchkrow lists go from 8.6 to 8.5, and one Mega Charizard X list goes from 9.1 to 8.8 (its Latias ex, run for its Ability, no longer counts as an attacker it cannot power). Random 60 card piles now score 3.4 to 8.1 on Power (were 6.7 to 8.6) and 0.3 to 4.1 overall.

# RdyDeck 2.0.3 (build 64): deck strength from tournament finishes, and no grade cliff at the one-shot line (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v64, the build number), refresh-matchups.mjs, CHANGES.md.

Version
- Settings shows RdyDeck v2.0.3.

Against the meta
- The weekly data job now keeps how high every list finished in each Limitless online event, not just its match record: per deck, its lists, their average finish, and how many made the top 8, top 16 and top 10%. Events already read are read once more for their standings, a few a week, so no request goes beyond the usual budget. Nothing is scraped; it is the same public play API.
- Each deck gets a strength rank that counts its win rate and its finishes together. High finishes count by their square, so a top 10% list weighs far more than one in the middle. Decks with few results are pulled toward the average, so a few lucky lists do not top the table. "Other" gets no rank.
- The Grade tab shows the rank under the win rate, for example "Strength: 4th of 38 decks", with the average finish and how many lists made the top 16 against what an average deck with as many lists would place. A deck that matches no archetype sees the three strongest decks instead.
- Kept per source like the match records, so in-person results can be added later without changing the app.
- The numbers appear after the next run of the data job.

Grade
- Decks whose main attacker gives up 3 prizes no longer drop sharply when their best hit falls just under the one-shot line. The prize score now slides down as the damage falls, instead of jumping. Mega Lucario goes from 7.4 to 8.2, Lucario Hariyama 7.7 to 8.5, Mega Sharpedo Toxtricity 7.5 to 8.3, Mega Abomasnow 6.9 to 7.2, Mega Greninja 7.0 to 7.3, Mega Starmie and Mega Golisopod 6.6 to 6.8. The warning now says which Pokemon the best hit still one-shots.

# RdyDeck 2.0.2 (build 63): lock, mill and stall decks graded on how they win (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v63, the build number), CHANGES.md.

Version
- Settings shows RdyDeck v2.0.2.

Grade
- The grader now reads what a card does to stop the opponent, from its text: Item, Supporter, Tool and Stadium locks, Abilities turned off (Iron Thorns ex's Initialization, Legendary Pyroduct, Team Rocket's Watchtower), Pokemon that can't attack or retreat, cards milled from the opponent's deck, Energy discarded from their Pokemon, hand disruption, walls that prevent damage (Crustle's Mysterious Rock Inn, Neutralization Zone) and healing. Saved decks are read again once to pick this up.
- Each piece counts by how much it stops, how often it is on (an Ability on the Pokemon that sits Active, the attack the deck uses every turn, a coin flip half the time) and how many copies the list runs. A deck counts as lock, mill or stall only when its lock, mill and wall pieces together are strong enough, so one tech card in an attacking deck changes nothing.
- When that counts for more than the deck's damage, the grade uses it. The damage finding becomes "Low damage, by design", a "Wins by locking" (or milling, or stalling) finding names the biggest piece, and the deck is told to keep that Pokemon Active when the lock only works there. A warning shows when the lock rests on a Pokemon the list runs only 1 or 2 of.
- How it plays opens with "Game plan: Lock" (or Mill, or Stall), listing what the deck stops in plain words.
- Iron Thorns goes from 6.5 to 7.3 and Tyranitar from 7.0 to 8.0. Crustle, Sylveon, Dudunsparce Control, Hydreigon and decks with a lock tech (Dragapult Iron Thorns) grade as before, since their damage already counts for more. No other meta deck's grade moves.

# RdyDeck 2.0.1 (build 62): grade fixes for attacks with conditions, Festival Lead attacking twice and Okidogi, SEO fixes, and meta notes (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v62, the build number), check-cards.mjs, deck-grader.html, opening-odds.html, prize-trainer.html, rotation.html, sitemap.xml, .github/workflows/refresh-data.yml, CHANGES.md.
New files: update-sitemap.mjs, og-deck-grader.png, og-opening-odds.png, og-prize-trainer.png, og-rotation.png.

Version
- Settings shows RdyDeck v2.0.1. A batch of fixes on top of 2.0, so a point release rather than 2.1.

Search and sharing
- The deck grader page no longer says RdyDeck does not compare your deck to the meta. It explains Against the meta, and that the stats are for decks like yours, not your exact list.
- Each guide page (deck grader, opening odds, prize trainer, rotation) has its own share image and structured data (page, breadcrumbs, site). The home page adds site and organization data with the logo.
- The home page's search description is shorter, so it is not cut off in results.
- sitemap.xml dates now follow when each page last changed. update-sitemap.mjs sets them from git history, and the Monday data job runs it (it now checks out the full history for that).

In the app
- The Grade tab's note and the Odds tab's note no longer say matchup data is missing. They point to Against the meta on the Grade tab.

Weekly card check
- Basic Energy no longer shows under "Needs a person to check" when its set is missing from TCGdex (10 Fire Energy in a starter list is legal).

Grade
- Attacks that do more damage only under a printed condition now read that condition from the card. Examples: more damage if it moved from your Bench this turn (Mega Lopunny's Gale Thrust), if your opponent's Active already has damage counters (Mega Golisopod's Finishing Blow), if it has extra Energy (Mega Excadrill's Maximum Drilling), if a Stadium is in play, if certain Pokemon are on your Bench, if it has a type of Energy attached, after you played a named Supporter (Team Rocket's Kangaskhan ex), or with Pokemon with an Ability in your discard pile (Dhelmise's Vengeful Anchor). The grade counts the full number only when the list can meet the condition, and the plan says which it counted and why. Every current meta list meets its condition, so these grades stay the same, and the plan now says how (Mega Golisopod's Munkidori moves damage counters onto the Active first).
- An Ability that puts damage counters on the opponent after a cost, in a second sentence, is now read (Mega Greninja's Mortal Shuriken). Mega Greninja goes from 6.9 to 7.0.
- Dipplin's Festival Lead lets it attack twice a turn while Festival Grounds is in play. The grade now counts both attacks when the list runs at least 2 Festival Grounds, and the plan says so. Damage boosts that last the turn or come from a Tool count on both attacks. Festival Lead goes from 8.0 to 9.3.
- An Ability that searches for Energy and attaches it, with the attach in a later part of the sentence (Steven's Metagross ex's X-Boot), now counts as extra Energy. Steven's Metagross grades 9.2 as before.
- A Pokemon whose own Ability adds damage with one type of Energy attached (Okidogi's Adrena-Power, 100 more with Darkness Energy) counts that boost when the list runs Energy that gives the type, Prism Energy included. Okidogi Barbaracle now names Okidogi as the main attacker, not Barbaracle (Barbaracle's Stone Arms attaches the Energy), and the plan says Okidogi hits for 170 with 100 more HP. Grade 8.1 as before.
- Attacks that do more on the next turn (Metagross's Meteor Mash), only before you take a prize (Steelix's Welcoming Tail), on the turn it evolves (Magnezone's Upper Spark) or with enough Energy of a type in play (Raikou's Electro Fall) read those conditions too.
- The main attacker's always-on Abilities now show in the plan, for example Iron Thorns ex's Initialization, which turns off the Abilities of every Pokemon with a Rule Box on both sides while it is Active.
- "Your opponent can't play ACE SPEC cards" Abilities are read (Genesect's ACE Nullifier), with the Pokemon Tool it needs.
- An Ability with a condition printed at its start shows that condition in the plan, for example Thwackey's Boom Boom Groove: "only if your Active Pokemon has the Festival Lead Ability".
- Every other test list and built-in deck grades the same as 2.0, Mega Golisopod and Mega Starmie included. Saved decks re-read once (card data version 13).

# RdyDeck 2.0 (build 61): Against the meta matchup stats, the Android app in the header, and grade fixes for Joltik Box, Alakazam, Slowking and Crustle (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v61, the build number, matchups.json is fetched newest first, like data.json), .github/workflows/refresh-data.yml, README.md, CHANGES.md.
New files: refresh-matchups.mjs. The weekly job adds matchups.json and .github/matchups-cache.json on its first run.

Version numbers
- Versions now read like 2.0. Settings shows RdyDeck v2.0. Feature releases go 2.1, 2.2, and small fixes 2.1.1. The old v1 to v60 releases count as 1.x, the PrizeTrainer era, listed below. A build number keeps counting underneath for the update cache and shows only in feedback mail (build 61).

Header
- The Android app note moved from the bottom of the home screen into the header, as a pill under the logo: "Android app coming soon to Google Play". Hidden inside the Play app. It becomes the Play link once the app is live.

Grade
- A deck named for a Pokemon that sets up with an attack (Joltik's Jolting Charge) leads with its real attackers. Joltik Box names Pikachu ex, says Joltik sets them up, and the "Only 1 Galvantula" warning is gone. Grade 9.1 as before.
- Attacks that count the cards in your hand (Alakazam's Powerful Hand) count a bigger hand when the list runs draw Abilities: 7 cards, plus up to 4 more (11 with Kadabra, Alakazam and Dudunsparce). Alakazam Dudunsparce goes from 7.3 to 8.0 and Alakazam Dusknoir from 8.7 to 9.3. Saved decks re-read once (card data version 12).
- A three-prize Pokemon played for its Ability in a deck whose main attacker gives up one prize (Mega Kangaskhan ex drawing for Slowking or Crustle) gets its own, smaller warning: "A three-prize Pokemon in a one-prize deck". Slowking goes from 7.8 to 8.3 and Crustle from 7.4 to 7.9.
- Every other test list and built-in deck grades the same as v60.

Against the meta
- The Grade tab has a new section, Against the meta, right after Rotation. It finds the deck archetype closest to your list by the Pokemon it plays and shows how that archetype did against each of the most played decks: win rate and number of matches, with an overall record above. You can pick another archetype, and the pick is kept for that deck.
- Rows with fewer than 20 matches are gray, with one line saying they are too few to trust. Every number comes from matchups.json. Credit line: Data: Limitless TCG, linked.
- The numbers come from the Limitless play API (online tournaments of 64 or more players over the last 14 days, from the newest set's release day). Counted the way Limitless counts its own matchup pages: ties are matches but not wins, and mirrors, byes and no-shows are left out.
- refresh-matchups.mjs runs in the Monday job after refresh-data.mjs. It reads each event once and keeps it in .github/matchups-cache.json, reads at most 12 new events a run (about 27 requests, one at a time with a pause), and stops on a rate limit. A failed or thin run keeps last week's file. The page never asks Limitless itself.
- The file keeps every record per source, so in-person results can be added later as a second source. When there is more than one, a second picker shows All results, Online or In person.
- Expanded and prerelease decks show no section. With no file yet, the section is simply not there.
- How the grade works now says the grade itself does not compare you to the metagame, and points to Against the meta.
- Under the record, one line says whether the numbers are for your exact list. Lists that finished in the top 16 are kept as short codes (card names and counts, no set numbers). When your list is one of them card for card, it says so: "This is the same list, card for card, that finished 3rd at (event) on (day)." Otherwise: "These are results for all (deck) lists, not your exact list." No player names are kept.

# 1.x: the PrizeTrainer era (builds v1 to v60)

## v60: the grade reads what every Pokemon's Abilities and attacks do from card text, and Power counts more kinds of decks right (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v60), CHANGES.md.
Not changed: everything else, including data.json, ads.txt, the ad code and Goldfish.

- One reader for card text. Every Pokemon Ability and attack is read sentence by sentence for draw, search, Energy attachment, gusting, switching, damage counters, spread and Bench hits, Item and Ability lock, Energy removal and healing, with what each needs first (Darkness Energy attached, a Pokemon in play, only while Active, only when Knocked Out) and what it costs. New sets grade from their text without hand fixes. Saved decks re-read once (card data version 11).
- The plan says what the main attacker's attack does besides damage ("Phantom Dive also puts 6 damage counters on your opponent's Benched Pokemon in any way you like") and what each Ability does (Munkidori's Adrena-Brain with the Darkness Energy it needs, Lunatone discarding a Basic Fighting Energy to draw 3, Iono's Bellibolt ex attaching Energy as often as you like).
- Both Active Pokemon Energy attacks (Teal Mask Ogerpon ex's Myriad Leaf Shower) count the attack's own cost, one more when the list can attach extra Energy, Wild Growth doubling, and 2 Energy on the opponent's Active. They read 120 before. Ogerpon Meganium goes from 6.7 to 8.8 and names Teal Mask Ogerpon ex as the main attacker.
- Slowking's Seek Inspiration counts when the list runs cards that put the right Pokemon on top of the deck first (Ciphermaniac's Codebreaking, Academy at Night). It counts the best attack of a Pokemon without a Rule Box, and an Energy discard bonus only when the list runs that Energy. Slowking goes from 6.9 to 7.8.
- An attack that hits 3 of the opponent's Pokemon at once (Kyurem's Trifrost) gets credit and a "Hits several Pokemon at once" note.
- Attacks that count a Bench count a full one (4), and both Benches count 8 (Toucannon's Feather Rondo, Lillie's Clefairy ex's Full Moon Rondo). Toucannon goes from 6.7 to 8.1. Rocket Feathers counts 3 Supporters discarded.
- Attacks that Knock Out the opponent's Active outright are read (Mega Absol ex's Terminal Period when the list can place damage counters, coin flip Knock Outs at their chance). Mega Absol Box goes from 7.0 to 8.9.
- Mew ex's Memory Helix uses the attacks of the other Pokemon in the list. Mew Box goes from 6.9 to 7.6.
- A deck named for its engine (Toxtricity Box, Tera Box (Noctowl)) leads with the attackers and says the named Pokemon powers them. Hand practice offers the engine's line too.
- The two Dragapult test lists now read as closing through spread: 7.4 to 8.6 and 7.2 to 8.4. Marnie's Grimmsnarl Froslass goes from 7.1 to 8.5 and Alakazam Dudunsparce from 6.8 to 7.3.
- When a card could not be read, the verdict says so instead of "No problems found".
- Card names keep small words in lower case (Academy at Night).
- Every other test list and built-in deck grades the same as v59, Basic Box included (9.0).

## v59: toolbox decks graded right, Abilities read from card text, more pasted list formats, and new flags for dead Rare Candy, thin lines, no search and no Boss's Orders (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v59), CHANGES.md.
Not changed: everything else, including data.json, ads.txt, the ad code and the Goldfish and Turn 1 work in v58.

- Lists pasted as "4x Ultra Ball" did not import at all. Lists with set codes in brackets, "Ultra Ball (MEG) 131" or "(MEG 131)", imported with every card unknown and graded 0.3. Both now read normally, and so do lines that start with a bullet.
- A misspelled card ("Profesor Research") used to show only "Card data read for 13/15 entries". The review screen now names it and says to check the spelling in Edit deck.
- Rare Candy in a list with no Stage 2 Pokemon is flagged as a card that cannot be played.
- One copy of a Basic under 2 or more of its evolutions (1 Riolu for 3 Mega Lucario ex) is flagged.
- One copy of the main attacker is flagged.
- A list with nothing that searches for a Pokemon is flagged.
- A list with nothing that pulls up a Benched Pokemon (Boss's Orders, Prime Catcher) is flagged, noting some decks skip it on purpose. The built-in Slowking list, which runs none, now shows this note.
- A deck named for a Basic ("Riolu") now picks the Pokemon that evolves from it as the main attacker.
- Fighting Gong counts as a card that finds Pokemon again.
- The Odds tab no longer names MetaForge.
- These flags are notes and do not change the score.
- Toolbox decks: a list with 4 or more different Pokemon that each hit for 170 or more on their own gets credit for it in Power and a "Many ways to attack" note. Basic Box goes from 8.7 to 9.0, the Raging Bolt Ogerpon test list from 8.7 to 9.0 and Steven's Metagross from 8.9 to 9.2. Every other test list and built-in deck grades the same as v58.
- In a toolbox deck that is not named for one Pokemon, the plan says "Attackers" and names them all, Hand practice offers each of them as a turn 1 line, and the Odds tab says these are one attacker's odds. Basic Box no longer reads as looking only for Mega Kangaskhan ex.
- The grade reads Pokemon Abilities from card text with the same parser Goldfish uses. Meowth ex's Last-Ditch Catch counts as a search, and the plan lists what other Abilities do: Teal Mask Ogerpon ex's Teal Dance, Latias ex's Skyliner, Iron Leaves ex's Rapid Vernier, Chien-Pao's Snow Sink, and Lillie's Clefairy ex's Fairy Zone with the Psychic attackers in the list that hit Dragon Pokemon for double. The main attacker's own Ability is named too (Mega Kangaskhan ex's Run Errand).
- sw.js: a page open waits at most 3 seconds for the network, then opens the saved copy and saves the new one for next time (from the load fix branch). Cache prize-trainer-v59. Version reads v59.

## v58: Goldfish plays your cards' own text, and Turn 1 line can be played out (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v58), CHANGES.md.
Not changed: everything else, including data.json, ads.txt and the ad code.

- Goldfish used to know about a dozen cards by name. Abilities, Items, Supporters and Stadiums now do what their printed text says: draws, searches, looking at the top of the deck, discard costs, the discard pile, attaching Energy, switching, coin flips and "your turn ends".
- Abilities follow their own limits: once a turn, Active Spot only (Mega Kangaskhan ex's Run Errand), only 1 of that name a turn, first turn only, from your hand (Talonflame ex), when played to the Bench (Meowth ex, Mega Rayquaza ex, Iron Leaves ex), when evolving from your hand (Kadabra, Alakazam). Legendary Pyroduct and an Active Iron Thorns ex turn off the Abilities they name.
- Supporters keep to one a turn and none on turn 1 going first, except cards that say otherwise (Carmine, Team Rocket's Proton). Cards that need a Pokemon Knocked Out or Prizes taken (Fezandipiti ex, Unfair Stamp, Special Red Card, Counter Catcher) say why they can't be played here.
- Search and pick screens only let you take cards the text allows (Dawn's one of each stage, Crispin's two types, Secret Box's one of each kind, Buddy-Buddy Poffin's 70 HP or less). The card's text shows under its buttons.
- Effects on your opponent and healing do nothing in Goldfish and say so. A card the app can't follow yet (Tool Scrapper, Grand Tree, Salvatore) shows its text and you do it with Draw, Search and Discard.
- Turn 1 line has "Play this hand in Goldfish": the same opening hand, prizes and draws, played out turn by turn.
- Saved decks re-read their card data once to store the card text. Until then Goldfish reads it from a built-in copy of about 120 common cards.
- Grades are unchanged: built-in decks and the test lists grade the same as v57.
- sw.js cache: prize-trainer-v58. Version reads v58.

## v57: illegal lists no longer read Tournament-ready, and the grade flags dead cards, no draw Supporters and heavy Energy (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v57), CHANGES.md.
Not changed: everything else, including data.json, ads.txt, the ad code and the sims.

- A list that breaks a deck building rule (5 copies of a card, 2 ACE SPEC cards, 59 cards) showed "Not tournament legal yet" and then "Tournament-ready, ready for an event as it is" right under it. Its band now reads "Not legal yet" in red, on the grade and on the home screen, and the verdict says to fix the rule first. The score itself is unchanged, as before.
- Sharing the grade of a list that breaks a deck building rule asks you to fix it first, so it never shares as Tournament-ready.
- A Pokemon whose Ability and attacks both need Energy the list does not run (Teal Mask Ogerpon ex in a Fighting list) is now called a dead card, with how many copies and what to do. Before, the grade only said its Ability had nothing to attach.
- A list with no Supporter that draws or searches is flagged, naming the only draw it has left.
- A list with 22 or more Energy is flagged as heavy on Energy, unless its attacks count Energy (Ceruledge ex keeps its 21 with no flag).
- Built-in decks and the 24 test lists grade the same as v56.
- sw.js cache: prize-trainer-v57. Version reads v57.

## v56: the grade reads attacks that count Pokemon in play and cards off the top of the deck (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v56), CHANGES.md.
Not changed: everything else, including data.json, ads.txt and the ad code.

- Attacks that do damage for each of your Pokemon in play or on your Bench were a flat guess. They now count what your list can have there at once, one per evolution line: Beedrill ex's Rumbling Bees reaches 440 with 4 Beedrill ex, Vikavolt's Circuit Cannon 360 with 3 Charjabug on the Bench (the fourth line is Vikavolt itself), Seismitoad's Round 280 with 4 lines that know Round. Mamoswine ex, Reuniclus, Erika's Victreebel, Team Rocket's Spidops, Pikachu, Drifblim, Passimian and Farigiraf read the same way.
- Attacks that discard cards off the top of the deck and count them (Mega Abomasnow ex's Hammer-lanche, Magcargo ex's Ground Burn, Avalugg, Misty's Gyarados) were counted at their best case. The grade now uses the average for your list and says a bigger or smaller hit is down to luck. Magcargo ex went from 560 to about 230.
- Discard attacks with a printed cap are read as printed: Scizor ex's Cross Breaker 240, Sinistcha's Spill the Tea 210, Ethan's Magcargo's Lava Burst 350 at most (210 with 3 Energy on it), Mega Clefable ex's Shooting Moons 280 at most (240 with 3 Energy from your hand). Walking Wake's Undulating Slice is 180.
- Discard pile attacks now also read Basic Energy of one type (Kyogre, Heat Rotom ex), Supporters with Team Rocket in the name (Team Rocket's Porygon2 and Porygon-Z) and Pokemon with one attack (Dartrix).
- The Odds tab says where the cards go for each of these: on your Bench, in play or in your discard pile.
- Built-in decks and the 24 test lists grade the same as v55.
- Saved decks re-read their card data once, so older imports pick up the new details.
- sw.js cache: prize-trainer-v56. Version reads v56.

## v55: the grade reads discard pile damage, Ability boosts and natural Stage 2 lines (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v55), CHANGES.md.
Not changed: everything else, including data.json, ads.txt and the ad code.

- Attacks that do more damage for each card in your discard pile (Ethan's Typhlosion's Buddy Blast, Ceruledge ex's Abyssal Flames) were a guess. They now count the cards your list runs: Buddy Blast hits 280 with 4 Ethan's Adventure in the pile, and Abyssal Flames reaches a one-shot only with 16 Energy in the pile, which the grade calls a late game plan.
- Team Rocket's Mewtwo ex's Erasure Ball is capped at 280, as printed (2 Energy discarded). How it plays says Power Saver needs 4 Team Rocket's Pokemon in play, and a list without 4 is flagged as unable to attack.
- Cynthia's Roserade's Cheer On to Glory adds 30 to Cynthia's Pokemon, counted for 2 in play. Cynthia's Garchomp ex now one-shots at 350.
- Stage 2 lines that run as many Stage 1 Pokemon as Stage 2 (Cynthia's Garchomp ex 4-4-3, Dragapult ex, Team Rocket's Crobat ex) read "Evolves the long way" instead of the slow setup warning, and say to plan on attacking from your third turn.
- A Pokemon the list only plays to evolve (Dreepy into Drakloak in Ethan's Typhlosion) is no longer flagged for missing Energy.
- Trainer roles fixed from card text: Special Red Card no longer counts as your draw. Hassel and Drakloak's Recon Directive count as draw, Fighting Gong as Basic search, Grand Tree as Rare Candy, Xerosic's Machinations as hand disruption, Air Balloon as a way out of the Active Spot. Energy searches that attach to a Pokemon (Mega Gardevoir ex, Azurill) no longer count as Pokemon search.
- The Odds tab says what a discard pile attack does with 2 cards there and with the full count.
- Built-in deck changes: Dragapult 6.8 to 7.2, Ogerpon Meganium Hydrapple 8.4 to 8.8. Main attackers are unchanged.
- Saved decks re-read their card data once, so older imports pick up the new details.
- sw.js cache: prize-trainer-v55. Version reads v55.

## v54: the grade reads damage the card text spells out (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v54), CHANGES.md.
Not changed: everything else, including data.json, ads.txt and the ad code.

- Attacks that print no damage number but put damage counters or damage on the opponent's Pokemon (Oil Salvo, Mega Zygarde ex's Nullifying Zero, "in any way you like" attacks) were read as 0. They now count from the card text, with coin flips averaged.
- Bonuses that only apply on your next turn (Donphan, Rampardos ex, Kilowattrel, Komala) were added to this turn's hit. They are now left out.
- Attacks that discard Energy from all your Pokemon and do damage for each one (Raging Bolt ex's Bellowing Thunder, Mega Charizard X ex's Inferno X) are read like Storm Emerald: the grade shows how many Energy it takes to one-shot 280 and 340 HP. Coin flips for each Energy attached are averaged.
- Attacks that count your Pokemon in play or on your Bench are estimated at a full board (6 in play, 5 on the Bench) instead of 2 to 4, and called the app's estimate.
- Abilities that put damage counters (Dusknoir's and Dusclops's Cursed Blast) count toward the hardest hit, and How it plays says that using one Knocks Out that Pokemon and gives up a prize. Talonflame Dusknoir no longer names Dusknoir as the main attacker.
- Crustle's Mysterious Rock Inn is counted: the grade and How it plays say ex attackers cannot knock it out.
- How it plays says when the main attack cannot be used two turns in a row (Mega Lucario ex's Mega Brave, Zoroark ex's Slashing Strike) and what to use between, and when the big hit discards Energy from the attacker itself (Metagross's Metallic Hammer).
- An Ability that attaches a type of Basic Energy the list does not run (Teal Mask Ogerpon ex's Teal Dance with no Grass Energy) is now flagged instead of counted as a reason to play the card.
- The slow setup warning only counts Stage 2 Pokemon the deck leans on (the main attacker, or a line of 2 or more), so one Metagross in Mega Excadrill no longer marks the deck slow. Stage 2 lines are named in the warning.
- A deck with no name now weighs Pokemon it evolves from at most 2 per copy, so Mega Excadrill is no longer read as a Metagross deck.
- A deck with no name also counts the Mega Pokemon ex that put an attacker onto the Bench (Talonflame ex's Excited Dive) like the Pokemon it evolves from, so the Talonflame Dusknoir list picks Talonflame ex, not Mega Kangaskhan ex. How it plays says the Kangaskhan are there to bring Talonflame in.
- Prize trade text: a deck of only two-prize Pokemon is no longer told it is not handing over multi-prize turns. One three-prize Pokemon reads "gives up", not "give up".
- Built-in deck changes: Basic Box now counts Raging Bolt ex's Bellowing Thunder (grade 6.9 to 8.7). Main attackers are unchanged.
- Saved decks re-read their card data once, so older imports pick up the new details.
- sw.js cache: prize-trainer-v54. Version reads v54.

## v53: the grade names each deck's real main attacker (10 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v53), CHANGES.md.
Not changed: everything else, including data.json, ads.txt and the ad code.

- Cause: the app picked the main attacker by the biggest damage number it could read. Mega Rayquaza ex's Storm Emerald prints no number (it counts Energy in play), so Mega Kangaskhan ex's coin flip attack won, and Kangaskhan was named the attacker in the grade, the Odds tab and Hand practice.
- The main attacker now comes first from the deck's name (Mega Rayquaza, Slowking, Hydrapple, Crustle and so on), then from the list: copies of the attacker and what it evolves from, and how much of the list's Energy pays for its attack. Pokemon whose attacks cost only Colorless Energy and that draw or search are counted as support, not the attacker.
- Attacks that do damage for each Energy attached (Storm Emerald, Syrup Storm, Myriad Leaf Shower) are read from the card text. The grade shows how many Energy it takes to one-shot 280 and 340 HP, and how many the list runs. Meganium's Wild Growth is counted for Hydrapple.
- How it plays now opens with a Main attacker line and a Support line, each saying why, in plain words. Damage the app works out from the board is called its estimate, not a printed number.
- Odds and Hand practice use the same main attacker as the grade.
- Saved decks re-read their card data once, so older imports pick up the new attack details.
- Corrected built-in decks: Mega Rayquaza (was Mega Kangaskhan ex), Slowking (was Mega Kangaskhan ex), Ogerpon Meganium Hydrapple (now Hydrapple ex), Crustle Kangaskhan backup list (now Crustle).
- sw.js cache: prize-trainer-v53. Version reads v53.

## v52: ad spots on menu and data screens (9 Nov 2026)

All spots stay off until the AdSense ad unit ids are filled in. Nothing changes on the live site until then.

- Ad spots at breaks between sections on every screen that is not gameplay: home (end of More), deck grade (under Share grade), odds (under the tiles, and between Opening basics and Main attacker), cards (after Pokemon, and after Trainers), game results (above Session history) and the tournament log (under Log a match).
- Guide pages: a spot after the opening section, and one before the last section on the longer guides.
- Never two ads in view at once: a spot is skipped when it would sit within one screen height of another ad. On a computer that drops the second spot on the cards tab and the guides.
- Sized to fit the space it sits in: a 320 by 100 banner on phones. On computers each ad is as wide as its column (728 by 90 in the grade, odds, tournament log and guide columns, 970 by 90 across the cards list), home gets a 970 by 90 band under the deck list and side column, and game results gets a rectangle filling the right column above Session history.
- Every spot is labeled Advertisement, with a wide gap above and below so it is never tapped by mistake for a button.
- Still never in a game, hand, drill or pop-up sheet, never offline and never in the Google Play app.
- Computer layout: the grade, odds, hand, drills and notes tabs now read in a column centered on the page, instead of starting at the left edge with empty space on the right.
- Privacy policy: ads section lists the new screens.
- sw.js cache: prize-trainer-v52.

## v51: Prerelease section hidden for now (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v51), CHANGES.md.
Not changed: everything else, including ads.txt, the ad code, data.json and the set watch.

- The home prerelease card, the prerelease sheet and the Prerelease format choice (import and edit) are hidden.
- A deck already saved as a prerelease deck keeps working, and its editor still shows its format.
- The code stays. Setting PRE47_ON to true in index.html brings it all back. The set watch keeps running, so the card list is current when it returns.
- Version reads v51.

## v50: new sets reach the Prerelease section on their own (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v50), data.json (note only), README.md, CHANGES.md.
New files: watch-sets.mjs, .github/workflows/watch-sets.yml.
Not changed: everything else, including ads.txt and the ad code.

- A new GitHub Action runs twice a day. It looks for the next set (the next number in the series, or the first set of a new series) in pokemon-tcg-data and on TCGdex.
- Once either one has the whole English card list (every printed number and the set's total), it moves data.json's prerelease block to that set with its card names and numbers. A partial list is never used. If the two databases name any card differently, nothing changes and set-watch.md lists the cards.
- Event dates are in neither database, so none are guessed: the sheet shows the store date instead. The kit reads 4 booster packs, a 40 card deck and a foil promo card.
- It also fills in the current set's card list, so the Prerelease section works even when TCGdex is down.
- The site reads data.json live, so this needs no release when a set comes out.
- The app never shows a partial TCGdex list. The sheet says Loading while the list loads, and says when it could not load, instead of saying the list is not out yet.
- Version reads v50.

## v49: Prerelease section (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v49), data.json, CHANGES.md.
Not changed: everything else. Builds on main after v47 and ads.txt (there is no v48 release).

- Home shows a prerelease card from 4 weeks before a set's prerelease events until 3 weeks after release. It opens the set's sheet: event dates, what the Build and Battle Box holds, and the deck rules (exactly 40 cards, any number of copies, 4 prizes, extra Basic Energy at the store).
- Build a practice 40 on the sheet: the set's cards with art, tap to add copies, a Basic Energy row, then Save deck.
- Decks can be Prerelease, next to Standard and Expanded, on import and edit. Prize games for them use 4 prizes. Their Grade tab shows a prerelease check (40 cards, a Basic, evolution gaps) instead of the 0 to 10 grade. Odds and Hand practice are off for them for now.
- The set comes from the new prerelease block in data.json. Its card list is read from TCGdex once TCGdex has the set; until then a hand-checked cards list in data.json can fill the gap (names and numbers from the printed English cards).
- No new ad spots. The v47 ad code and ads.txt are unchanged.
- Version reads v49.

## v47: home and guide ad spots, ads privacy policy (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v47), privacy.html, deck-grader.html, opening-odds.html, prize-trainer.html, rotation.html, README.md, CHANGES.md.
New file: ads.js.
Not changed: everything else. Builds on v46.

Ads stay off until the fill-ins are set (PT_ADS in index.html, the top of ads.js). With them blank, nothing shows and no ad code loads.

## Ad spots
- Home: one spot at the end of More. Under it on phones, in the side column on wide screens. Shows after the age question is answered or skipped.
- Guide pages (deck grader, opening odds, prize trainer, rotation): one spot before the third heading, from ads.js. It uses the age group the app saved on this device; with none, the ad is requested as child-directed.
- Same look as the results and grade spots: a small Ad label between two hairlines, 320 by 100 at most.
- Every spot is off in the Play app (?src=play, or a visit that started there) and offline.
- The ad script now loads with ?client= so Google's consent message for the EEA, UK and Switzerland can show. Keep Auto ads off in AdSense so only these spots ever show.

## Privacy policy
- Says the website shows ads from Google AdSense and the Play app shows none, with Google's required cookie wording and opt out links, how each age group is treated, the consent message, and buy links and tips.
- The age group is listed with what is saved on your device.
- Effective date is a blank: set it to the day this goes live.

## Version
- Version reads v47.

## v46: Android note (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v46), CHANGES.md.
Not changed: everything else. Builds on v45.

- The About RdyDeck block on the home screen says "An Android app is coming soon to Google Play." in the same plain text as the rest of the block. No link yet.
- The line is hidden in Play mode (?src=play), so it never shows inside the Play app.
- Version reads v46.

## v45: sample grade, share grade, numbered daily (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v45), CHANGES.md.
Not changed: everything else. Builds on main after v44 and the Play app's Digital Asset Links.

## Sample grade
- A new player with no decks sees Grade a sample deck under Start by grading a deck. One tap loads the first starter deck (the most played list in the weekly data) and opens its grade.
- rdydeck.com/#sample does the same, for posts and guide pages.

## Share grade
- The grade has a Share grade button under Synergy and Power. It makes a 1200 by 630 picture of the grade (deck name, score, band, Synergy, Power, Can Your Deck Win?, rdydeck.com) and a link.
- The link carries only the list. Opening it fills Import, and after Import the grade opens. Whoever opens it gets the grade worked out on their own device, so a shared number cannot be made up. If they already have the list, its grade opens straight away.
- A held grade (cards not Standard legal now) says so on the picture. A deck with cards not read yet cannot be shared until they are read.
- The picture has no card art.
- Buttons: Share (phones), Copy link, Save image.

## Daily challenge
- Each day has a number, counted from 9 Nov 2026 as #1. The home card, the daily link sheet and the score banner show it.
- Share text: "RdyDeck Daily #N: 4 of 6 prizes in 1:23 ■■■■□□. Same deck and shuffle for everyone today."

## Share links
- Daily and grade links end in ?ref=daily or ?ref=grade, so visits from shares can be counted once there is a way to count them. Nothing is stored, and the tag is taken off the address bar on arrival.
- Version reads v45.

## v44: guide pages for search (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v44), sitemap.xml, CHANGES.md.
New files: deck-grader.html, opening-odds.html, prize-trainer.html, rotation.html.
Not changed: everything else. Builds on v43. The app looks and works the same.

## Guide pages
- Four plain pages Google can read and rank: the deck grader, opening odds, the prize trainer and the rotation checker. Each explains one tool and has a button that opens RdyDeck (the prize trainer page also opens the daily challenge).
- Same fonts, colors and light or dark theme as Terms and Privacy. Every page says RdyDeck is an unofficial fan-made app.
- Numbers on the pages come from the app's own Help text and code (grade bands, the 4.9 cap, 20,000 shuffles) or exact math for a 60 card deck (mulligan, prize and opening hand odds). Rotation dates match data.json and cite its sources.
- The rotation page says the next rotation is not announced yet. Update it when the official announcement comes.

## App
- The About RdyDeck block on the home screen links to the four guides, above Terms and Privacy, so Google finds them from the main page.
- Version reads v44.

## Search
- sitemap.xml lists the four new pages.

## v43: ready for the Google Play app (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v43), CHANGES.md.
New file: offline.html. Held back: .well-known/assetlinks.json (it goes up once the signing key fingerprints exist).
Not changed: everything else. Builds on v42. The web version looks and works the same as v42.

## Play mode
- The Play app opens https://rdydeck.com/?src=play. When RdyDeck sees that (or the Play app as the referrer), it switches to Play mode for that visit only.
- In Play mode: ads stay off whatever AdSense settings are filled in, the Install app button never shows, Share the app shares the rdydeck.com link, and the version reads "v43 (Google Play)" in Help, Settings and feedback emails.
- The mark lives in session storage, not local storage, because the Play app and Chrome share rdydeck.com's storage on the same phone. A normal Chrome visit never turns into Play mode.

## Offline page
- offline.html shows when a page can't load and nothing is saved yet (for example the very first open with no signal). Once RdyDeck has loaded once, the saved app opens instead, as before.
- A start address with ?src=play now finds the saved app offline too.

## Android app link
- .well-known/assetlinks.json proves rdydeck.com and the Play app belong together, so the app opens full screen with no address bar.
- Not uploaded yet. Its two fingerprints are placeholders until the upload key and Play App Signing key exist; it goes up only with the real ones. The package name com.rdydeck.app must match the Android app and can never change once published.

## v42: feedback by email (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v42), privacy.html, terms.html, CHANGES.md.
Not changed: everything else. Builds on v41.

## Feedback address
- support@rdydeck.com (Cloudflare Email Routing forwards it to the LLC inbox). It is set as `FEEDBACK_EMAIL` in index.html; if that is ever emptied, Send feedback hides itself.

## Feedback
- Send feedback no longer opens a public GitHub issue. It opens an email in the player's own email app, filled in with their message, the kind of feedback, the app version, the screen, device type and screen width, and the deck list only if they tick Include my list (kept short, since long mail links fail in some email apps).
- The sheet says nothing is sent until they press Send, asks players under 13 to have a parent send it, and shows the address to write to if no email app opens.
- No GitHub account is needed any more, and nothing is posted publicly.

## Privacy and Terms
- Privacy Policy: the GitHub row is gone; a new Feedback by email section says what the email holds, what we receive and how it is used; Children says under 13 should ask a parent, and that a child's email gets one reply at most and is then deleted.
- Terms, section 8: feedback "by email through Send feedback" instead of "through a GitHub issue".
- The effective date stays November 9, 2026; change it on both pages if this ships on a later day.

## v41: RdyDeck moves to rdydeck.com (9 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v41), terms.html, privacy.html, robots.txt, sitemap.xml, README.md, CHANGES.md.
Not changed: everything else.

## New home
- The canonical address, share links, social preview image and Google's structured data now point at https://rdydeck.com/. So do the Terms and Privacy canonicals, robots.txt and the sitemap.
- Shared deck links made from now on open at rdydeck.com.

## Moving saved decks
- On the old address (optumesto.github.io/PrizeTrainer), a player with no saved decks goes straight to rdydeck.com, keeping any shared deck or daily link.
- A player with saved decks sees a banner: "RdyDeck has moved to rdydeck.com." Move my decks opens rdydeck.com with the decks packed into the link, and the usual Add to my decks or Replace choice appears there. The old address keeps its copy, so nothing is lost.
- The decks ride in the part of the link after #, which browsers never send to any server, and they are cleared from the address bar as soon as they are read.
- If a player has too many decks for one link, the app opens Backup and asks them to save a file, then open it at rdydeck.com.

## v40: fixes from Muse's audit (9 Nov 2026)

v39 was never uploaded, so v40 carries its fixes too (fonts, icons, the workflow and the install button).
Changed files: index.html, sw.js (cache prize-trainer-v40), manifest.json, terms.html, privacy.html, robots.txt, sitemap.xml, refresh-data.mjs, check-cards.mjs, README.md, CHANGES.md.
New files: LICENSE, .nojekyll (empty), .github/workflows/refresh-data.yml (the workflow, now where GitHub runs it).
Delete: see DELETIONS.md. Not changed: data.json, fonts, icons, og-image.png.

## Rotation and the grade
- A card counts as safe only when its regulation mark is confirmed. A missing mark, a Pokémon mark read from another printing, or a reprint check that has not run yet now counts as "not confirmed", with its own tile and list, instead of safe.
- The rotation tiles add up: Basic Energy is listed under them, with the full card count.
- A deck with cards that are not Standard legal now cannot grade above 4.9. The first fix names those cards and says what the list alone would score. The grade refreshes when marks change.
- The grade text gives the real formula: Synergy times Power, divided by 10.

## Labels and numbers
- Tournament log: prizes are averaged per match, and now say so.
- The home streak says "scoring games in a row". The daily list control says "Cards per row".
- Odds and Hand: "This hand by T2/T3" is the chance from this opening hand. Compare's "Attacker by T3" says it is for any opening hand.
- Compare Lists shows 0 for an equal count instead of a blank.
- Results history numbers games from the first one, the same way Progress does.
- Hand no longer asks for Rare Candy when the list has none.
- The import example is a Standard legal Dragapult list.

## Screens and controls
- Prize guesses: the name never runs under the remove button, and the button is a real labelled button with a bigger tap area.
- The game's card track: the whole bar takes a tap, not only the thin dots. Side cards sit behind the centre card.
- Sheets (Settings, Log a match, matchup notes and the rest): a close button at the top, the title and action buttons stay on screen while you scroll, and a darker backdrop.
- Matchup notes: an empty opponent or plan is highlighted and focused. The placeholder reads "e.g. Gardevoir ex".
- Game modes say they carry over to every deck.
- Missed prize notes say "Notes saved" after each save. Toasts clear their text when they hide.
- Text fields are 16 px on phones, so iPhone no longer zooms in when you type.
- Light theme: the "wrong" badge has stronger contrast.
- Share the app: on a phone it copies the link, since iPhone ignores downloads.
- Ask the odds: each remove button names its card.
- The manifest no longer locks the app to portrait.
- Card picture addresses are escaped like every other value.

## Weekly data scripts
- refresh-data.mjs reads newer set ids with a letter after the number (like me02.5a).
- check-cards.mjs stops quietly passing when it cannot read the app's card fixes: the report says so and the step shows as failed.

## License, Terms and Privacy
- LICENSE: Copyright 2026 Optume Ventures LLC, all rights reserved. The font (SIL) and TCGdex (MIT) credits stay as they were.
- Terms and Privacy are clean boilerplate, effective November 9, 2026, with no draft mark or blanks. Contact is mmmilliard@optumeventures.com, with no mailing address.
- Terms: liability is limited to $50, disputes go to Elk County, Pennsylvania courts, after an informal try first.
- Privacy says what the app does today: decks stay on the device, card data comes from TCGdex, the Pokémon TCG API and Limitless, there are no accounts, no ads, no analytics and no cookies. It says it will be updated before ads launch.
- README: the repo layout and the font credit are current.

## Search (SEO)
- Every address (canonical, share image, structured data, robots.txt and sitemap.xml) points at https://optumesto.github.io/PrizeTrainer/, the live site.
- Structured data names RdyDeck as a free web app with its features, published by Optume Ventures LLC. No rating and no FAQ markup: there are no real ratings yet, and Google retired FAQ rich results in May 2026.
- About on Home has six folded questions and answers (what it is, prize training, the grade, the rotation check, imports, free and no account). They are in the page itself, so search engines read them without running the app. Home looks the same until you open one.
- A clearer meta description that says prize card trainer.

## At the domain move to rdydeck.com
Switch https://optumesto.github.io/PrizeTrainer/ back to https://rdydeck.com/ in: index.html (canonical, og:url, og:image, twitter:image, the structured data, and SHARE_HOME), terms.html and privacy.html (canonical), robots.txt and sitemap.xml. Then add rdydeck.com in Search Console and submit its sitemap.

## Checked
- The full test set at 320, 390 and 1280 px, plus new tests for every fix above.
- Not checked on a real phone: the confirm boxes for quitting a game, deleting a deck and revealing prizes.

## v39: fixes from testing the live site

Changed files: index.html, sw.js (cache prize-trainer-v39), manifest.json, terms.html, privacy.html, CHANGES.md.
New file: refresh-data.yml, which goes in .github/workflows/ (see step 2 below).
Not changed: data.json, refresh-data.mjs, check-cards.mjs, fonts, icons, og-image.png, robots.txt, sitemap.xml.

## What was wrong on the live site
- Fonts: GitHub's upload page put the four Saira files at the top of the repo, but v38 looked for them in a fonts folder. The live site fell back to a plain system font, so the header, buttons and tagline did not look as designed, and "Starter decks" ran to the edges of its button.
- Icons: the new Ready Check icons also landed at the top, while the app, manifest and service worker still read the old icons folder. Installs got the old icons, and iPhone had no home screen icon.
- Weekly data refresh: the workflow file sat at the top of the repo, so GitHub never ran it. Starter decks and meta only change when you upload a new data.json.

## Fixes
- Every font and icon path now points at the top of the repo, where your files already are. Nothing needs to move.
- The workflow now runs refresh-data.mjs and check-cards.mjs from the top of the repo too.
- On a computer, the Install app button sat under About at the very bottom. It now sits in the right column under More. On a phone it stays above Import a deck.
- The Cards tab said "expected to rotate" while Grade and home said "may rotate". All three now say "may rotate".

## Upload steps
1. Upload index.html, sw.js, manifest.json, terms.html and privacy.html, replacing the old ones.
2. Add the workflow: on the repo page choose Add file, then Create new file. Type .github/workflows/refresh-data.yml as the name (the slashes make the folders), paste in the contents of refresh-data.yml and commit. It then shows on the Actions tab with a Run workflow button.
3. Optional cleanup, nothing uses these any more: the icons folder, index.txt, sw.txt, refresh-data.txt, CHANGES.txt, the empty file named download, the seven barlow files and the two ibm-plex-mono files.

## v38: more room, one type system, settings, SEO, legal drafts and the Ready Check logo

Changed files: index.html, sw.js (cache prize-trainer-v38), manifest.json, CHANGES.md, icons/ (every icon replaced, plus apple-touch-icon.png and two maskable icons).
New files: fonts/ (4 font files: Saira and Saira Condensed), terms.html, privacy.html, robots.txt, sitemap.xml, og-image.png.
Not changed: data.json, scripts/, .github/.

## More room
- Home deck rows show the name, grade, format, card and game count, and the rotation line. Play and a menu button sit on the right.
- The Deck, Modes, Edit and Progress buttons, the average and best line, the recent score chips and the small cover card button moved into the menu (Grade, odds and cards; Prize game; Progress; Game modes; Edit the list; Cover card). Tapping a deck still opens its grade.
- The games played line under the header is one quiet line instead of boxes.
- On a computer: decks are one roomy column with Import, Starter decks, the daily challenge and More beside them. The page is capped at 1120 px wide (1280 px on very wide screens).
- Deck pages on a computer: tabs no longer stretch across the screen, Grade, Odds and Practice read in one column that lines up with the tabs, and the Prize game button sits at the right of the bottom bar.
- Checked on every tab (Grade, Odds, Cards, Hand, Drills, Notes and a prize game) at 320, 390, 900 and 1280 px, in dark and light.

## Layout fixes (your picks from the review sheet)
1. Deck pages on a phone: the header scrolls away with the page, the tabs stay pinned at the top, and the bottom bar is just the Prize game button. The Pokémon, Trainer and Energy counts still show on a computer, and on the Cards tab.
2. Grade: Rotation folds into one line, for example "8 cards may rotate in April 2027. 49 are safe." Tap it, or the may rotate chip at the top, to open the full detail.
3. Practice: Hand, Drills and Notes are main tabs next to Grade, Odds and Cards, so there is one row of tabs instead of two.
4. Prize game: Guess is the one filled button. Reveal prizes is a quiet outline button.
5. Results: the prize cards, with their art, come first under "Your guesses vs the prizes", each marked guessed or missed, with any guesses that were not prizes listed under them. The letter grade and the text table are gone. Notes on missed prizes open from one "Add a note about this game" button and save the same way as before.
- Checked at 320, 390 and 1280 px in dark and light.

## Bug fixes (audit)
- Back button and back gesture: the app never added history entries, so on a phone (and in the Play app) Back closed RdyDeck from a deck page, a game or an open sheet. Back now closes the open sheet first, then steps back to your decks. In a game it asks before quitting, and a sheet you have typed in stays open.
- The rotation chip on Grade, and Compare on Notes, now land just under the tabs. With the header scrolling away they stopped about 60 px short.
- Help and the tour still said Hand, Drills and Notes live under Practice. They now say each has its own tab.
- Walked every flow at 320, 390 and 1280 px with no errors: all prize counts, timers, table view, reach questions, tournament blocks, daily challenge, starter decks, import edge cases, editing, hiding and deleting decks, deck links, the tournament log, settings after a reload, and Clear all data. Buttons, pictures and fields on the main screens all have labels.

## Header and logo
- New logo, Ready Check: a card with a red check. It is in the header (outline in the text color, check in RDY red, in dark and light), the browser tab icon, the home screen and install icons, the share image and the Google Play graphics.
- Install icons: the normal icons give the mark more room; separate maskable icons keep it inside the safe circle for Android's round and squircle masks. iPhone uses apple-touch-icon.png (180 px).
- Google Play files are not part of the site: rdydeck-play-icon-512.png (512 px, 32 bit) and rdydeck-play-feature-graphic.png (1024 x 500) sit next to this zip in your files.
- RDY is red and DECK is white on dark (dark ink on light).
- The line under the name reads "Can Your Deck Win?" and sits exactly the width of RDYDECK, both edges lined up, on every screen size and in both themes. The logo stands as tall as the two lines together. The share image and the Play feature graphic use the same lockup.
- The moon button is now a Settings gear.

## One type system
- Light and dark used different fonts and corner sizes because an old rule set Inter for light mode only. Both themes now use the same fonts, sizes, weights and corners; only colors change.
- Two faces, picked from the font test (option 4): Saira for text and Saira Condensed for headings, labels and numbers. Both free under the SIL Open Font License; Credits lists them. The mono font is gone.
- The font files are now part of the app, next to index.html, so they load the same on every device and work offline. Nothing loads from Google Fonts any more.
- To try other fonts later: add the new font files next to index.html and change the font names in the "v38: one type system" block of index.html.

## Small text
- All small text (deck facts, sources, notes, counts) uses one plain style: Saira, the same size and color everywhere. No dots between facts and no typewriter-style counts.
- Deck rows read like a sentence: "Standard, 2 prize games played" and "8 cards may rotate in April 2027". The card count shows only when a deck is not 60 cards.
- Tags such as Tournament-ready, Worth fixing and Expected are plain colored words instead of boxed chips.
- Section labels share one style (condensed capitals), and numbers line up in columns.
- The rotation tile on Grade says "may rotate", which fits its box on a phone.

## Settings
- Theme (Dark or Light), Cards per row, Save and open decks, the Age setting (when ads are on), Help and feedback, Terms of Service, Privacy Policy and Clear all data.
- Clear all data is no longer on the home screen.

## Search and sharing (SEO)
- Page title: "RdyDeck: Pokémon TCG Deck Grader and Prize Trainer", with a description, canonical address https://rdydeck.com/, Open Graph and Twitter share cards (og-image.png, 1200 x 630) and WebApplication structured data (free, price 0, publisher Optume Ventures LLC).
- robots.txt and sitemap.xml point search engines at rdydeck.com.
- Home ends with a short About RdyDeck block in plain text, so search engines have words to read, with links to Terms, Privacy and Credits.

### What you need to set for rdydeck.com
1. Use a new GitHub repo for rdydeck.com (for example "rdydeck") with these files, and set its Pages custom domain to rdydeck.com. GitHub writes a CNAME file for you. Point the domain's DNS at GitHub Pages (four A records and a www CNAME, listed on GitHub's "Managing a custom domain" page) and turn on Enforce HTTPS. Add the workflow file the way v39 step 2 says, since the upload page drops folders.
2. Do not set the custom domain on the PrizeTrainer repo. GitHub would then send optumesto.github.io/PrizeTrainer straight to rdydeck.com, and players would never get back to the old address to save their decks. Saved decks belong to one web address, so they do not move by themselves.
3. Keep the old PrizeTrainer address running for a while so players can open Save and open decks there, save a file, and open it on rdydeck.com.
4. rdydeck.app: forward it to https://rdydeck.com/ at your domain registrar (a permanent 301 forward).
5. After the site is live: add rdydeck.com to Google Search Console, submit https://rdydeck.com/sitemap.xml, and check the share card with a link preview tool.

## Terms and Privacy (drafts)
- terms.html and privacy.html match the app's look and are marked "Draft for attorney review". Every fact that is not known yet is a [bracketed] blank: dates, contact email, mailing address, county, liability cap, consent tool, opt out link and hosting.
- They cover: Optume Ventures LLC (Pennsylvania) as operator, no accounts, decks saved on the device, the services the app calls (card data, card pictures, ads, GitHub feedback), Google ads and cookies, the age question and how ads are tagged for children and teens, EEA and UK consent, US state opt out, the unofficial fan tool and trademark notice, and Google Play.
- Linked from Settings, Credits and legal, and the bottom of home.
- See rdydeck-v38-compliance-checklist.md for what has to happen before ads go live and before Google Play.
