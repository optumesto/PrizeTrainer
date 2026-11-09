# v40: fixes from Muse's audit (9 Nov 2026)

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

# v39: fixes from testing the live site

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

# v38: more room, one type system, settings, SEO, legal drafts and the Ready Check logo

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
