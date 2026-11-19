# RdyDeck changelog

Versions: 2.0, 2.1 and so on for feature releases, 2.1.1 for small fixes. Each release also has a build number, which keeps counting from the 1.x builds and names the update cache in sw.js.

# RdyDeck 3.4.3 (build 132): Send feedback sends the message itself (19 Nov 2026)

Changed files: js/feedback-send.js (new), worker/rdydeck-worker.js (POST /api/feedback), worker/README.md, js/i18n.js, js/i18n-de.js, js/i18n-fr.js, js/i18n-it.js, privacy.html, terms.html, tests/feedback-check.mjs (new), js/core.js (version, What's new, PT_BUILD back in step with sw.js), index.html (script, version, stamps), sw.js (cache name prize-trainer-v132).

- Send feedback only opened a mail link. With no email app set up nothing opened, and the sheet closed with the message lost.
- Now it posts to /api/feedback on rdydeck.com. The Worker emails it to us through Cloudflare Email Routing (send_email binding FEEDBACK, var FEEDBACK_TO), from feedback@rdydeck.com. Only rdydeck.com may post; 10 a minute per IP, 200 a day in all; a hidden honeypot field.
- The player sees Sending, then Thanks, it's sent, or a plain reason it did not send, with the message kept, Try again, Send by email and Copy message. Off rdydeck.com it goes straight to email or copy.
- No new personal data: no name, no email address. Privacy policy and terms describe the form.
- What's new: Send feedback fixed.

# RdyDeck 3.4.2 (build 131): card lookups stop asking pokemontcg.io while it is down (19 Nov 2026)

Changed files: js/tcg-enrich.js, js/v31-tcgdex.js, js/core.js (version, What's new), index.html (version, stamps), sw.js (cache name prize-trainer-v131, API hosts skipped).

- pokemontcg.io's API answers 502/500 on every request (it is now part of Scrydex). The 500 page carries no CORS header, so the browser showed each failure as a CORS error, twice with the service worker. Players lost nothing (TCGdex is read first and every pokemontcg.io read has a TCGdex fallback), but every deck read waited about 3.6 seconds on failed retries and filled the console.
- After one request pokemontcg.io cannot answer, it is skipped for 30 minutes (localStorage ptcgDownUntil), in the deck read, the Stage 2 base read and the rotation reprint check.
- A list's "Fire Energy MEE 10" now matches TCGdex's "Basic Fire Energy" (TCGEnrich.sameCard), so basic Energy reads its own printing from TCGdex and never goes to pokemontcg.io. Before, it was read from another printing and then asked of pokemontcg.io on every read.
- The service worker no longer passes api.pokemontcg.io and api.tcgdex.net requests through (they were never saved).
- What's new: Card data bug fixed.

# RdyDeck 3.4.1 (build 130): goldfish guide page, real app screenshots for search (18 Nov 2026)

Changed files: .github/pages/goldfish.html (new), goldfish.html (new, built), build-pages.mjs (reads GF_TURNS from js/core.js into {{GF_TURNS}} and {{GF_TURNS_WORD}} on hand pages; Goldfish in the tools nav; a goldfish line on deck guides), every built page (tools nav), sitemap.xml, llms.txt, index.html (noscript link, About links, featureList, stamps), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js ("Goldfish guide"), deck-grader.html, opening-odds.html, prize-trainer.html, rotation.html, 404.html, .github/pages/about.html, .github/pages/faq.html.

- New page goldfish.html: what goldfishing is, how to goldfish with real cards (rulebook pp. 8, 12, 13), how to goldfish in RdyDeck (Hand tab, then Goldfish), what it does not cover, other practice tools, and 7 questions. FAQPage and HowTo structured data.
- The turn count on the Goldfish pages comes from GF_TURNS in js/core.js, so when Goldfish plays more turns, rebuilding the pages updates them.
- Prize trainer page: names the Prizes button and the Prize game on the Drills tab, as the app has them since 3.3.8, and says Progress shows the cards you miss most.
- Share image and app screenshots: the home page's og:image and twitter:image are now og-app.png, the RdyDeck logo next to the real Grade screen (from the Play feature graphic), with alt text. The WebApplication structured data names it as its image and lists two real screens (screens/grade.jpg, screens/odds.jpg, the Mega Rayquaza starter deck, no user data) as screenshots. og-image.png stays for the other pages.
- Copy matches Goldfish 3.4.0: 5 turns, attacks with their effects on your side, damage counters, Knock Outs and healing, solo with no Prizes taken.
- What's new: Added: goldfish guide (with es, pt, fr, de, it). js/core.js (version), sw.js (cache name prize-trainer-v130).

# RdyDeck 3.4.0 (build 129): Goldfish damage and attacks, tap a card to play it, 5 turns

Changed files: js/core.js (Goldfish damage, healing, attacks, damage moving Abilities, hand card sheets in Goldfish, the Turn 1 line and Puzzle, 5 turns, ENRICH_VER 22, version, What's new), puzzle/engine.js and puzzle/text.js (the shared step reader's new heal and self damage steps), index.html (styles, version), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, sw.js (cache name), tests/goldfish-check.cjs (new).

- Goldfish keeps damage counters on your Pokémon, shown on the board with HP left. A Pokémon is Knocked Out when its damage reaches its HP, and the log says how many Prize cards your opponent would take. Losing your last Pokémon notes that the game would be lost.
- Risky Ruins (and any Stadium with that text) puts its damage counters on a Basic you Bench during your turn.
- Attacks: your Active Pokémon can attack from turn 1 (not going first), when its Energy pays the cost. The attack's own effects on your side happen (Banette's Puppet Pull searches, Heat Dive hurts itself, discard Energy, the next turn lock), then your turn ends. Damage to the opponent is logged only: there is no opponent.
- Abilities that move or place damage counters work: Munkidori's Adrena-Brain moves counters off your Pokémon, and Abilities that place counters as a cost respect "can't be Knocked Out this way".
- Healing works from Pokémon, Items and Supporters (Pokémon Center Lady, Tasty Rice Ball with its discard pile bonus, Wally's Energy return). Heal text the app cannot read yet is left to the damage buttons.
- Add and remove damage counter buttons on any Pokémon in play, for cards the app cannot follow yet.
- Tap a card in your hand to open it with what it can do now, in Goldfish, the Turn 1 line and Puzzle.
- Goldfish runs 5 turns instead of 3. Still solo: no opponent and no Prizes taken.
- Card text comes from the card data only. Decks re-read once (ENRICH_VER 22) to store each attack's text and printed damage.
- Grade check: no grade moved. Goldfish check: Banette, Munkidori, Risky Ruins, healing, a Knock Out, the hand card sheet and 5 turns.

# RdyDeck 3.3.9 (build 128): puzzle deck search fixed, share your puzzle score (18 Nov 2026)

Changed files: js/puzzle-extras.js (new), puzzle/tools/fill-decks.mjs (new), puzzle/daily.json (each puzzle's deck now knows its face-down cards), puzzle/engine.js, puzzle/solver.js, puzzle/tools/make-daily.mjs, puzzle/test/screen.cjs, js/core.js (puzzle screen, version, What's new), index.html (pick list styles, script tag, version), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, sw.js (cache name).

- Puzzle deck search fixed. Puzzle decks kept most cards face down, so Cyrano, Ultra Ball, Hilda, Dawn and every other deck search saw only the few cards the board showed. Each puzzle now stores what its face-down cards really are (its real tournament list minus the cards in play, hand and Prizes), and searches find them. Cards still show face down until you search.
- A win that uses a searched card counts. The best line is still worked out from cards that are sure to be in the deck, so best scores did not change.
- Searches with many answers (Cyrano can have over 100) show a pick list: tap cards to add them, then take them.
- Crispin: you choose which Energy goes to your hand and which gets attached.
- Share your puzzle score: a picture of your line next to the best possible line, wide or square, with the text and a link to the same board. Saved results now keep the day's best line.
- Checks: all 245 puzzles still win through the screen, puzzle engine checks pass.


# RdyDeck 3.3.8 (build 127): Prize game moved to Drills, grade explainer moved to Questions, desktop layout, deck tabs reordered (18 Nov 2026)

Changed files: index.html (layout styles, Questions answer, version, file stamps), js/core.js (Drills, version, What's new), js/v29-rotation.js (Grade tab link and sheet, tab order), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, tests/extras-check.mjs, sw.js (cache name).

- Prize game moved to Drills: the bar fixed to the bottom of every deck tab is gone. The Prize game is the first section of Drills, with Game modes, Progress (once a game is played) and Play. Home's Prizes button still starts one. Saved games and history are unchanged.
- Grade explainer moved to Questions: the How the grade works fold on the Grade tab is now one link that opens the Questions answer in a sheet, with this deck's note when it has no results and the accuracy line. The grade scale and the card text sentence were added to the Questions answer first, so nothing was lost.
- Desktop layout improved: at 1100px and wider, About sits on the left, Questions on the right, and the links spread across the full width in three groups. Phones and tablets held upright are unchanged.
- Deck tabs reordered: Grade, Cards, Odds, Hand, Drills, Notes, so the list comes before the numbers. A deck still opens on Grade, and links and the last open tab go by name, so they still work.

Grade check: no grade moved.
# RdyDeck 3.3.7 (build 126): Rare Candy bug fixed (18 Nov 2026)

Changed files: js/core.js (Rare Candy line lookup, version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (version), sw.js (cache name), puzzle/tools/make-daily.mjs, tests/rare-candy-check.cjs (new).

- Goldfish and the Turn 1 line: Rare Candy now finds the Basic under a Stage 2 whose Stage 1 is not in the list (Blaziken ex onto Torchic with no Combusken). It uses the Basic read with the card, else the card data's Stage 1 (Combusken evolves from Torchic). Before, it only found it through a Stage 1 in the list or a shared start of the name.
- Every Stage 2 in the Standard card data (175) resolves to its Basic this way.
- Puzzle maker: a Stage 2 with no Stage 1 in its list takes its Basic from any printing of that Stage 1. No shipped puzzle changes.
- Grade check: no grade moved. Rare Candy check: Blaziken ex onto Torchic, Dragapult ex onto Dreepy and Alakazam onto Abra.

# RdyDeck 3.3.6 (build 125): De-bling button (18 Nov 2026)

Changed files: js/debling.js (new), prints.json (new), build-cards.mjs (writes prints.json), .github/workflows/refresh-data.yml (refreshes prints.json weekly), index.html (styles, script tag, version), js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, sw.js (cache name, prints.json), tests/debling-check.mjs (new).

- De-bling button on a deck's Cards tab, beside Mark cards you own, shown when prices are on. It swaps each card to its cheapest Standard legal printing that plays the same, then lists every swap with what it saves, the estimated total, and Undo.
- Same card means same name and same game text: for Pokemon the HP, type, Abilities, attacks, Weakness, Resistance, Retreat and evolution all match; Trainers and Energy match by name. Older printings that are still legal count. Built from the card data each week into prints.json.
- A card stays as it is when it has no other printing, when it or every cheaper printing has no US price, or when it is already the cheapest. The sheet says how many cards had no price to compare.
- Two lines that end up the same printing become one line with the counts added. A de-bling adds no grade history entry.
- Grade check: no grade moved. De-bling check: 132 top lists de-blinged, no grade moved, every swap to a legal printing of the same card at a lower price, card counts kept, Undo puts the list back exactly.

# RdyDeck 3.3.5 (build 124): large text and landscape layout fixed (18 Nov 2026)

Changed files: index.html (layout styles, version), js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, sw.js (cache name).

- Deck tiles at large phone text: Prizes and More move to a row under the deck name, and names wrap between words, not mid word.
- Deck screen title, tabs, Prize game button and grade number stop growing past a cap, so big text no longer crowds them out. At normal text size nothing changes.
- Page side margins stay near their usual size at large text, so the text keeps the width.
- Phone landscape deck screen: the header scrolls away, the tabs stay at the top, and the bottom bar is just the Prize game button, so the content gets the screen.
- Empty prize slots keep their label on one line.

Grade check: no grade moved (no grading code changed).

# RdyDeck 3.3.4 (build 123): 5 deck guides, creator kit guide, shorter titles (18 Nov 2026)

Changed files: deck-guides.json, 5 new deck-*.html, creator-kit.html (from .github/pages/creator-kit.html), build-pages.mjs (rules page title), prize-trainer.html, rulings.html, meta-decks.html and the deck and card pages that now link the new guides, sitemap.xml, llms.txt, js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (version), sw.js (cache name).

- Deck guides for the five most played decks since Delta Reign that had none: Talonflame Dusknoir, Lopunny Dudunsparce, Mega Lucario, Rocket's Honchkrow and Greninja. Each card claim is read from card text; lists, records and grades come from the tournament data and the grade baseline.
- creator-kit.html: how to put the live grade card in OBS (browser source, 560 by 190) and embed it on a site, with the link shapes.
- Titles under 60 characters for the Prize Trainer and Rules pages.
- The GitHub copy already serves noindex on every page (since 3.2); no change there.
- Grade check: no grade moved.

# RdyDeck 3.3.3 (build 122): fixes from Muse's 3.3.2 re-test, numbers, photo deck import and TCG Live copy (18 Nov 2026)

Changed files: js/core.js, js/upgrades.js, js/grade-history.js, js/v29-rotation.js, js/v31-tcgdex.js, js/v40-audit-fixes.js, js/v69-grade-blend.js, js/v71-audit-fixes.js, js/v80-extras.js, js/card-details.js, js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, tests/extras-check.mjs, tests/i18n-check.mjs, index.html (file stamps) and CHANGES.md.

Fixes from Muse's 3.3.2 re-test:
- A deck you practiced lost Upgrades, its grade history and its results blend (Toxtricity showed no Upgrades and no 8.4 to 9.0 entry; Dragapult showed 8.8 from its tile and 9.0 from its share link). The practice log is kept on the deck under the same field as the Daily challenge mark, so those parts took it for the Daily challenge. Only the Daily challenge deck counts as one now (isDailyChallenge), in Upgrades, grade history, the results blend, the legality cap, the rotation wait and the new set count.
- Card data read from another printing (Gastly and Haunter "?" on the saved s6b deck): the re-read is tried again, up to 3 times a visit, when pokemontcg.io did not answer. Not reproduced here; fixed by the likely cause.
- The grade waits while any card data read is running, so "Reading card data" and the grade no longer show together.
- The card popup price uses the player's number form (0,25 US$).
- Upgrades and the Top fix line read in every language: the intro, each swap's Synergy or Power move, "% of top lists run", "Right now", "Best 3 swaps together" and the swap list.
- Gengar comes back: the finding says how often its second life comes together (it has to reach play or the discard pile first, and is prized about 1 game in 10), and Power counts that share of a second copy. Why Power is has a line for it under Damage. Mason's Nov 17 call: revival credit follows the odds.
- tests/extras-check.mjs checks a practiced deck against the Daily challenge, a thin Kingdra ex left out of the damage counted, Kingdra ex as the main attacker still counting Hydro Pump, and the Gengar credit. tests/i18n-check.mjs checks the Upgrades, Top fix and Gengar lines in all five languages.
- Grade check: no grade moved on the 132 real lists.

Numbers:

- Numbers: a count the English writes with no comma (3023 wins, 2045 games, 1022 players) is grouped in the player's language too: 3 023 in French, 3.023 in German and Portuguese. Spanish and Italian group from five digits, as their own rule (Intl) does, so 2045 stays and 12.045 is grouped; 5,885 in English now reads 5885 there too.
- What a number is decides, not its size: a year (after a month or a date, a regulation mark like E 2024, or "in 2026" with nothing counted after it), a date like 11/12/2026, a build or a puzzle number stays as it is.
- tests/i18n-check.mjs fails on a count of 1000 or more left without grouping in a language that groups it, and checks that 2045 games is grouped while April 2027, Nov 16, 2026, 11/12/2026 and E 2024 stay.

# 3.3.3, also: photo deck import (merged from branch photo-import)

Changed files: js/photo-scan.js (new: finds the cards in a picture, names each from its art and reads its count), js/photo-import.js (new: the "From a photo" button and the review sheet), art-index.json and art-index.bin (new: a 120 byte fingerprint of the art of every print of every card name that is Standard legal now, older art included, 4,282 prints, about 610 KB, built by build-art-index.mjs), index.html (button, review sheet, styles, file stamps), sw.js (the index is fetched newest first and kept for offline use), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, .github/workflows/art-index.yml, tests/photo-import-check.mjs, tests/photo-import-ui.mjs, tests/photo-import/make-shots.mjs and CHANGES.md.

- Import a deck has a "From a photo" button. Pick a screenshot or photo of a deck screen (a Pokemon TCG Live deck shared as a picture, for example) and RdyDeck reads each card and its count.
- Everything happens on the device. The picture is read in the page and never uploaded or saved; no new data is collected, so the privacy policy and the Play Data safety form do not change. The reader and the card index download only the first time someone picks a picture.
- A review sheet shows every card with a crop from the player's own picture, its count, and a "Check the card" or "Check the count" flag where the read is unsure. A card can be changed to a close match or any Standard card by search, or removed; counts have plus and minus buttons; the total shows out of 60. A deck that needs two screenshots can add a second picture, and a card in both counts once.
- "Use this list" fills the import box with the list and section headers, so nothing is graded until the player taps Import and save.
- Not shown in the downloaded one-file copy of the app (it cannot read the card index there).
- Tested on six real Pokemon TCG Live screenshots (phone and PC layouts, one with a Reddit caption bar, one cropped to the cards): every card was found, every count read right, and no wrong read was shown as sure. The grid is now found from cards that stand alone, so a header, tab bar or caption bar is not read as cards; the small count badge digits are read; older and gold prints match; and a print read twice in one picture is flagged instead of merged.

# RdyDeck 3.3.2 (build 121): fixes from Muse's 3.3.1 re-test, plus the Kingdra ex setup fix (branch fix-3.3.2, not live)

Changed files: js/core.js (Gengar recovery, reading note, setup attacks, version, What's new), js/upgrades.js, js/grade-history.js, js/v29-rotation.js (label scale, Synergy or Power sentence), js/v69-grade-blend.js, js/v31-tcgdex.js, js/i18n.js (number form), js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, js/creator-kit.js, tests/i18n-check.mjs, index.html (Back button on the deck screen, file stamps, softwareVersion), sw.js (cache prize-trainer-v121) and CHANGES.md.

- Gengar: a main attacker that an Ability puts back from the discard pile (Gengar's own Netherworld Gate, or another Pokemon's) is credited: "Gengar comes back" replaces "Only 1 Gengar", and that Ability counts toward the Trainer check's recovery.
- Kingdra ex (merged from kingdra-setup): a Pokemon played to set up with a cheap attack (King's Order) no longer sets the damage ceiling, and How it plays gets a Setup line.
- Upgrades: a results or rotation read that started while the grade drew no longer leaves the section out. A swap result that lands after the Trainer data loads is kept.
- Grade history: a final grade on screen that the log missed is kept, so How did it do? shows the grade on screen.
- Home: the deck screen's Back button redraws home, so a tile shows the same grade as the Grade tab.
- Grade vs win rate: "Results beat its cards" and "Cards beat its results" compare the two grades as shown, so equal grades read "Cards and results agree".
- Label scale: with no tournament results, the scale says Strong is 7 and up, and why.
- The "Reading card data" note ends with the read, whatever screen is open.
- Card data: a card TCGdex read only from another printing is asked of pokemontcg.io too, and its own printing replaces it (saved Gastly and Haunter showed "?" marks).
- Translations: "Right now Synergy is what holds it back" is one sentence in every language (es and pt articles, German word order); fr "a remporté ... des 515 matchs"; it "Energia ... di base".
- Numbers: every language shows numbers in its own form, from Intl (51,8 % and 5 885 in French, 5.885 in German, $78.46 as 78,46 $US). Versions (v3.3.2, License 1.1), dates and card numbers stay as they are. The Creator kit card and its description line use the same form. tests/i18n-check.mjs fails on an English-form number left on any screen.
- Water Blender (Mason's Nov 17 list): 7.8 to 6.8 from its cards (Power 8.1 to 7.1, Synergy 6.8 the same).
- Grade check: no grade moved on the 132 real lists.

# RdyDeck 3.3.1 (build 120): fixes from Muse's 3.3 re-test (branch fix-3.3.1, not live)

Changed files: js/core.js (damage ceiling, Hand tab, version, What's new), js/card-details.js, js/v29-rotation.js, js/v31-tcgdex.js, js/grade-history.js, js/upgrades.js, js/easier-first-visit.js, js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (light theme colors, file stamps, softwareVersion), sw.js (cache prize-trainer-v120), tests/grade-baseline.json and CHANGES.md.

- H2: a Pokemon in the list for its Ability (Mega Kangaskhan ex in Crustle, for example) no longer adds its damage to Power, even at half weight. The damage finding says it can also hit, but the grade leaves that hit out.
- Gengar LOR: the card viewer and mark read the Lost Origin card, with Netherworld Gate, and a saved text from another printing is read again.
- Light theme: the old early color block (#f4f2ec background) is gone, and every type and status color reaches at least 4.6:1 on every light surface.
- Upgrades: every empty state (checking, offline, rules, no swaps, error) is a plain line that cannot be folded away, translated in all six languages.
- Grade history: a reprint check that never finished held the log, so a grade move with no other change was not saved. The log now waits only as long as the grade does, and the reprint check gives up after 30 seconds.
- Hand tab: a hand with no Energy card says so once, and names the cards that can find one.
- Top fixes waits for Upgrades and shows once, instead of reordering as swaps arrive. An Upgrades error no longer leaves it checking.
- Translations: the Main attacker paragraph in es, pt, de, fr and it; fr "a gagné" and it "ha vinto"; the article in "En ce moment, la Synergie" and "Adesso la Sinergia".
- What's new: dates are the release day in US Eastern time, so 3.3 shows Nov 17.
- Home PLAY button: already 48px on touch screens (the 3.3 touch rule covers .btn-sm and nothing caps its height). No change.
- Grade check: 6 of 132 lists moved, 2 by more than 0.1: Crustle 078 8.5 to 8.1 and Crustle 100 8.4 to 8.1 (Mega Kangaskhan ex's hit left out). Dhelmise 091 8.1 to 8.0; Talonflame Dusknoir 062, 102 and 125 change Power only. Baseline updated on this branch.

# RdyDeck 3.2.8 (build 118): deck checker wording, 6 new deck guides, first deck guide, FAQ and llms.txt for 3.2.7 (17 Nov 2026)

Changed files: deck-guides.json (6 new guides, stale claims fixed), build-pages.mjs (first-deck.html, Deck checker wording, Your first deck in the tools links), rulings.json (deck-size, rulebook p. 22), .github/pages/faq.html, about.html and how-grading-works.html, deck-grader.html, index.html (title, description, JSON-LD and sameAs, noscript, heading, about text, softwareVersion, file stamps), prize-trainer.html, rotation.html, opening-odds.html, 404.html, terms.html and delete-data.html (Instagram link), privacy.html (Instagram link, age question in the Play app), llms.txt, js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, sw.js (cache prize-trainer-v118), sitemap.xml, every built page (rebuilt) and CHANGES.md.

- Search wording: searches for "Pokemon TCG deck grader" mostly show card condition grading. Titles, descriptions and headings outside the app now say deck checker, rate my deck and deck rating, and the FAQ says RdyDeck does not grade card condition. URLs are unchanged, and the app keeps the grade.
- Six new deck guides: Crustle, Festival Lead, Mega Excadrill, Dragapult Dusknoir, Dragapult Blaziken and Sharpedo Toxtricity, each written from the cards' own text. Stale claims fixed: Mega Rayquaza is one of the most played decks (no longer the most), and Dragapult and Dragapult Dudunsparce have one of the best records, not the best.
- New page: How to build your first Pokemon TCG deck (first-deck.html), with the deck rules cited from the rulebook (pp. 22 and 23), the rulebook's starting counts next to what top 16 lists run, and the Trainers most top lists play. The rules page gains the deck size rule.
- FAQ: card condition, languages, moving decks to another device with a share link, and the highest test grade (9.0, was 9.1). llms.txt describes 3.2.7 (six languages, offline starter decks) and lists every deck guide and the first deck guide.
- Social links: RdyDeck's Instagram, @rdydeck, is in every page footer, on the About page and in the site's structured data (sameAs). The About page credits Mason, M3ttle on YouTube (@m3ttle_yt), as the maker; the LLC stays the owner. Instagram and YouTube are 13 and up, so both links stay hidden for anyone who answered the age question under 13. In the Google Play app, someone with no age answer who taps either link first gets a neutral age question (birth month and year, no default, no mention of an age limit, in all six languages). 13 or older opens the link; under 13 does not, and the links stay hidden from then on. Only the age group is kept, on the device. The privacy policy says so.
- No grade moves: grade check passed (132 of 132 lists).

# Muse section 1 grade fixes (branch muse-s1-fixes, not numbered yet: give it the next number at release, after 3.2.8 if that goes first)

Changed files: js/core.js, js/tcg-enrich.js, js/v69-grade-blend.js, js/v45-sample-share-daily.js, js/v29-rotation.js, js/creator-kit.js, js/upgrades.js, js/grade-flag.js, js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, js/matchups.js, js/report-errors.js, js/v28-ask-odds.js, tests/i18n-check.mjs, tests/grade-builds.json, index.html (file stamps), tests/grade-baseline.json and CHANGES.md. Version, sw.js cache and What's new are left for the release.

- Cinderace and other Pokemon with a setup Ability (put it face down in the Active Spot when setting up) count as reachable without their Basic. Credit scales with the odds it is in the opening hand (G_SETUP_FULL in core.js gives full credit instead). A thin line gets a "rarely reaches the board" warning with the odds.
- Support Pokemon (Basic Pokemon with a draw, search or switch Ability, and others kept for an Ability) are not picked as the main attacker and no longer set the damage ceiling or the one-prize note. Their damage is mentioned at half weight (G_SUP_SHARE), and the 3-prize finding says to use them and move them out.
- The main card is read from the list's plan (the thickest attacking line), so Latias ex, Kangaskhan and the like are never main in control or toolbox lists.
- When a list is built around a Pokemon with no tournament results of its own, the results come from the closest archetype that has them and the grade sentence says they are borrowed. A list that matches no archetype says the grade reads the cards alone and is never called Tournament-ready (grade screen, home card, share text and creator kit).
- The one-prize sentence names the main attacker first.
- Grade check: 7 of 132 lists moved: Crustle 078 8.6 to 8.3 and 100 8.5 to 8.2 (Kangaskhan no longer sets the ceiling), Starmie Dusknoir 120 8.1 to 7.9, Talonflame Dusknoir 062 8.2 to 8.1; Talonflame Dusknoir 102 and 125 and Dhelmise 091 change Power only, grade the same. Baseline updated on this branch.
- Muse section 2 M2, control path: mill, wall and lock pieces are read from attacks, Abilities and Trainers (Item lock, Abilities off, can't attack or retreat, mill, Energy and hand disruption, damage walls, heals that back a wall). A deck whose control closes games better than its damage is graded on that: the damage finding becomes "Low damage, by design" and "Wins by ..." names the biggest piece. A deck that attacks and also locks, mills or walls gets part of that credit (G_CTL_MIX 0.5) and an "Also ..." finding. How it plays gets a "Game plan" or "Also" section listing the pieces. Hand Trimmer reads as hand disruption. All of it is translated in every language.
- Control path grade moves: Crustle 078 8.3 to 8.5 and 100 8.2 to 8.4; Froslass Munkidori 011 8.5 to 8.6, Dragapult 094 8.8 to 8.9, Dragapult Dudunsparce 115 9.0 to 9.1, Mega Rayquaza 025, 051 and 126 up 0.1 (Budew, Iron Thorns ex or Legendary Pyroduct); Mega Rayquaza 001, 070, 076, 093, 129, 130 and Alakazam Dusknoir 072 change Power only. Baseline updated on this branch. Test control decks: Hammer Control 6.5 to 7.2, Crustle Control 6.7 to 7.1, Snorlax Control 5.0 to 5.3, Muse's Hydreigon mill 7.5 to 7.8, Ogerpon and Shuckle stall 7.8 to 8.1, Budew lock 7.1 to 7.4.
- Muse section 4 M1: the "Two hits" sentence counts the hit the grade counts (with the cards the list can attach), not the best case, on 9 of Muse's decks. A Pokemon that attacks twice a turn (Festival Lead) keeps its count.
- Muse section 4 L1: the closing sentence of the damage finding names only the Pokemon the finding is about, or none, so a Greninja list is never summed up by its Frogadier (20 of 132 lists change wording, no grade moves).
- Muse section 4 S2: a card read from another printing no longer counts as playable by itself, so a Stage 2 with no way onto the board stops adding to Power. A test list with a dead Stage 2 went from Power 8.58 and grade 5.6 to 6.61 and 3.8. None of the 132 lists moved.
- Muse section 4 M10: when the grade borrows results from a different archetype than the one built around the main attacker, the grade sentence says so, and Against the meta opens on the archetype the grade uses.
- Muse section 4 L3: the main attacker note says why it is main (the list plays the most of its line, or the deck is named for it).
- The damage finding's detail text (hits for, HP threats take N hits, prize race lines, toolbox, spread and blend lines) is now translated in every language. It was English in every language before.
- Muse section 6 M1: the Grade tab sentences are translated by pattern (finds, Gets back, setup, role and Trainer job lines, thin lines, readiness), and i18n-check imports a second, messier list (Mega Excadrill at one copy) and checks its Grade and Cards tabs. 0 English strings left over 69 screens in es, pt, de, fr and it.
- Muse section 6 M2: Abilities that were left in English (Flip the Script and the others the check found) are read and translated.
- Muse section 6 M9: aria-labels and the "or" joiner in the Odds rows are translated; the Rotation line reads "N mark cards leave Standard".
- Muse section 6 clear items (M3 to M8, M10, L1 to L11): the remaining English bits it named are translated or reworded.
- Puzzle buttons (Bench, Evolve, Rare Candy, Attach, Energy to a Pokemon, Retreat, Switch in, Bring up, Take nothing, the Active and Bench labels) and the deck builder's card facts line (stage, HP, Trainer kind, ACE SPEC) are translated in every language. Card, attack and Ability names stay English.
- The starter deck lines and the data date line are translated when the app uses the copy built into this version (offline), not only the weekly copy.
- Muse section 5 M3: "Most lists run 2 to 4" style claims come from the archetype's own top lists ("Most top Toxtricity lists run 1"), and say nothing when that archetype runs as many copies as the list or does not run the card. Toxtricity's "Only 1 Mega Absol ex" warning is gone because its top lists run 1. tests/grade-builds.json carries the per-archetype copy counts.
- Muse section 5 M1: Upgrades never disappears without a word. It says why when it can't suggest swaps (deck rules, legality, card data not loaded) and shows a retry line if working them out fails; the failure goes to the error report (rdReportError). Toxtricity shows one swap (Night Stretcher to Buddy-Buddy Poffin) in tests; the live 9.0 vs test 8.4 gap points at live data, so the fix is the safe line plus the report.
- Muse section 5 M4: the Hand tab's readiness line counts Energy. A hand with every Pokemon but no Energy for the attack says so instead of "Every piece is in your hand."
- No grade moves from sections 5 and 6: grade check passed (132 of 132 lists).

# RdyDeck 3.2.7 (build 117): dollar prices, offline starter decks, swipe, folds, phone text size, landscape, in-app dialogs, Muse audit of 3.2.6, grades wait for card data, Expanded revivers (17 Nov 2026)

Changed files: js/owned-prices.js (dollars only), js/offline-starters.js (new), js/card-swipe.js (new), js/app-dialog.js (new), js/fold-sections.js (new), js/easier-first-visit.js (time to name a pasted deck), js/core.js, js/tcg-enrich.js, js/v40-audit-fixes.js, js/v71-audit-fixes.js, js/v29-rotation.js, js/v35-rotation-marks.js, js/grade-history.js, js/keyboard.js, js/v26-practice.js and js/v47-prerelease.js (in-app dialogs, version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (text-scale meta tag, no fixed root size, landscape, large text, dialog and fold styles, softwareVersion, file stamps), sw.js (cache prize-trainer-v117), tests/owned-check.mjs, tests/i18n-check.mjs and CHANGES.md.

- Prices are in US dollars only (TCGplayer market price). The Cardmarket euro fallback is gone, so a card with no dollar price shows "no price" and is left out of the list total. A card whose price was not read yet (for example a deck opened offline) is no longer counted as having no price; its price is read once the device is back online.
- Starter decks work offline: the card data each one needs is saved on the device (IndexedDB rd_starter_data) when it is read online, and the app reads the rest in the background while online. Offline, a starter deck loads from that copy with the same grade, and one with no copy yet says it loads once back online instead of coming in half read. A list pasted offline stays in the box with a message, instead of importing with no card data.
- Swipe left or right on an open card from the Cards tab for the next or previous card, with Previous and Next buttons and the arrow keys. Vertical scrolling still scrolls.
- Sections on the Odds, Drills and Notes tabs and in the deck builder fold by tapping the heading, and stay the way they were left on that device. The Grade tab's folds (Upgrades, Grade history and the rest) now stay the way they were left too. Folded by default: Opening Basics, Prize risk, Opponent prize read, Edit log, Compare lists, Suggestions, and Start from once the builder list has cards.
- Text follows the phone's text size (text-scale meta tag, no fixed 16px root). At large sizes the deck tabs scroll sideways, the grade header, Odds tiles, deck titles, toasts, prize slots and the language list wrap instead of overlapping. Checked at 100, 130 and 200 percent on a 390px phone.
- Landscape on phones: the prize game fits the screen with Prize 1 to 3 always visible and no page scroll. Orientation is not locked.
- Questions such as Quit this game?, Delete all decks and history? and Reveal the prizes? use the app's own dialog, in the player's language, instead of the browser's confirm box. Escape, Back and a tap outside answer no, and a delete starts on Cancel.
- A pasted list waits 2.5 seconds (was 0.7) before it grades itself, and tapping the name box holds it so the deck can be named first. The import lines and the "Added" toast are now translated in every language.
- How it plays explains always-on Abilities that add HP or cut damage taken (Ludicolo, Aurorus), and the Abilities part of How it plays is now translated in every language.
- Muse audit of 3.2.6, discard pile revival: credit for reviving Pokemon from the discard pile now scales with how often the line comes together, counts only a reviver the deck can play, and counts Pokemon that revive themselves. More ways to discard (more card wordings and attacks that discard) are read as outlets. The setup speed finding skips Stage 2 Pokemon that are revived rather than evolved. Unread card data no longer says "Only 0 Supporters", and the cap on lists with cards not Standard legal now reads "can go no higher than 4.9". ENRICH_VER 20 to 21, so saved card data is read again once.
- The grade waits until every card's data has loaded (up to 60 seconds). If some cards can't be read, the grade shows "Not final" with a "Read the cards again" button; a Not final grade can't be shared, shows Not final on the home card and is left out of grade history.
- Expanded: older reviver and discard wordings are read (Lugia VSTAR, Ho-Oh-GX, Rapid Strike Style Mustard, Max Revive, Carracosta-GX, search then Bench, single-card mill, discarding the whole hand). A Standard deck's card grid marks cards not legal in Standard now, with a key line (the 4.9 cap is unchanged). An Expanded deck's Grade tab says it is graded as Expanded, with Standard rotation, results and matchups left out.
- No grade moves: grade check passed (132 of 132 lists).

# RdyDeck 3.2.6 (build 116): grades for decks that bench Pokemon from the discard pile (17 Nov 2026)

Changed files: js/tcg-enrich.js (reads attacks, Abilities and Trainers that put Pokemon from your discard pile onto your Bench), js/core.js (ENRICH_VER 20, grader, version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (softwareVersion, file stamps), sw.js (cache prize-trainer-v116) and CHANGES.md. Numbered 3.2.6 because the dollar prices and offline starters update is 3.2.5; if this goes live first, renumber.

- The grader now reads card text that puts Pokemon from your discard pile onto your Bench, like Kingdra ex's King's Order (up to 3 Water Pokemon). It notes how many, which type, Stage, HP limit, name and exceptions, and skips "each player" effects. Card data is read again once (ENRICH_VER 20) to store this for decks already saved.
- A Stage 1 or Stage 2 with no Pokemon to evolve from, Rare Candy or other way in no longer counts as unplayable when a card in the list can put it onto the Bench from the discard pile, the attack's Energy fits the list, and something in the list fills the discard pile (Ultra Ball, Brilliant Blender, a discard your hand Supporter and the like). The plan shows one line for each such card, naming what it brings back and what fills the discard pile. With nothing to fill the discard pile it is one warning, not a critical flaw. Without the reviver, or for a Pokemon of the wrong type, the old critical flaw stays.
- Mason's Kingdra ex and Mega Greninja ex list: 3.3 to 7.4 (Synergy 2.8 to 6.8, Power 8.1 unchanged).
- No other grade moves: grade check passed (132 of 132 lists), and every starter deck grades the same.

# RdyDeck 3.2.4 (build 114): page to delete your data (17 Nov 2026)

Changed files: delete-data.html (new), privacy.html (link), every page's footer (link), build-pages.mjs (footer link for built pages), sitemap.xml, sw.js (cache prize-trainer-v114, saves the new page for offline), js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (softwareVersion, file stamps) and CHANGES.md.

- New page rdydeck.com/delete-data.html, for Google Play's Data safety "Delete data URL". It names RdyDeck and Optume Ventures LLC and says how to delete each kind of data: decks and settings on the device (Settings, Clear all data, or clear rdydeck.com's site data, in Chrome for the Play app), feedback emails (email support@rdydeck.com with the subject Delete my data; deleted within 30 days, otherwise kept up to 12 months), error reports and grade flags (anonymous, deleted after 90 days, off switch in Settings) and visit counts (totals only). Nothing tied to a person is kept. The page is in all six app languages and opens in the language picked in the app.
- The Privacy Policy and every page's footer link to it.
- No grade moves.

# RdyDeck 3.2.3 (build 113): rules page in the Play app (17 Nov 2026)

Changed files: js/card-details.js (All rules link), ads.js (Play app check), js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (softwareVersion, file stamps), sw.js (cache prize-trainer-v113), tests/ads-where-check.mjs and CHANGES.md.

- All rules on a card opens the rules page in a new tab, which starts without the Play app mark (kept for one tab only). Inside the Play app the link now carries ?src=play, and the guide pages' ad file also counts a link from a Play app page on rdydeck.com, so the rules page knows it is the Play app and will never load ad code there once ads are turned on. Nothing changes today: no ad code loads anywhere yet.
- No grade moves.

# RdyDeck 3.2.2 (build 112): security headers (17 Nov 2026)

Changed files: worker/rdydeck-worker.js (security headers), sw.js (cache prize-trainer-v112, framed pages from the network), js/report-errors.js (report-only policy reports), js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (softwareVersion, file stamps), privacy.html (one sentence, effective date), tests/headers-check.mjs (new) and CHANGES.md.

- Every answer from rdydeck.com now carries X-Frame-Options SAMEORIGIN and an enforced Content-Security-Policy with frame-ancestors 'self', object-src 'none', base-uri 'self' and form-action 'self'. No other site can show RdyDeck in a frame, except the Creator kit stream card (/?overlay=1, also with &embed=1), which any site may frame so the embed code keeps working.
- A fuller Content-Security-Policy-Report-Only lists every place the site loads from: its own files, card data and art (TCGdex, Pokemon TCG API, Limitless), Cloudflare Web Analytics and Google AdSense. It blocks nothing yet. When a browser says something would have been blocked, the app sends one error report naming only the rule and the site (at most two a visit, within the five, none for browser extensions, none with error reports off). Once the reports show nothing missing, including with ads on, it can be enforced.
- Also: Cross-Origin-Opener-Policy same-origin-allow-popups (ad clicks can still open tabs), Cross-Origin-Resource-Policy (pictures and the stream card cross-origin, everything else same-site), Permissions-Policy (no camera, microphone, location, payment or USB), and GitHub Pages' Access-Control-Allow-Origin: * is taken off, since nothing reads rdydeck.com from another site. nosniff and the referrer policy stay. Cross-Origin-Embedder-Policy is left off: it would block ads and card art.
- The service worker no longer answers for a page inside a frame, so a saved copy can never carry the wrong frame rule onto a creator's site.
- Privacy Policy: one sentence on the new error report.
- No grade moves.

# RdyDeck 3.2.1 (build 111): deck links fixed (17 Nov 2026)

Changed files: js/core.js (deck links, version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (softwareVersion, file stamps), sw.js (cache prize-trainer-v111) and CHANGES.md.

- A deck link (#deck=) now stays in the address bar until the Import sheet is closed or the list is imported. Before, the app took it out the moment the page opened, so a reload, or Open in Safari from a chat app's own browser, landed on the plain home page with no deck.
- Every deck link now opens the grade once the list is imported, as Share grade links already did. Before, a Share deck link only added the deck and went back to home. A list the person already has opens straight to its grade.
- The Import sheet note for a shared deck says to tap Import and save to see the grade, in all five languages (it was English only before).
- Links stay in the same form, so every link already sent still works. The list still never reaches a server.
- No grade moves. Grade check: 132 of 132 lists unchanged.

# RdyDeck 3.2 (build 110): card guides and search fixes (16 Nov 2026)

Changed files: cards/ (new: 178 card pages and cards/index.html), card-pages-data.mjs and .github/card-pages.json (new), build-pages.mjs, deck-guides.json (a description per deck), rulings.json (setup and mulligan), worker/rdydeck-worker.js, every .html page (github.io-only noindex line), index.html (h1, main, noscript, softwareVersion, file stamps), privacy.html and terms.html (share tags), deck-grader.html, opening-odds.html, prize-trainer.html, rotation.html (titles), .github/pages/faq.html, about.html, how-grading-works.html, app-file.mjs (keeps softwareVersion equal to the app version), js/v38-settings-home.js (title lockup reads only the drawn name), js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, sw.js (cache prize-trainer-v110), sitemap.xml, llms.txt, README.md, tests/seo-check.mjs (new) and CHANGES.md.

- Card guides: one page per card that top decks play (in at least half the top lists of a guided deck or one of the 20 most played decks), 178 in all. Each has the card's own text, the decks that run it and how often, what it does in those decks (from the deck guides), and the official rules that apply, picked the same way the app picks them. Deck guides and Improve your deck link their cards to these pages. Card text is English, from pokemon-tcg-data. Mew ex (30th Celebration) has no page yet: its text is not in that data.
- github.io copy: every page carries a noindex line that the Worker takes out on rdydeck.com, so search engines drop optumesto.github.io/PrizeTrainer and keep rdydeck.com. The github.io copy itself was checked: it serves the same build as rdydeck.com.
- Guide pages: a visible breadcrumb that matches their structured data, a footer row linking the free tools and card guides, Article dates, distinct deck descriptions from each deck's game plan, shorter titles and descriptions, Pokémon written as itself (no &eacute;) in titles.
- Home page: a descriptive heading for search and screen readers (the logo looks the same; the extra words are translated), a main landmark, and a no JavaScript message with links. softwareVersion now follows the app version.
- Worker: browser cache times by file (a year for stamped scripts, 5 minutes for pages and data, a week for fonts and icons) and http to https in one step once Cloudflare's own redirect is off.
- Rules: setup and mulligans, from the rulebook (pp. 8 and 18). FAQ and About now say ads are planned, since none show yet.
- No grade moves.

# RdyDeck 3.1.1 (build 109): ads for US visitors only (16 Nov 2026)

Changed files: js/v32-ads.js, ads.js, worker/rdydeck-worker.js (/api/where), sw.js (cache prize-trainer-v109, /api/ never saved), js/core.js (version, What's new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, index.html (file stamps), privacy.html, terms.html, README.md, tests/ads-where-check.mjs (new) and CHANGES.md.

- Ads, once switched on, show only to visitors in the United States. The Worker answers /api/where with yes only when Cloudflare places the visitor in the US. The app and the guide pages ask once a visit, and only when a real publisher id and a spot are set, never in the Play app or offline. Any other answer (another country, unknown, an error, no answer in 5 seconds, the github.io copy) means no ad script, no ad spot or label and no age question. The rest of the app is the same everywhere, in all five languages.
- Privacy Policy: ads are for US visitors only, how the country check works (a yes or no, nothing stored), and a short section for users in Brazil (LGPD: what is processed, why, where, rights, email contact). Terms: ads, if added, show only in the US.
- No grade moves. Grade check: 132 of 132 lists unchanged.

# RdyDeck 3.1 (build 108): card details, official rules and a Creator kit (16 Nov 2026)

Changed files: js/card-details.js and js/creator-kit.js (new), js/i18n.js, js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js, js/core.js (version, What's new), index.html (styles, scripts, Rules link, overlay mode, file stamps), rulings.json, rulings.html and rulings-sources.md (new), build-pages.mjs (Rules page), sw.js (cache prize-trainer-v108, rulings files), sitemap.xml, llms.txt, README.md, tests/card-details-check.mjs and tests/creator-kit-check.mjs (new) and CHANGES.md.

- Card details: tap a card on a deck's Cards tab to open it. Pokémon show HP, type, what they evolve from, each Ability and attack with its cost, damage and full text, Weakness, Resistance and Retreat. Trainers and Special Energy show their text and How it fits this deck, in the same words as the Grade tab. Every card shows its Rule Box lines, regulation mark and printing. The full text is read from TCGdex once and saved on the device; offline, the sheet shows what the deck already stores and says so. Mark cards you own still marks instead of opening. Labels are in all five languages; card text stays English.
- Official rules: rulings.json holds 22 rules, each written in our own words with its document, page or section, and the day it was checked. Sources: the Pokémon TCG Rulebook (Twilight Masquerade edition, 2024, the newest English edition that could be read), the Play! Pokémon Tournament Handbook (revised 21 May 2026), and two TPCi posts on the Pokémon Professor Community: the February 2026 Rule Book Updates ("up to" can be 0 on attacks, tiebreaker games instead of Sudden Death, who orders effects) and the ME: Perfect Order FAQ (Mega Zygarde ex's Nullifying Zero and Benched Tera, the first card ruling). A card shows up to 4 that apply to it, card rulings that name it first. Other card rulings wait for a public TPCi original. rulings-sources.md (not served) records each citation, how it was read and which rulings had no public original. The rules text is English in every language for now.
- Rules page (rulings.html): every rule with its source, linked from About and listed in the sitemap and llms.txt, with FAQ structured data.
- Creator kit, from Share grade: an OBS browser source link (?overlay=1) that shows only a grade card on a see-through background, grades the list each time it loads and again every hour, never loads an ad and saves nothing; an iframe embed whose card opens the full grade; and a line for video descriptions. The OBS and embed links carry the app's language (&lang=), so the card shows in it; the video line and embed title are translated too.
- Translations of the new text reviewed against official card terms in each language (for example Regelfeld, Encadré Règle, Regola speciale, Pokémon del pasado, Pokémon de Megaevolução). The card details Retreat label is the noun in Spanish and Portuguese.
- Fixed: the starter decks hint showed in English in Spanish, Portuguese, French and Italian once its date changed; it now translates sentence by sentence.
- No grade moves. Grade check: 132 of 132 lists unchanged.

# RdyDeck 3.0.2 (build 107): French, German and Italian (16 Nov 2026)

Changed files: js/i18n-fr.js, js/i18n-de.js, js/i18n-it.js (all new), js/i18n.js, js/v29-rotation.js, js/core.js (version, What's new, prize read stages), index.html (language files, language row style, file stamps), sw.js (cache prize-trainer-v107), tests/i18n-check.mjs, i18n-notes-fr.md, i18n-notes-de.md, i18n-notes-it.md (new) and CHANGES.md.

- French, German and Italian in the Language row in Settings (now two rows of three). App text is translated; card, attack and Ability names stay English, as in Spanish and Portuguese. French uses vous, German du, Italian tu.
- Each new language is its own file and downloads only when a player picks it (or when the phone is set to that language), so the app is no heavier for anyone else. The service worker saves them for offline use.
- Fixed in every language: a pattern could swallow the sentence after it, so the new set week line showed half in English in Spanish and Portuguese.
- Time per guess on the prize results screen is translated.
- French, German and Italian were each reviewed screen by screen after the first draft: official card game terms (French HIGH-TECH and Pokémon de base, German ASS-KLASSE and Regelzeichen, Italian Esteso and posizione attiva), one word per idea, plurals, dates and numbers in the language, and shorter labels where the 360 px check showed them running long. Logging a match shows the result letters in each language (French V, D, N; German S, N, U; Italian V, S, P).
- Rotation counts agree with the number in every language: 1 card gets the singular label, more get the plural (Spanish "1 podría rotar", "11 podrían rotar").
- German: the matchup line reads "gewann 48.2% aller 1,597 Matches", the prize read stage buttons put the card count on a second line when the label is long, and a long word in a puzzle card's HP line breaks with a hyphen instead of running past the card.
- The i18n check now runs all five languages on 60 screens. Wording for a native speaker to check is in i18n-notes-fr.md, i18n-notes-de.md and i18n-notes-it.md.
- No grade moves. Grade check: 132 of 132 lists unchanged.

# RdyDeck 3.0.1 (build 106): fixes from the 3.0 audit (16 Nov 2026)

Changed files: i18n-notes.md, js/owned-prices.js, js/grade-flag.js, js/v80-extras.js, js/v38-settings-home.js, js/v301-fixes.js (new), js/i18n.js, js/core.js (version, What's new), index.html (Prizes button, styles, scripts, file stamps), sw.js (cache prize-trainer-v106), build-pages.mjs, how-grading-works.html, privacy.html, tests (owned, reports, extras and i18n checks) and CHANGES.md.

- Prices: an On/Off row in Settings, saved on the device. Off hides every price and reads none. On by default.
- Upgrades: the owned first and cheapest first toggles show only when there is more than one suggestion. Owned first is still off by default.
- How did it do?: an optional event name, and a Delete button on the record row that asks once first. The grade history entry stays.
- This grade looks off?: a tap made offline waits on the device (at most 10) and is sent when back online. Turning reports off drops it unsent. Still one flag per deck and grade.
- Spanish and Portuguese: the English left in grade history, the Home puzzle line, Ask the odds, the drills, Notes compare lists, two Progress tiles and the Hand tab turn 1 line is translated, and dates read the local way. The i18n check now covers 60 screens and fails on any app text left in English. Card, attack and ability names stay English.
- Ask the odds: Open in the By selector (the opening hand) reads Mano / Mão, not Abrir.
- Spanish and Portuguese, reviewed screen by screen: official card game terms (Spanish baraja, Puesto Activo, cartas de Premio; Portuguese Campo Ativo, cartas de Prêmio, marca de regulamentação), one word per idea, real singular and plural forms, shorter tab and button labels for phones, and dates in the language. The app title no longer translates (it read RdyMazo in Spanish). Open questions for a native speaker are in i18n-notes.md.
- Logging a match: the W, L and T buttons show V, D and E in Spanish and Portuguese. Discard reads as the verb on the button and as the pile under the play mat.
- Buttons in a row (the play screen, the deck builder footer) wrap a long translated label inside the button instead of running off the screen.
- The Prizes button fits PREMIOS and PRÊMIOS.
- A Home row no longer stays on Grading... after going back from a deck.
- The Settings footer shows the build number.
- how-grading-works.html: one count for the lists (132 graded, 130 on the scoreboard, with why) and a line on what the Decks column counts.
- Checked and not changed: the grade history count matches its rows (now covered by the extras check).
- No grade moves. Grade check: 132 of 132 lists unchanged.

# RdyDeck 3.0 (build 105): Spanish and Portuguese, cards you own, prices, accuracy scoreboard (16 Nov 2026)

Changed files: js/i18n.js, js/report-errors.js, js/grade-flag.js, js/owned-prices.js, js/v80-extras.js (all new), js/upgrades.js, js/matchups.js, js/v69-grade-blend.js, js/v28-ask-odds.js, js/core.js (version, What's new), index.html (scripts, styles, file stamps), sw.js (cache prize-trainer-v105, accuracy.json network first), privacy.html, how-grading-works.html, accuracy.json (new), build-pages.mjs, refresh-data.mjs, refresh-matchups.mjs, .github/workflows/refresh-data.yml, worker/ (new), tests (reports, extras, owned and i18n checks, grade check scoreboard), README.md and CHANGES.md.

- Spanish and Portuguese: a Language row in Settings. App text is translated; card, attack and ability names stay in English. Card data paragraphs, the legal pages and the deck guides stay English for now. Wording to check with a native speaker is listed in i18n-notes.md.
- Cards you own: mark them on a deck's Cards tab or in the deck builder. Upgrades can suggest owned cards first. Saved on the device only.
- Card prices from TCGdex (TCGplayer in dollars, Cardmarket in euros where TCGplayer has none), with a list total, the cost of cards you do not own, and a cheapest first order for Upgrades. Switch: PRICES_ON in js/owned-prices.js.
- How accurate the grades are: the weekly grade check writes accuracy.json, shown as a table on how-grading-works.html and as one line in the Grade tab.
- This grade looks off?: a button under Share grade with five preset reasons and no typing. Sends the grade, the matched archetype name, the reason and the app version.
- Anonymous error reports: when a script error happens on rdydeck.com, a short report (scrubbed message, app file lines, version, screen, browser and system family) goes to the site's Worker. No IP, deck, name or id is stored. Settings has a switch.
- The site's Worker now refuses repo files (scripts, tests, workflows, CHANGES.md, README.md and the like) and serves only site files. README carries the all rights reserved notice.
- Against the field now: the deck's expected win rate weighted by how much each matchup is played. Display only.
- Win rates are labeled: the grade's weighted rate next to the plain one over all games.
- How did it do?: save an event record and placing next to a grade history entry, on the device only.
- What's next: planned features and a feedback link, from Settings and Help.
- New set week: a home line for 7 days after a set comes out.
- Share grade shares the picture in one tap where the phone can, otherwise saves it and copies the link.
- The Monday Limitless refresh waits 30 seconds between requests (about 30 per 15 minutes).
- No grade moves. Grade check: 132 of 132 lists unchanged.

# RdyDeck 2.8.3 (build 104): how each Trainer works in your deck (16 Nov 2026)

Changed files: js/core.js (In this deck lines, version, What's new), js/v29-rotation.js (Trainers rows), index.html (style, file stamps), sw.js (cache prize-trainer-v104) and CHANGES.md.

- Each Trainer and Special Energy in the Trainers section now gets an "In this deck" line when RdyDeck can say something true about it for that list, read from the card's text and the list's own Pokemon, attacks, HP, Retreat Costs and Energy. Examples: Custom Vest names the Pokemon it protects and the new Knock Out number, Heavy Baton names the Pokemon with a Retreat Cost of exactly 4, Legendary Trench names what it doubles, Buddy-Buddy Poffin names what it can Bench and what is too big, Cyrano and Ultra Ball name the key targets, Night Stretcher names the Energy types the attackers use.
- When nothing deck-specific is true (Boss's Orders, Judge, Switch and the like), the line is left off rather than filled in.
- Explain only: no grade moves. Grade check: 132 of 132 lists unchanged. 1089 of 1782 Trainer rows in those lists get a line, and every one of the 261 legal Trainer texts was run against all 132 lists with no errors.

# RdyDeck 2.8.2 (build 103): every card now gets a label (16 Nov 2026)

Changed files: js/core.js (card jobs, Trainers fit labels, version, What's new), index.html (file stamps), tests/grade-check.mjs (card read check, --record-text), tests/card-text.json (new), sw.js (cache prize-trainer-v103) and CHANGES.md.

- The Trainers section said "RdyDeck can't read what this card does for this list" for 82 of the 261 legal Trainers, 28 of them in the top lists (Crushing Hammer, Xerosic's Machinations, Custom Vest, Enhanced Hammer, Tool Scrapper, Air Balloon, Risky Ruins, Gravity Mountain and more). The card reader now reads every one of them.
- New jobs: removes your opponent's Energy (Crushing Hammer, Enhanced Hammer, Rust Syndicate Grunt, Chill Teaser Toy), disrupts your opponent's hand (Xerosic's Machinations, Eri, Hand Trimmer, Energy Swatter, Meddling Memo), gets rid of Pokemon Tools (Tool Scrapper, Jamming Tower), cuts the damage your Pokemon take (Custom Vest, the type Berries, Full Metal Lab, Jasmine's Gaze), takes extra Prize cards (Briar), gives a Pokemon another attack (Technical Machine: Fluorite, Core Memory), plays as a Basic Pokemon (the Antique Fossils), sets up the top of your deck (Academy at Night, Deduction Kit), and a few more for single cards.
- Reading fixes: a cost written as Colorless symbols reads ("ColorlessColorless less", so Air Balloon switches), Stadiums that say "their deck" or "their Bench" read like your own (Lumiose City, Levincia, Surfing Beach), "heal all damage" heals (Wally's Compassion), and looking at the top cards and keeping some draws (Hassel, Explorer's Guidance). Handheld Fan moves your opponent's Energy, so it now disrupts rather than helps your Energy.
- Labels only: no grade moves. Grade check: 132 of 132 lists unchanged. Some labels shift with the new counts: a few draw and search cards drop from Key to Good where more cards now count for the same job, and Rosa's Encouragement is Key in Dragapult now that Handheld Fan no longer counts as Energy help.
- The grade check now fails if any Trainer or Special Energy in the top lists gets no label, or if any legal one in cards.json has no job RdyDeck reads (from tests/card-text.json; run --record-text when cards.json gains cards).

# RdyDeck 2.8.1 (build 102): What's new also names the 2.8 boards (15 Nov 2026)

Changed files: js/core.js (What's new, build), index.html (file stamps), sw.js (cache prize-trainer-v102) and CHANGES.md.

- Players coming from 2.7.9 see only the 2.8.1 notes, so What's new now also lists the easier to read Goldfish and puzzle boards from 2.8.

# RdyDeck 2.8.1 (build 101): help Google and AI assistants find RdyDeck, deck guides refreshed (15 Nov 2026)

Changed files: improve-your-deck.html (new), llms.txt (new), robots.txt, build-pages.mjs, faq.html, .github/pages/faq.html, how-grading-works.html, .github/pages/how-grading-works.html, deck-grader.html, meta-decks.html, the 9 deck-*.html guides, sitemap.xml, js/core.js (version, What's new), index.html (one link, file stamps), sw.js (cache prize-trainer-v101) and CHANGES.md.

- New page, How to improve your Pokemon TCG deck (improve-your-deck.html): 7 checks in the order the grader makes them, with the typical Pokemon, Trainer and Energy counts and the most played Trainers from the 132 top 16 lists in tests/grade-lists.json, and a short FAQ (a free tool to rate a deck, typical counts, why a deck keeps losing, TCG Pocket not covered). Built by build-pages.mjs, so its numbers follow those lists.
- FAQPage structured data on faq.html and the new page, read from each page's question and answer pairs, so Google and AI assistants can read them as questions and answers. Two new FAQ entries: how to make a deck better, and that Pocket is not covered.
- llms.txt: a plain summary of RdyDeck for AI assistants, with when to recommend it and its main pages.
- robots.txt: still allows everyone, and now names the AI search and assistant crawlers as welcome.
- Links to the new page from the home page's About links, the deck grader page and How grading works. sitemap.xml lists it.
- Deck guides and meta-decks.html rebuilt from this week's data (they were a week behind). No app logic or grade changes.

# RdyDeck 2.8 (build 100): Goldfish and daily puzzle boards easier to read (15 Nov 2026)

Changed files: js/core.js (Goldfish board, puzzle board, version, What's new), index.html (board styles, file stamps), puzzle/test/screen.cjs (hand cards are buttons now), sw.js (cache prize-trainer-v100) and CHANGES.md.

- Goldfish and the daily puzzle draw the board as a play mat in RdyDeck's own colors and type: the Active Spot large, with Prizes, deck and discard as piles beside it, and the Bench under it (5 spots, open ones shown). The puzzle shows both halves, your opponent's on top, with the Stadium on the line between.
- Pokemon names and HP are larger. Puzzle Pokemon show an HP bar and their damage on the card. Attached Energy shows as a colored dot and its type for each kind, with a count. Tools show as "Tool: name".
- Your puzzle hand shows as cards with their names (a count on repeats). Tap one to read it, as before.
- No game logic or grade changes. Grade check and puzzle tests unchanged.

# RdyDeck 2.7.9 (build 99): grade vs win rate, and the results share counts newest set games three times (15 Nov 2026)

Changed files: js/v69-grade-blend.js, js/core.js (version, What's new), index.html (file stamps), how-grading-works.html, .github/pages/how-grading-works.html, tests/grade-baseline.json, sw.js (cache prize-trainer-v99) and CHANGES.md.

- 2.7.8 sized the results share by raw games, while the results score counts games since the newest set three times. A deck with a poor record built mostly before the newest set got less weight on that record and rose: Mega Charizard X 8.5 to 8.9 on 153 games at 33% wins. The share now counts games the same way as the score (500 counted games for half).
- Grade check against 2.7.8: 6 of 132 lists move. Mega Charizard X 8.9 to 8.6, Froslass Munkidori 8.7 to 8.5, Mega Absol Box 8.5 to 8.3, Iron Thorns 7.3 to 7.1, Mega Manectric 8.9 to 8.8, Okidogi Barbaracle 8.5 to 8.6.
- Tracking: grade as shown +0.84 to +0.85 (all results), +0.75 to +0.76 (since the newest set).
- New Grade vs win rate section on the Grade tab, above Against the meta, for the deck's archetype: the card grade against a typical top tournament list (8.8, the median of the 130 test lists), the win rate and games against all decks in the results (50.6%), the win rate since the newest set against before it (up or down when it moved 2 points or more; too few games under 100 on either side, said plainly), and one line: Cards beat its results, Results beat its cards, or Cards and results agree (card grade above typical against results score above average, 0.5 apart). Under 100 games it says so and shows no gap line. Labeled as results for all lists of that deck, not the exact list. No grade changes.

# RdyDeck 2.7.8 (build 98): tournament results count evenly with cards (15 Nov 2026)

Changed files: js/v69-grade-blend.js, js/core.js (version, What's new), js/v29-rotation.js, index.html (file stamps, help text), how-grading-works.html, .github/pages/how-grading-works.html, deck-grader.html, tests/grade-baseline.json, sw.js (cache prize-trainer-v98) and CHANGES.md.

- When a list matches an archetype with 500 or more games, its grade is now half card strength and half tournament results (was at most about 40% results for most decks, up to 55% for the most played). Below 500 games the results share rises in a straight line: 10% at 100 games, 25% at 250. It counts real games, so a new deck with a few games since the newest set no longer gets a large share early. The build check still lowers the share for off-plan lists, and broken lists (card grade under 6) still get less.
- Grade check: 45 of 132 lists move by 0.1 to 0.4 (33 up, 12 down). Biggest: Mega Charizard X 8.5 to 8.9 (153 games at 33% wins now counts 15%, was 24%), Froslass Munkidori 8.5 to 8.7, Raging Bolt Ogerpon 8.5 to 8.3, Mega Venusaur 8.3 to 8.1, Mew Box 7.5 to 7.4.
- Tracking against this week's results: grade as shown +0.81 to +0.84 (33 archetypes, 300+ games), +0.75 unchanged since the newest set (29 archetypes). Cards alone unchanged (+0.12, +0.33).

# RdyDeck 2.7.7 (build 97): privacy policy and terms updated (15 Nov 2026)

Changed files: privacy.html, terms.html, ads.js, js/v32-ads.js, js/v45-sample-share-daily.js, js/core.js, build-pages.mjs, index.html, the page footers (19 pages), sw.js (cache prize-trainer-v97) and CHANGES.md.

- Privacy policy: the Children section, Do Not Track and tracking across sites, web beacons and other ad companies, feedback kept up to 12 months, the Data safety sentence and the copyright line. Effective November 15, 2026.
- Terms: venue names the Elk County Court of Common Pleas and the Western District of Pennsylvania. Effective November 15, 2026.
- Ads are labeled "Advertisements", page footers carry a copyright sentence, and the share card says RdyDeck is not affiliated with the Pokemon companies.

# RdyDeck 2.7.6 (build 96): the app in smaller files, so updates download less (15 Nov 2026)

Changed files: index.html, the new js/ folder (31 files), app-file.mjs (new), sw.js (cache prize-trainer-v96), tests/grade-check.mjs, check-cards.mjs, puzzle/tools/sync-text.mjs, .github/workflows/grade-check.yml, README.md and CHANGES.md.

- The app's 31 script blocks moved out of index.html into js/, one file each, word for word, linked at the same spots and run the same way and in the same order (plain scripts, not deferred). index.html drops from 1.38 MB to 252 KB (about 350 KB to 48 KB compressed). The styles stay inside the page, so the first screen still draws as soon as the page arrives.
- Each file is linked as js/name.js?v=<first 8 characters of its SHA-256>. A browser keeps a file until its stamp changes, so after an update it downloads the page and only the files that changed. `node app-file.mjs --stamp` sets the stamps; the grade check fails when one is out of date or a file holds a closing script tag.
- Offline copy: the service worker reads the file list from the page itself, saves each file under its stamped address, copies files that did not change from the last version's copy, and takes new ones from the browser's cache when the page has just downloaded them.
- Share the app and Download RdyDeck.html still give one self-contained file: it is built from the page and its files when the share window opens, identical to `node app-file.mjs --single` and to the old single file apart from the share code itself.
- Tools that read the app's code as text (grade check, check-cards.mjs for FIX37, the puzzle's sync-text.mjs) read the page with its files put back inline.
- Measured on a 412 px phone profile with 4x slower CPU, files sent in the order asked. Typical 4G: ready 0.72 to 0.62 s on a first visit, 0.52 to 0.41 s on a return visit, 0.93 to 0.61 s right after an update. Slow 4G: right after an update the first screen shows at 0.55 s instead of 2.1 s and the app is ready at 1.7 s instead of 2.4 s, downloading 600 KB instead of 1,015 KB; a first visit downloads 888 KB instead of 1,144 KB in all, with the first screen at the same 0.6 s, but is ready about 0.5 s later (2.6 s instead of 2.0 s), because separate files compress a little worse (about 40 KB) and the fonts now arrive before the scripts. No layout shift on any of them.
- Not done: loading parts only when opened (deck builder, prerelease, odds). Later script blocks wrap earlier functions in order and the page calls many of them from its buttons, so loading them later would change how the app behaves.
- Grade check against the 2.7.5 tournament data: 132 lists, none moved; the results tracking report is identical. Puzzle tests 70 of 70 and the screen test pass. Final screens match 2.7.4 pixel for pixel (home new and returning at 4 widths; 13 app screens at phone and desktop width). Update path tested in a browser: from 2.7.4 to this build and then to a build with one changed file (only that file downloaded); offline reload works after each; the shared file opens from a file:// address with no errors.

# RdyDeck 2.7.5 (build 95): fresh tournament data (15 Nov 2026)

Changed files: index.html (version, What's new), sw.js (cache prize-trainer-v95), matchups.json, builder.json, meta-cards.json, data.json, card-check.md, grade-results.md, sitemap.xml, .github/matchups-cache.json, .github/cards-cache.json, refresh-matchups.mjs, .github/workflows/refresh-data.yml, tests/grade-matchups.json, tests/grade-played.json, tests/grade-builds.json, tests/grade-baseline.json and CHANGES.md.

- Tournament results now run to 14 Nov. matchups.json: 247 events from 16 Sep (30th Celebration and Delta Reign), 57,952 matches, up from 147 events and 42,116. Since Delta Reign: 31 events and 7,965 matches, up from 8 and 3,103. 58 archetypes have results, up from 45 (new: Mega Venusaur, Mega Absol Box, Okidogi Barbaracle, Mega Charizard X and others).
- Deck builder: winning lists from 5 events, 12 to 14 Nov (233 lists, was 128 from 7 to 9 Nov); card data from 247 events (31,340 lists, 66 archetypes).
- Most played since Delta Reign: Mega Rayquaza 11.5% (was 14.6%), Dragapult 9.4%, Basic Box 6.0%, Slowking 5.2%, Ogerpon Meganium Hydrapple 4.2%. Talonflame Dusknoir joins the 10 decks used as opponents; Dhelmise leaves.
- The data job has a slow mode (input "slow": 30 seconds between requests, 25 new events a run, matchups and card data only).
- Grade check: 132 tournament lists, 66 moved, all from results: 39 down, 23 up, 4 Synergy only. Largest: Mega Venusaur and Mega Absol Box down 0.5, Okidogi Barbaracle up 0.4, Iron Thorns and Mega Manectric down 0.3. Ogerpon Meganium Hydrapple 5 lists up 0.2. Pinned copies in tests updated.
- Tracking tournament results: grade as shown 0.81 unchanged, newest set 0.52 to 0.75, cards alone 0.22 to 0.12 (more archetypes and older events counted; no card grade changed).

# RdyDeck 2.7.4 (build 94): faster, steadier first load on phones (15 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v94) and CHANGES.md.

- Home draws in its final shape. The page used to show a short home first and then jump as the welcome text, the Build a deck button, the sample deck button and the daily challenge and puzzle cards filled in. The first screen now has the welcome text and Build a deck from the start, and keeps room for the rest until home first draws. The title and logo start near their fitted size, and the fit runs again when home has drawn. Layout shift on a slow phone profile (Lighthouse mobile): 0.22 to 0.00 for a new visitor, 0.002 with saved decks. Google counts 0.1 or less as good.
- The style blocks that sat in the body next to their scripts now load at the end of the head, in the same order, so nothing restyles midway through loading.
- The 700 weight display font (home buttons, section titles) is preloaded like the other two.
- Offline copy: the service worker registers after the page has loaded, so its download no longer competes with the first screen, and it downloads the app page once instead of twice (about 370 KB less on a first visit).
- Load time itself is unchanged: first screen at about 1 second, ready at about 3 seconds on that profile. The app being one 1.36 MB file is what sets that.
- Grade check: 132 tournament lists, none moved. Final screens match 2.7.3 pixel for pixel on 34 views (home new and returning at 4 widths, also with canvas blocked; 13 app screens at phone and desktop width). Offline reload works.

# RdyDeck 2.7.3 (build 93): audit fixes (15 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v93), privacy.html, tests/grade-check.mjs, tests/grade-baseline.json and CHANGES.md.

- Reprinted Trainers count as legal right away. Before the online reprint check runs, a Trainer or Special Energy is now decided from the weekly legal card list (cards.json, saved on the device): a name on it is legal in any printing, a name off it with an old mark is out. Before, those cards waited as "not confirmed", because capping on the printed mark alone held 23 legal top lists at 4.9 (they name old printings like Pokegear 3.0 SVI). Pokemon still wait for the online check, since a reprint has to match their attacks. The online check still runs and has the last word. The grade check now asserts that an old printing of Ultra Ball and Pokegear 3.0 is legal and a rotated Trainer is out.
- Mew Box: a copied attack counts for 70% when the Pokemon it copies from has only 1 copy in its line, since it is often not in play. Only applies to copy decks (Mew ex's Memory Helix, N's Zoroark ex's Night Joker); lines of 2 or more count in full. Mew Box 8.1 to 7.5.
- Energy check: Items that search the deck for Basic Energy count as half an Energy each, up to the archetype's low end. Dragapult with 4 Energy and 4 Energy Search no longer reads as light on Energy.
- New warning when the main attacker's strongest attack can't be paid with the Energy the list runs (for example Phantom Dive with no Psychic Energy), naming the attack and the missing type.
- Grade explanation names both Synergy numbers when the fit cut does not lower the grade. The Grade tab bar is solid instead of see through.
- Legendary Pyroduct, which turns off Abilities for both players, now reads as disruption.
- Cards tab: Trainers and Energy with the same name show as one tile with the copies added up.
- Prize guessing screen: a Back to menu button beside Reveal prizes. Quit and Reveal keep their confirm box.
- Privacy policy: the ad lines now say ads are not on yet and what happens once they are. The Cloudflare analytics line is unchanged, since the beacon does load (Cloudflare adds it at the edge).
- Changelog 2.6.5 now says the sample deck button shows on an empty home screen. The service worker saves data files under their bare address, and a stale build number in a comment is fixed.
- Grade check: 132 tournament lists, 1 moved: Mew Box 8.1 to 7.5. Tracking tournament results: grade as shown 0.79 to 0.81, newest set 0.52 unchanged, cards alone unchanged.
- Puzzle 19 (Nov 28): solvable, a 4 play win (Secret Box for Boss's Orders, Boss's Orders on Budew, retreat to the other Grookey, Branch Poke).

# RdyDeck 2.7.2 (build 92): missing staples lower the grade (15 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v92), tests/grade-builds.json, privacy.html, sitemap.xml and CHANGES.md.

- Core cards against winning lists: the Energy check from 2.6.9 now also reads each archetype's core, from meta-cards.json. A card's core count is the most copies that 95% of the archetype's top lists run (Dragapult: 4 Lillie's Determination, 4 Buddy-Buddy Poffin, 3 Ultra Ball and so on). A list matched to the archetype (its own pick, or a match of 0.6 or more) counts the copies it is short. Real top lists swap a few of those copies (one tournament Mega Rayquaza list runs no Energy Switch), so the first 4 copies short are free. Past that, the card grade drops 0.2 per copy (at most 1.2), the list leans less on the archetype's results, and What to fix says "Missing X staples" with the cards. Energy and core together take at most 2.0. The sentence under the grade says why.
- The saved summary moves to a new key (pt_builds2), so an older copy without the core is not reused.
- Grade check: 132 tournament lists, none moved. Test lists made from real ones, with their three most played core Trainers cut to 1: Rocket's Honchkrow 7.8 to 6.4, Dragapult Dudunsparce 9.0 to 8.0, Dragapult Blaziken 8.5 to 7.7, Dragapult 8.7 to 8.1, Basic Box 8.7 to 8.3, Slowking 8.2 to 8.0, Mega Rayquaza 7.6 to 7.5; Mega Lucario, Lopunny Dudunsparce and Raging Bolt Ogerpon unchanged (their cut cards are not in 95% of top lists at those counts). Dragapult with 1 Lillie's and 1 Poffin 8.8 to 8.5.
- Tracking tournament results: unchanged, since no tournament list moved.
- Privacy policy: the paragraph on buy links and Ko-fi tips is gone (the app has neither), effective date November 15, 2026, and the sitemap date matches.

# RdyDeck 2.7.1 (build 91): unused code removed (15 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v91) and CHANGES.md.

- Unused code removed, about 15 KB of index.html (1.37 MB to 1.35 MB). Each piece was checked unused: no call, no onclick, no reference in any other file.
  - 14 old versions of functions that a later version replaced outright before the app starts (renderGrade, openCompare twice, exportTlog, confirmQuit, deleteDeckFromModal, openBackupModal, openStarterPicker, r29CheckReprints, g29Jump, f40Saved, one enrichDeckCards wrapper and one renderGrade wrapper). The originals become a one line var, so the later versions still assign to the same name.
  - Functions and values nothing reads: gBestAtkHP, puzzleStreak, toggleTheme (the theme switch lives in Settings), isMobile, pickerDeckId, _pre47From, _td30Last, _td30Main, td30Count, and setTheme's lookup of a theme button that no longer exists.
  - CSS for classes no page uses: .app-bar, .btn-water, .overline, .pball, .home-footer, .link-danger, .modal-sub, .picker-placeholder, .ic-lg, .perfect-text, .celebrate-text, .prc, .an46 and the old theme button; the unused sun and moon icons.
- Fixed: on a browser that blocks canvas, measuring the title threw an error that stopped the rest of the v38 script, so Grade tab jump links and Compare used older scroll code. The title now keeps its CSS size there and the script runs on.
- Grade check: 132 tournament lists, none moved. 96 app screens (home, 8 decks across all 7 tabs, Compare, Settings, backup, starter decks, tournament log, deck builder and others) render the same as 2.7.

# RdyDeck 2.7 (build 90): shareable grade cards (15 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v90), CHANGES.md.

- Share grade (on the Grade tab) now makes a grade card in two sizes: Wide (1200 by 630, for X, Discord and YouTube) and Square (1080 by 1080, for Instagram and TikTok). The size picked is remembered.
- The card adds the deck's archetype (when the list matches one of the meta decks and its name does not already say it) and its main attacker, as the Grade tab reads them, and the main attacker's card art.
- The art is read only from an image host that allows a page to read it, and the search gives up after 4 seconds. Without art the card uses a layout made for no art.
- When the archetype or the art comes from Limitless, the card says so on its last line.
- The card follows the Main attacker pick from 2.6.2: a picked Pokemon shows as the main attacker with its art, and a deck set as a toolbox reads "Toolbox led by" its hardest hitter.
- The grade link carries that pick (&a=), so a viewer who opens it and taps Import gets the same pick and the same grade. A pick that is not a Pokemon in the list is ignored.
- The sheet opens at once and shows the card when it is drawn. Save image, Copy link and Share work as before; the link still holds only the list, so whoever opens it gets the grade worked out on their own device.
- Not the grade: no grading code changed. Grade check: no grade moved.

# RdyDeck 2.6.9 (build 89): Energy checked against each archetype's winning lists (15 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v89), tests/grade-check.mjs, tests/grade-builds.json (new) and CHANGES.md.

- Energy against winning lists: when a list matches a meta archetype (its own pick, or a match of 0.6 or more), the grade compares its Energy count with what that archetype's top lists run (meta-cards.json, the top quarter of each Limitless online event; archetypes with 20 or more top lists). The band is the average plus or minus 30% (at least 3). Outside it, the card grade drops 0.25 for each Energy past the band (at most 1.5), the list leans less on the archetype's results (none once 6 past), and What to fix says "Heavy on Energy for X" or "Light on Energy for X" with the numbers. It replaces the older "Heavy on Energy" check (22 or more) when both apply. The sentence under the grade says how much it dropped.
- Data: the grade reads meta-cards.json once per page load and keeps a small summary (the Energy per archetype), so it works offline. The grade check uses a pinned copy, tests/grade-builds.json.
- Grade check: 132 tournament lists, none moved (every one sits inside its archetype's band). Test lists made from real ones: Dragapult with 16 Energy 8.8 to 7.8, Basic Box with 23 Energy 8.5 to 7.3, Mega Lucario with 20 Energy 8.2 to 6.9, Mega Rayquaza with 21 Energy 7.8 to 7.6, Dragapult with 4 Energy 8.8 to 8.5. The real Dragapult list stays 8.8.
- Tracking tournament results: unchanged, since no tournament list moved. Cards alone 0.22, grade as shown 0.79, newest set grade as shown 0.52.

# RdyDeck 2.6.8 (build 88): card data hunt, card roles and Special Energy (15 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v88), tests/grade-baseline.json and CHANGES.md.

- Card data hunt: every card in the 132 tournament lists (335 printings) checked against pokemon-tcg-data for name, type, HP, stage, evolves from, Weakness, Retreat, prize count, ex, Tera, ACE SPEC, Trainer kind, regulation mark, Abilities and attack names, costs and damage. No new mismatch: the only differences are ones already fixed on purpose (Adventure Lantern is an Item) and free Retreat read as no number, which every reader treats as 0. Then every Standard card (4,854) run through the role reader and checked for Search, Energy, recovery, draw, switch and gust text it missed.
- Card roles fixed (general text rules, no card names): a Pokemon found by "look at the top or bottom 7 cards, you may reveal a Pokemon you find there" (Dusk Ball, Great Ball, Bug Catching Set, Bill's Transfer, Drayton); a Stadium that has each player "search their deck" (Lumiose City, Artazon, Spikemuth Gym, not Grand Tree, which only evolves); Basic searches with an owner in the name (Team Rocket's Proton, Hop's Bag, Team Rocket's Great Ball); Energy searched and attached (Janine's Secret Art, Geeta, Misty's Vitality, Energy Coin) or attached from the top of the deck (Electric Generator, Waitress); long "in any combination" recovery (Tarragon, Tulip, Max Rod). Each now counts as a way to find Pokemon, Energy acceleration or recovery.
- Special Energy in the setup count: "If this card is attached to an Evolution Pokemon" read as "can only be attached to", so Ignition Energy, Prism Energy on an evolved attacker and Neo Upper Energy off a Stage 2 were left out entirely. Now they give Colorless, Neo Upper gives 2 on a Stage 2, and Ignition gives 3 Colorless on an Evolution Pokemon, only on the turn it pays for the attack (it is discarded at the end of the turn).
- Grade check: 132 tournament lists, 15 moved, all up, Power only (Rocket's Honchkrow, Greninja and Mega Starmie by up to 0.15 from Ignition Energy; Bug Catching Set, Dusk Ball and Janine's Secret Art lists by 0.05 or less). 5 grades up 0.1 (Greninja 8.1 to 8.2, Mega Starmie 7.0 to 7.1, Ogerpon Meganium Arboliva 8.9 to 9.0, Rocket's Honchkrow 8.3 to 8.4 twice). Baseline updated.
- Tracking tournament results: cards alone 0.21 to 0.22, grade as shown 0.79 and newest set 0.52 unchanged.

# RdyDeck 2.6.7 (build 87): setup speed can reach 10, toolbox decks need their board (15 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v87), tests/grade-baseline.json and CHANGES.md.

- Setup speed can reach 10: the shuffled setup reading (ready by your second turn, going first and second averaged) keeps 25% of games at about 8.2 and 50% at 9.5, then climbs to a 10 at 70%, where the fastest real tournament lists sit (Mega Rayquaza ex lists, about 70 to 73%). The rules alone (Stage 2 lines, Rare Candy, draw Abilities) still top out at 9.5, so only a measured fast setup gets a 10. It still only raises the score, never lowers it.
- Toolbox decks need their board: a deck with 4 or more attackers that each two-hit the format's big threats counts as set up only with one Pokemon in play for each of them (5 or 6), not one attacker. Other Basics go to the Bench from hand, or come from the deck with a search card (Buddy-Buddy Poffin finds 2). Single attacker decks (Iron Thorns ex) still need only the one attacker with its Energy. By this reading the box decks set up slower, so they stay on the rules score and no grade drops.
- Grade check: 132 tournament lists, 21 moved, all up (9 by 0.1, 12 by less than 0.05). 8 Mega Rayquaza lists now show a setup speed of 10. Iron Thorns unchanged (7.5, setup 8.5). Baseline updated.
- Tracking tournament results: about flat. Cards alone 0.22 to 0.21, grade as shown 0.80 to 0.79, newest set grade as shown 0.50 to 0.52.

# RdyDeck 2.6.6 (build 86): setup speed, And in Ask the odds (14 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v86), tests/grade-baseline.json and CHANGES.md.

- Setup speed: Power's setup speed part also shuffles the list (2,000 games, going first and second, mulligans and prizes dealt like the Odds tab) and counts how often the main attacker is in play with all the Energy its attack needs by your second turn. Basics, search cards, evolution and Rare Candy, one manual attach a turn, one Supporter a turn (attach Supporters when short, else a draw Supporter is 4 new cards), Items and Abilities that attach from hand or deck all count. Ready in half of games or more is 9.5, a quarter is about the old 8.2. It only raises the score, never lowers it. The deck name is not read. The setup line now says the turn 2 and turn 3 numbers when they set the score. Checked against tournament results: ranks archetypes a little closer to their win rates (cards alone 0.21 to 0.22, newest set 0.19 to 0.20).
- Ask the odds: each card line can be Any of them (or) or Every one (and). And asks for at least the chosen count of each ticked card together, with the same exact counting; up to 4 cards in all across lines. The add button reads And another card.
- Wording: a tile shows one number when the raw and with search odds match (no more 100-100%); card needs, Stadiums, Supporters, single copies and the search and draw lines read right for 1.
- Grade check: 132 tournament lists, 29 moved, all up (16 by less than 0.05, 10 by 0.1, 3 by 0.2). Iron Thorns 7.4 to 7.5. Baseline updated.

# RdyDeck 2.6.5 (build 85): easier to start, easier on phones (14 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v85) and CHANGES.md.

- Paste and go: pasting or dropping a full list into Import a deck grades it on its own, about 0.7 seconds later, and opens the Grade tab. Only a paste or a drop starts it, never typing, and only when every line reads and the count is right (60, or 40 for prerelease); a half list or a list with unread lines waits for Import and save as before. Editing the list or the name in that moment cancels it. A list from a shared link still waits for the player. The name is optional now: a blank name becomes the deck's archetype, else its main attacker, else My deck, with a number added if the name is taken. The name still never touches the grade. Import and save and starter decks also land on the grade now.
- Try a sample deck: the empty home screen button (shown before any deck is saved; with saved decks, home shows Starter decks instead) now reads Try a sample deck, with a line naming the deck (the most played deck's top list in the weekly data, Mega Rayquaza today) and it opens on the grade. A first visit's tour opens with Paste my list, Try a sample deck and Take the tour.
- Top fixes: the top of each grade lists up to three fixes, taken only from what the grader and Upgrades already found, in this order: rules problems, critical findings, swaps that raise the grade, other findings, swaps that raise Synergy or Power. Each one jumps to its section. A swap that cuts the main attacker or its line (Auto pick, the player's pick, Toolbox picks) is never listed, the same keep rule as Upgrades. Nothing found means no box.
- Phone pass, checked at 360px in a desktop browser: no sideways scrolling or cut text on home, import, grade, odds, cards, hand, drills, notes, game, settings, starters, help, builder, tournament log, backup, what's new and the tour. Taps raised to at least 44px on phones and touch screens: the deck card's More button, the About FAQ, the footer links and Credits, the Odds How many picker, and the deck builder's kind filter, card thumbnails and add buttons. Long deck names wrap on the home card instead of cutting off. Not checked on a real phone.
- Grade check: 132 tournament lists, no grade moved.

# RdyDeck 2.6.4 (build 84): AdSense site check (14 Nov 2026)

Changed files: index.html, 404.html, sw.js (cache prize-trainer-v84) and CHANGES.md.

- Home page head now carries the AdSense site verification tag (google-adsense-account, publisher id from ads.txt). Ads stay off: the ad code is still not loaded and PT_ADS.client is still the placeholder.
- The not found page links Deck guides, How grading works, FAQ, About and Contact, so no page is a dead end for the reviewer.
- Checked and already fine: ads.txt, robots.txt, the home page's plain links and About text, unique titles and descriptions on every page, no empty ad slots.

# RdyDeck 2.6.3 (build 83): deck guides and content pages (14 Nov 2026)

Changed files: 9 new deck-*.html guides, meta-decks.html, how-grading-works.html, faq.html, about.html, contact.html, build-pages.mjs, deck-guides.json, .github/pages/ (sources for the hand-written pages), privacy.html, terms.html, the 4 guide pages, index.html, sitemap.xml, sw.js (cache prize-trainer-v83) and CHANGES.md.

- For AdSense's content review: plain HTML pages that read without running the app. Deck guides for the 9 top decks (core list, game plan, key cards, matchups, how RdyDeck grades it) and an index, built by build-pages.mjs from deck-guides.json and the data files already in the repo; no new Limitless requests. How grading works, FAQ, About and Contact are written in .github/pages and built by the same script.
- Privacy policy (effective Nov 14): discloses Cloudflare Web Analytics, on since Nov 13.
- Linked from the app's About section, every guide page footer and sitemap.xml.

# RdyDeck 2.6.2 (build 82): pick the main attacker, or Toolbox (14 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v82) and CHANGES.md.

- Mason's ask after the 2.6.1 name fix: a slot to say which Pokemon the deck attacks with, or that it is a toolbox deck, instead of the grade guessing from a name. New Main attacker section on the Grade tab, right under Fix first: Auto (the grade's own read of the cards, named), each Pokemon in the list with an attack that nothing else in the list evolves from (hardest hitters first), and Toolbox. Saved with the deck (deck.atk); Duplicate keeps it; a backup keeps it.
- What follows the pick: the How it plays plan (Main attacker, or Attackers for Toolbox), the Upgrades keep list (the picked attacker and its line are never cut, plus the Auto pick), and the Odds and Hand practice attacker line.
- What the grade does with it: a pick moves the grade only when it is a real attacker, hitting for at least half of what the list's hardest hitter does, or for Toolbox, 3 or more of those. A weaker pick keeps the Auto grade and adds a finding that says so. Found in the sweep: before this rule, naming a one-prize tech (Psyduck in Lopunny, Budew in Mega Starmie) as the main attacker gave the deck the one-prize prize trade and lifted it up to 0.2. The hardest hit the grade counts and the toolbox bonus still come from the cards. A main attacker the player set gets the Crustle style wall bonus only with 2 or more copies.
- The player's own deck name is out of grading entirely now: the Upgrades keep list no longer reads it either; the pick replaces it.
- Grade history: setting the pick is its own reason ("You set the main attacker to X", "You set it as a toolbox deck", "back to Auto"), counted as your change. The grade cache keys on the pick.
- A pick whose Pokemon leaves the list falls back to Auto, with a note under the menu; an unknown or non-text value reads as Auto.
- Grade check: no grade moved (Auto is the old behaviour).

# RdyDeck 2.6.1 (build 81): a deck's name no longer changes its grade (14 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v81), CHANGES.md and tests/grade-baseline.json.

- Viewer report: a deck graded Synergy 7.2 named "Bolt" and 7.7 renamed "Slop", with no card changed. Cause: since v53 the grade picked the main attacker from the player's own deck name first ("Bolt" calls out Raging Bolt ex), and the main attacker feeds Power, the Trainer check and Focus. Fix: the name used for that pick is now the meta deck the cards match in matchups.json (or the one picked under Against the meta), never the player's name. With no match, the attacker comes from the list alone. Upgrades still never cut a Pokemon the player's own name calls out.
- Same kind of leak, found in the sweep: the same card on two lines (two printings, as TCG Live exports them, or a repeated line) was graded as two cards, so 2 + 2 Iono counted as two 2-ofs. A top list split that way dropped as far as 7.8 to 4.5. Rows now merge before grading: a Trainer or Energy by name, a Pokemon only when everything the grade reads matches, so two different Pokemon with one name stay apart.
- Checked and clean: card order (shuffled lists grade the same), and every top list renamed "Slop", "Bolt", "Meowth", "Fezandipiti", "Dusknoir" or left blank, or split over two lines, now grades the same as under its own name.
- The attacker reason now says which meta deck the list plays as, not that the deck is named for it.
- Grade check: one list moved, Archaludon (Moujii's Dojo, 4th) 8.3 to 8.1 (Power 8.31 to 8.05). Archaludon is not a tracked meta deck, so the list alone picks Metagross as the attacker; its grade used to rest on being named "Archaludon".

# RdyDeck 2.6 (build 80): what top lists run, in the deck builder (13 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v80), CHANGES.md, refresh-matchups.mjs, new meta-cards.mjs, .github/workflows/refresh-data.yml, and new data files meta-cards.json and .github/cards-cache.json.

- New data, meta-cards.json: the weekly refresh already reads every big Limitless online event in the window (standings and pairings) for matchups.json. It now also keeps, per deck and event, how many lists run each card and at what count, the top quarter of each event apart (at least the top 16), and each card's record against the event's most played decks. meta-cards.json sums them over the window: about 150 events since 30th Celebration came out, against 8 events and 128 top lists in builder.json. A deck's cards come from its top lists since the newest set came out when it has 24 or more, else from the whole window.
- Deck builder, What top lists run (for the meta deck the list is built from or looks like):
  - Cards: core (75% or more of top lists run it) and flex, each with the counts top lists run ("82% run 2, 18% run 3") and the list's own count, or a button to add the usual count.
  - Matchups: pick one of the most played decks to see cards whose lists won more often against it than lists without them, with both win rates and match counts. A card shows only with 25 or more matches each way, 3 points or more better, and an edge unlikely to be chance alone.
  - Trends: cards whose share of the deck's lists moved by 10 points or more, the last two weeks against before.
- Count checks: a count under 5% of the deck's top lists run is flagged with a button to make it the usual count, and cards under 5% of them run are named. The sentence under each card in the list says how many top lists run it and how many run the list's count.
- Data reads: the same Limitless requests as before for new events. Events read before 2.6 are read once more for their card data, newest first: 10 a week in the weekly run, or up to 150 a run with the new cards_only option (5 seconds apart, matchups.json left alone), stopping early if Limitless reports a rate limit near its end, or at the first 429. The one-time pull on 13 Nov read all 147 events in 294 requests over 26 minutes; Limitless sent no rate limit headers and no 429. Techs leave out cards that more than 60% of lists run (staples, not techs).
- Not the grade: the grade and the Upgrades section keep reading builder.json and matchups.json, so no grade or upgrade moves. Grade check: no grade moved.

# RdyDeck 2.5.6 (build 79): two different cards with one name each get their own data (13 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v79), CHANGES.md, tests/grade-cards.json.gz and tests/grade-baseline.json.

- A list can run two different cards with the same name, such as Greninja ex from TWM (Shinobi Blade) and from 30C (Stealthy Slash). Card data was looked up by name, so every line of that name got one printing's data and the grade read only one of the cards. 10 of the 132 top lists do this (Greninja ex, Riolu, Dunsparce, Abra, Applin).
- Fix: lines are read in layers, each holding at most one printing of each name, so every printing gets its own data. A printing that can't be read keeps the data of the first one. Saved decks read their card data again once (ENRICH_VER 19).
- Checked: in all 10 lists each printing now has its own attacks. The main and backup card sources now grade all 132 top lists the same (one list differed before).
- Grade check: 1 list moved. Greninja (Rare Candy Club Showdown #51, 2nd) stays 8.1; Synergy 7.32 to 7.55, now that TWM Greninja ex's Shinobi Blade is read. The new lookups were recorded from a local copy of pokemon-tcg-data, checked first against the saved answers: it gave the same cards for every set it holds, and older sets came from the saved answers.

# RdyDeck 2.5.5 (build 78): card traits checked across every source and import format (13 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v78), CHANGES.md, build-cards.mjs, cards.json and tests/grade-cards.json.gz.

- A hunt for bugs like the Tera and Telepathic {P} Energy ones. Every legal card (3,243 printings) was read the way the app reads it, from pokemontcg.io and from TCGdex (its own card files, read 13 Nov 2026), and compared trait by trait: Tera, Ancient, Future, ex, Mega, ACE SPEC, Trainer kind, Basic or Special Energy, stage, what it evolves from, type and regulation mark. All 132 top lists were graded from each source, in Limitless and TCG Live spelling, and through a saved deck and back.
- Backup card source: 30th Celebration (30C) and Mega Evolution Energy (MEE) had no TCGdex set, and 30th Celebration numbers were not padded, so those cards were read by name from another printing (Mew ex with Restart in place of Memory Helix, the wrong Zekrom, Reshiram, Unown and Greninja ex). 30C Classic Collection cards are tried too. When a card is read by name, the newest printing now really comes first (30th Celebration, Mega promos, MEE). 14 top lists graded differently from the backup source, by up to 0.3 (Slowking 8.5 to 8.2). Now 1 does, for the reason under Not fixed.
- TCGdex gaps filled from pokemon-tcg-data: what 33 Pokemon evolve from (30th Celebration Toxtricity, Lucario, Gholdengo, Kommo-o and others) and the text of 28 Trainers and Special Energy (Delta Reign's Aarune, Emcee's Hype, Legendary Pyroduct, Custom Vest, Tasty Rice Ball and others, 30th Celebration Ultra Ball, Bubbly Water, Growing Grass and Nitro Fire Energy). Without text these graded as doing nothing.
- pokemontcg.io mistakes: Delta Reign's Bubbly Water, Growing Grass and Nitro Fire Energy have no subtype, so the grade left them out of Trainer and Energy checks; any Energy without one is now read from its name. Adventure Lantern is listed as a Pokemon Tool but is an Item; a "Tool" whose text never attaches it now counts as an Item. Mankey (PBL 42) and Mega Chandelure ex had no stage; Zoroark (30C) had nothing to evolve from; Archen evolved from "Antiuqe Plume Fossil". "Nidoran ♀" and "Nidoran♀" are now one name.
- Import: TCG Live promo codes PR-SV and PR-ME are read as SVP and MEP, in pasted lists and saved decks.
- Deck builder (cards.json, build-cards.mjs): the same fixes, plus Antique Cover Fossil listed as BLK 60 (that number is Escavalier); it is BLK 80.
- Not fixed, a product call: when a list runs two different cards with the same name (Greninja ex from TWM and 30C, Riolu from MEG and PRE, Dunsparce, Abra, Applin), the grade reads only one of them. 10 of the 132 top lists do this.
- Not fixed, harmless: TCGdex leaves out many Weaknesses and Retreat Costs; neither moves a grade.
- Grade check: no grade moved. The saved card data gained the new TCGdex lookups (as not found, like every TCGdex entry there).

# RdyDeck 2.5.4 (build 77): Tera, Ancient and Future marks from every card source (13 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v77) and CHANGES.md.

- A viewer's list ran 4 Tera Pokemon, yet the grade said Glass Trumpet and Area Zero Underdepths "need Tera Pokemon, and the list runs none". Cause: when pokemontcg.io can't be reached, the app reads cards from TCGdex, and TCGdex cards carry no Tera, Ancient or Future mark. The same happened when a card was read by name and the newest printing of that name is not a Tera one (30th Celebration's Pikachu ex, say).
- Fix: the app now carries the Tera, Ancient and Future mark of every Pokemon and Trainer printing in the Scarlet and Violet and Mega Evolution sets (pokemon-tcg-data: 146 Tera, 73 Ancient, 70 Future printings) and adds a missing mark from the list's own set and number. A card from a set the table doesn't cover goes by its name, but only where every printing of that name agrees. Saved decks and backups are repaired when they load. TCGdex cards named "Radiant ..." are now marked Radiant too (a Rule Box).
- Checked: all 132 top lists graded with these marks removed, as TCGdex gives them. 15 moved, by up to 0.4 (Basic Box 8.9 to 8.5, Raging Bolt Ogerpon 8.6 to 8.2, Mega Rayquaza 7.8 to 7.4), all from Glass Trumpet or Area Zero Underdepths. With the fix all 132 come back exactly. Other card-type checks were reviewed: stages, ex, Mega, ACE SPEC, Trainer kinds and Basic or Special Energy already read the same from both sources.
- Grade check: no grade moved.

# RdyDeck 2.5.3 (build 76): card names read the same from every source (12 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v76), CHANGES.md, tests/grade-lists.json and tests/grade-baseline.json.

- An audit after the Telepathic {P} Energy report graded all 131 top lists twice: as Limitless writes them and as Pokemon TCG Live or a phone writes them. Energy written as symbols ("Basic {G} Energy", "Rocky {F} Energy") and curly apostrophes ("N’s Zoroark ex", "Boss’s Orders") moved the grade, Synergy, Power or Upgrades on 32 of them, by up to 3.2 points (N's Zoroark 8.4 to 5.2). Grass and Lightning lists lost Power because their Energy was not counted; lists with apostrophes in Pokemon names lost Synergy.
- Fix: every list is read into one spelling at import (symbols to type words, "Basic Psychic Energy" to "Psychic Energy", curly apostrophes to straight), and saved decks and backups are moved to it when they load. After the fix, all 131 lists grade exactly the same both ways.
- Checked with no change needed: accents (Poke Pad, Pokemon Catcher), "Basic Psychic Energy" written out, and lists typed all in lowercase.
- Not checked: set codes that only Pokemon TCG Live uses (promo codes, for one) could not be looked up here, since the card API is blocked from this machine. A code the app does not know falls back to the card's name.
- Grade check: list 132 (an N's Zoroark list in TCG Live spelling) grades 8.4, the same as the Limitless spelling. No other grade moved.

# RdyDeck 2.5.2 (build 75): daily deck changes, Upgrades keep the attacker, reprint check, {P} Energy names (12 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v75), CHANGES.md and puzzle/daily.json.

- Daily challenge: the deck changes each day. From #5 (13 Nov 2026) each day takes the next of 40 decks, the best placed list of each archetype in tests/grade-lists.json, then the Charizard ex Pidgeot ex list, and around again. Days before #5 keep the Charizard list. Home names today's deck. A game that runs past midnight keeps the deck and shuffle it was dealt.
- Upgrades never cut the deck's main attacker, the Pokemon it evolves from, or a Pokemon the deck's own name calls out, even when the deck matches the wrong archetype. Of the 130 top lists, two had such a swap before (Raging Bolt Ogerpon cut Raging Bolt ex, Festival Lead cut Dipplin); none do now. No other list's swaps changed.
- The grade line says what Fix first holds ("Fix first shows the one problem found") instead of "One change would make it stronger". When no one-card swap helps, Upgrades says what Fix first lists needs more than one card changed.
- Reprint check: a name with more than 250 printings on pokemontcg.io (Pikachu, say) is read page by page, up to 1,000, so a legal reprint past the first page counts. The TCGdex backup checks a Pokemon's 8 newest printings instead of 3, since newer ones can have other attacks. Old printings of legal reprints still count as legal.
- Energy written with a type symbol, the way Pokemon TCG Live exports it ("Telepathic {P} Energy"), now matches the played list, which spells the type out ("Telepathic Psychic Energy"). Before, the grade said no winning list runs it (19 of the 128 do) and took points off for each copy, and Upgrades could suggest cutting it. A viewer found this on a Psychic list with Legacy Energy. The Alakazam Dusknoir top list with its Telepathic Energy written as {P} graded 7.9 with that flag; it now grades 8.1, the same as written out.
- The "Worth fixing" and "Stops the deck" tags have a real space before them, so copied text no longer reads "runsWorth fixing".
- Daily puzzle: 125 new boards after the first 120, which stay exactly as they were. The pack now runs to 11 Jul 2027 (245 days, 35 whole weeks).
- No grade moved in the grade check.

# RdyDeck 2.5.1 (build 74): bug hunt fixes (12 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v74, cards.json and builder.json saved on install) and CHANGES.md.

Import and edit
- The line under the list says how many lines were not read, and turns red when a line was skipped or the count is off. Before, a skipped line vanished and the line stayed green.
- "x3 Ultra Ball" reads as 3 Ultra Ball. A "0 Ultra Ball" line counts as not read.
- A card read by its own set and number keeps its data when it sits under the wrong section header. Before, the header wiped the card data and the card counted as a Pokemon.

Grade
- Expanded decks no longer get the Standard "no winning list runs" Trainer cost. The draw check still applies to every format.
- A grade made before the Trainer data (builder.json) loaded is no longer reused after it loads.
- Fix first says "The problem that costs you the most" when there is one.

Grade history
- "Held at this grade until the list is legal" and the legality reason follow the rotation hold. Before, they followed the deck building rules check, so a real hold read as "card data read again".
- A change in the Trainer data reads as a results update.

Daily, builder, saved data
- A daily challenge that runs past midnight is scored to the day it was dealt. The Share buttons share the day you played.
- Update from the deck builder records an edit log version, clears old Hand, Goldfish and drill deals, and asks again under Against the meta when the list changed. A new deck from the builder starts its edit log.
- Deck builder card search works offline from the first visit: cards.json and builder.json are saved when the app installs.
- Saved data in a bad shape no longer stops home from drawing. Bad decks are dropped.
- Clear all data also clears the deck builder draft and the Against the meta picks.
- Deck builder counts say "1 card", not "1 cards".

# RdyDeck 2.5 (build 73): upgrade suggestions, matchup chart, grade history, Trainers count more (12 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v73), CHANGES.md, builder.json, builder-data.mjs, tests/grade-check.mjs and tests/grade-played.json.

Added
- Upgrade suggestions: under Fix first, up to 3 one-card swaps that raise the grade, each checked by grading the changed list, plus all of them together. Cards to add come from what the deck's top lists run.
- Matchup chart: the five most played decks, each marked Favored, Even or Unfavored from tournament results.
- Grade history: each saved deck keeps its past grades on the device, with why each one moved (your edit, new results or an app update).

Grade
- Each copy of a Trainer or Special Energy that none of the top lists in builder.json runs costs a little (capped), and those cards are labeled Weak. A list with fewer than 6 cards or Abilities that draw costs more. None of the 128 top lists moves. builder.json gains a played list for this, and the grade check pins it in tests/grade-played.json.
- Matching never picks the Other bucket, so a Mega Rayquaza list no longer shows as Other under Against the meta. Its grade already used Mega Rayquaza's results.

# RdyDeck 2.4.3 (build 72): grades always finish, home buttons fit, puzzle on desktop (12 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v72) and CHANGES.md.

- A grade never waits more than 6 seconds. After that it shows from what has loaded. Before, a home with several decks could sit at Grading for minutes, because card data is read one deck at a time and a deck with a card the APIs can't read asked for a fresh read on every visit.
- Only a deck whose saved card data is out of date waits for a new read. One with a few unreadable cards (a new promo, say) grades from what it has.
- The three home buttons wrap their labels with room at the edges at every width. On wide screens, Import a deck takes its own row in the right column.
- On wide screens the daily puzzle and the update note sit in the right column under the daily challenge. Before, they fell below every deck in the left column.
- The update note on home shows three short lines, with the rest in What's new.

# RdyDeck 2.4.2 (build 71): fixes from the 11 Nov evening audit (12 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v71), CHANGES.md, deck-grader.html, README.md, builder.json, build-cards.mjs, refresh-data.mjs, grade-results.md, puzzle/daily.json, puzzle/engine.js, puzzle/solver.js, puzzle/tools/make-daily.mjs, puzzle/test/screen.cjs, tests/grade-check.mjs, tests/grade-lists.json, tests/grade-baseline.json and .github/workflows/grade-check.yml.

Grade
- No grade shows until the card data, the reprint check and the tournament results have loaded, so a grade never changes after it paints. Home and the Grade tab say Grading until then.
- Old art counts: an older printing of a card stays Standard legal when a reprint with the same name (and, for a Pokemon, the same attacks and Abilities) is legal now. Only a card with no legal printing holds a deck at 4.9.
- An average tournament record now scores 8.0 on results, down from 8.5, so an average deck no longer reads as Tournament-ready on its record alone.
- When an edit takes out the Pokemon the deck picked under Against the meta is built on, the Grade tab asks which deck it is now. Until it is answered, the grade leaves results out.
- The sum under the grade adds up as written, the results line shows the win rate the score used and its date, and an archetype named for no Pokemon (Basic Box, Festival Lead) asks for its two most played Pokemon before a deck can borrow its results.
- "How the grade works" and the Deck Grader page describe the results part.
- Trainer labels: Iono and Judge count as draw, switch and recovery cards count as crowded past 4 and 3, Rare Candy needs the line's Basic, Radiant Pokemon count for Poke Pad, Jet Energy counts as switching, a card RdyDeck can't read gets no label, and the header counts a weak ACE SPEC.

Puzzle
- The game ends when either side takes its last Prize card; both at once is Sudden Death, not a win. An Energy RdyDeck can't read no longer counts as paid. The goal line keeps the starting Prize count.
- Boards from Nov 13 on were checked again: 8 that no longer worked and 21 surplus boards were replaced, and the week runs easy Monday and Tuesday, medium midweek, hard at the weekend. Nov 9 to 12 are unchanged.

Other
- The Goldfish summary scores the opening line picked on the Hand tab, with clearer captions.
- Dialogs are solid from their first frame, long names like Charmander fit a prize slot, and a stray marker at the bottom of the page is gone.
- The deck row's play button says Prizes.
- Deck builder: a meta deck's core keeps its usual counts, Add line tops up a line already started, and the Energy check reads each Pokemon's main attack.
- The Odds subtext and the Log a match Notes hint read clearly.

Checks
- grade-check grades each list twice, checks the sum under the grade, and adds two test lists: an illegal card (4.9) and an old printing with a legal reprint (graded as legal).
- Grades on the 128 top lists fall 0.1 to 0.3 from the new results midpoint; nothing else moved. Rank match with win rates: +0.79 all results (was +0.81), +0.49 since Delta Reign (was +0.48).
- CI runs the puzzle tests too.

# RdyDeck 2.4.1 (build 70): trainer fit labels (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v70) and CHANGES.md.

Grade
- A Trainers section on the Grade tab, ACE SPEC first. Each Trainer and Special Energy gets a label (Key, Good, Weak or Does nothing) and a one-line reason, read from its card text and the job it does in the list. Weak and Does nothing cards get a swap idea. It explains Synergy and does not change the grade.

Checks
- Checked on the 128 top lists: no grade moved. Labels on those lists are mostly Key and Good, with one Weak and no Does nothing.

# RdyDeck 2.4 (build 69): grades track tournament results (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v69), CHANGES.md, matchups.json, refresh-matchups.mjs, grade-results.md, tests/grade-check.mjs, tests/grade-baseline.json, tests/grade-matchups.json and .github/workflows/refresh-data.yml.

Grade
- Part of the grade comes from tournament results. When a deck plays the named Pokemon of an archetype in matchups.json, up to 60% of the grade comes from that archetype's online win rate and finishes, more as games add up, with games since the newest set counted three times. A list held at the legality cap, a broken list, Expanded and prerelease get none. The grade explanation says how much and why, and the deck picked under Against the meta is the one used.
- Setup speed counts draw engines: a Pokemon with a once-a-turn draw or search Ability adds up to 1 point, and a Stage 2 line whose middle stage draws every turn is no longer marked slow.
- Damage counts what the deck reaches in a normal game. A hit that needs a full Bench, many Energy or a condition counts at its midpoint, and the finding says so.
- matchups.json adds each deck's results since the newest set.

Checks
- The weekly data job writes grade-results.md: how well grades rank archetypes by online win rate, from cards alone and as shown.
- The grade check reads a pinned tests/grade-matchups.json, so the weekly refresh cannot move the baseline.
- Checked on the 128 top lists: grades now rank archetypes by win rate at +0.81 (Spearman), up from -0.10 in 2.3 (+0.21 from cards alone; the shown grade uses the same results, so that number flatters it). On results since Delta Reign only, a grade built from older results ranks archetypes better than cards alone (+0.33 against +0.18, 18 archetypes; data is still thin).
- Biggest moves: Alakazam Dusknoir 9.3 to 8.3, Ethan's Typhlosion 9.3 to 8.3, Greninja 9.1 to 8.4, Festival Lead 9.3 to 8.7, Mew Box 8.9 to 8.3, Mega Rayquaza 8.6 to 8.0; Lopunny Dudunsparce 6.9 to 7.8, Dragapult Dudunsparce 8.4 to 9.2, Crustle 8.3 to 9.0, Dragapult 8.4 to 9.0.

# RdyDeck 2.3 (build 68): daily puzzle, deck builder, MEP promo fix and a What's new log (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v68, adds the puzzle files, and builder.json and cards.json to the network-first data line), CHANGES.md, tests/grade-baseline.json, the puzzle folder (engine, solver, card reader, puzzle pack, tools and checks), and for the deck builder build-cards.mjs, builder-data.mjs, cards.json, builder.json, refresh-data.mjs and .github/workflows/refresh-data.yml.

Daily puzzle

- A Daily puzzle card on home, under the Daily challenge: one board a day, the same for everyone, from two top tournament lists. You can win this turn if you find the line.
- Every card can be tapped to read it. Plays you can't make right now are listed with the reason.
- Undo and Start over are free. Your first finished try is your score; looking at the answer first counts as a try.
- The number is your own: your first day played is your puzzle #1, then one more each day you play. The card shows how many you solved of how many you played, wins in a row and days in a row, all kept on this device. Share sends your number, result and streak; the board itself is the same for everyone that day.
- Strict: a line that draws, flips or uses a card you can't see never counts as a win, since it isn't sure.
- 120 boards made ahead of time and checked by the solver, easier early in the week and harder at the weekend. The pack starts on Monday 9 Nov 2026 (PUZZLE_EPOCH) so the week lines up: release night, Wednesday 11 Nov, opens board 3; the pack lasts until mid March.

Deck builder
- A new screen, Build a deck on home. Search every Standard legal card (cards.json, rebuilt weekly from pokemon-tcg-data).
- Start from a meta deck's core (cards at least 75% of its top lists run), a Pokémon's evolution line, a saved deck, a pasted list or nothing.
- Checks: 60 cards, 4 copies, 1 ACE SPEC, 1 Radiant, a Basic, evolution lines, Energy for the main attack.
- Suggestions come from builder.json, what each meta deck's top quarter of lists runs, rebuilt by the weekly refresh.
- Save and grade uses the same steps as Import, then opens the grade. The draft is kept on the device.

Fixes and the update log
- Fixed: a card whose printing is not in the card database yet (like MEP 38 Charmander) is shown as not confirmed instead of capping a legal deck at 4.9. Of the 128 top lists, only Mega Charizard X moves, 4.9 to 8.8.
- What's new: Settings has a What's new row with a short log of the latest update. Someone who used an older version also sees a small Updated card on home once; a new user never does. Edit WHATS_NEW in index.html each release: a 2.x release lists "Added:" and "Fixed:" lines, each with a short description, a 2.x.y release lists short items only.
- Version shown in the app is v2.3 (PT_VERSION), build 68 (PT_BUILD), matching the sw.js cache.

# RdyDeck 2.2 (build 67): why each grade is what it is, play rules in Hand and Goldfish, deck order on home, audit fixes, a grade check and the old address redirect (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v67), CHANGES.md, deck-grader.html, opening-odds.html, prize-trainer.html, rotation.html, terms.html, privacy.html, tests/ and .github/workflows/grade-check.yml, plus the audit fixes' files (404.html, offline.html, manifest.json, guide pages, sitemap.xml, update-sitemap.mjs, README.md, .github/workflows/refresh-data.yml).

Grade
- Synergy and Power each show why: the parts that make up the number and what moved it, so a 5.3 or an 8.6 can be read line by line.
- Card text that writes Energy as symbols (TCGdex uses {D} for Darkness and so on) is spelled out before grading. Before, the live app missed text like Munkidori's Adrena-Brain, which needs Darkness Energy, and flagged those Energy as doing nothing. Saved decks are read again once.
- Energy that a Supporter or Item needs (Crispin, an Energy search) counts as used, so a mixed Energy line that feeds a Trainer is not flagged.
- A multi-prize Pokemon kept for an Ability that draws, searches or speeds up Energy (Mega Kangaskhan ex in Slowking) is treated as an engine: one note on moving it out before it is Knocked Out, and a small prize cost, instead of a fix.
- The grade explanation says how the math works: Synergy times Power divided by 10, with the fit part of Synergy pulling the grade down only when the list is loose.
- A card named without a set that turns out not to be legal now caps the grade at 4.9 once the legality check has run, like any other card.
- One Rare Candy counts as half a way into a Stage 2, not none.
- Checked on the 128 top lists: Slowking lists go from 8.3 to 8.6.

Hand and Goldfish
- Cards can only be played the way their text allows: an attack or Tool that needs Energy says so, Jumbo Ice Cream needs its 3 Energy, and cards no longer go straight to the discard.
- Copies with the same name are numbered and show their Energy, Tool and the turn they came into play.
- In the Hand tab's Turn 1 line, a Basic can be tapped to set it up as Active or on the Bench.
- The odds tiles say which hands they cover: any opening hand, or this one.

Decks
- The Cards tab has an Edit list button.
- Each deck's menu on home has Move to the top, Move up, Move down and Move to the bottom. The order is kept on this device.
- With more than 8 decks, home shows the first 8 with Show all, plus a Find a deck box and a sort (Your order, Best grade, Name).

Audit fixes (branch audit-fixes)
- Tournament log: a best of three records prizes taken and given for each game, and the totals and averages count every game played ("10 taken, 8 given in 2 games"). Labels say "a game". A best of three saved before this counts its last game only.
- Prize games: a Session History row opens that game, with its score, time and prizes, and the notes on missed cards can be edited there. "Notes saved" shows under the note being typed and stays until the next keystroke.
- Layout: long card names like Lillie's Determination no longer break mid-word, time per guess stays on one row, and the prize result badge sits clear of the HP.
- Offline: the service worker no longer keeps error pages, keeps the guide pages, icons and data files for offline use, and blocks one more ad host. The offline page has an Open RdyDeck button. The manifest has an id (same app identity as before).
- Guide pages: register the service worker, link the manifest, and carry Twitter title and description tags. The 404 page's links also work on the GitHub Pages copy.
- Scripts: the sitemap script fails loudly instead of writing a bad sitemap (sitemap dates refreshed), the data refresh job pulls before it pushes, the README points at the right script path, and the deck cover picker handles quotes in names.

Release checks
- A grade check on GitHub Actions grades the 128 top lists on every push and fails if any grade moves, with the card data frozen so only a code change can move one. Run it by hand with `node tests/grade-check.mjs`.
- The old GitHub Pages address sends visitors to the same page on rdydeck.com (guide pages, Terms, Privacy and 404 at once; the app already did this for anyone with nothing saved). It keeps serving the files, since rdydeck.com reads them from there.

# RdyDeck 2.1.1 (build 66): Rare Candy needs the Basic (11 Nov 2026)

Changed files: index.html, sw.js (cache prize-trainer-v66), CHANGES.md.

Grade
- Rare Candy skips the Stage 1, never the Basic. When a Stage 2's Stage 1 is not in the list, the app now reads the Stage 1 card once (TCGdex first, then pokemontcg.io) to learn which Basic the line starts from. If that Basic is not in the list either, the Stage 2 is marked as never reaching the board, under Fix first, and it no longer counts as an attacker for Power.
- Saved decks are read again once to store that Basic.
- Checked on the 128 top 16 lists: no grade changes (every winning list runs its Basics). A random pile with Mega Meganium ex and Grand Tree but no Chikorita goes from 4.1 to 2.8.

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
