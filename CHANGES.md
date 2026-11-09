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
- Install icons: the normal icons give the mark more room; separate maskable icons keep it inside the safe circle for Android's round and squircle masks. iPhone uses icons/apple-touch-icon.png (180 px).
- Google Play files are not part of the site: rdydeck-play-icon-512.png (512 px, 32 bit) and rdydeck-play-feature-graphic.png (1024 x 500) sit next to this zip in your files.
- RDY is red and DECK is white on dark (dark ink on light).
- The line under the name reads "Can Your Deck Win?" and sits exactly the width of RDYDECK, both edges lined up, on every screen size and in both themes. The logo stands as tall as the two lines together. The share image and the Play feature graphic use the same lockup.
- The moon button is now a Settings gear.

## One type system
- Light and dark used different fonts and corner sizes because an old rule set Inter for light mode only. Both themes now use the same fonts, sizes, weights and corners; only colors change.
- Two faces, picked from the font test (option 4): Saira for text and Saira Condensed for headings, labels and numbers. Both free under the SIL Open Font License; Credits lists them. The mono font is gone.
- The font files are now part of the app (fonts/), so they load the same on every device and work offline. Nothing loads from Google Fonts any more.
- To try other fonts later: add the new font files to fonts/ and change the font names in the "v38: one type system" block of index.html.

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
1. Use a new GitHub repo for rdydeck.com (for example "rdydeck") with these files, and set its Pages custom domain to rdydeck.com. GitHub writes a CNAME file for you. Point the domain's DNS at GitHub Pages (four A records and a www CNAME, listed on GitHub's "Managing a custom domain" page) and turn on Enforce HTTPS.
2. Do not set the custom domain on the PrizeTrainer repo. GitHub would then send optumesto.github.io/PrizeTrainer straight to rdydeck.com, and players would never get back to the old address to save their decks. Saved decks belong to one web address, so they do not move by themselves.
3. Keep the old PrizeTrainer address running for a while so players can open Save and open decks there, save a file, and open it on rdydeck.com.
4. rdydeck.app: forward it to https://rdydeck.com/ at your domain registrar (a permanent 301 forward).
5. After the site is live: add rdydeck.com to Google Search Console, submit https://rdydeck.com/sitemap.xml, and check the share card with a link preview tool.

## Terms and Privacy (drafts)
- terms.html and privacy.html match the app's look and are marked "Draft for attorney review". Every fact that is not known yet is a [bracketed] blank: dates, contact email, mailing address, county, liability cap, consent tool, opt out link and hosting.
- They cover: Optume Ventures LLC (Pennsylvania) as operator, no accounts, decks saved on the device, the services the app calls (card data, card pictures, ads, GitHub feedback), Google ads and cookies, the age question and how ads are tagged for children and teens, EEA and UK consent, US state opt out, the unofficial fan tool and trademark notice, and Google Play.
- Linked from Settings, Credits and legal, and the bottom of home.
- See rdydeck-v38-compliance-checklist.md for what has to happen before ads go live and before Google Play.
