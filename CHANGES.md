# v38: more room, one type system, settings, SEO and legal drafts

Changed files: index.html, sw.js (cache prize-trainer-v38), manifest.json, CHANGES.md.
New files: fonts/ (9 font files), terms.html, privacy.html, robots.txt, sitemap.xml, og-image.png.
Not changed: icons/, data.json, scripts/, .github/. The app icon stays as it is until a logo is picked.

## More room
- Home deck rows show the name, grade, format, card and game count, and the rotation line. Play and a menu button sit on the right.
- The Deck, Modes, Edit and Progress buttons, the average and best line, the recent score chips and the small cover card button moved into the menu (Grade, odds and cards; Prize game; Progress; Game modes; Edit the list; Cover card). Tapping a deck still opens its grade.
- The games played line under the header is one quiet line instead of boxes.
- On a computer: decks are one roomy column with Import, Starter decks, the daily challenge and More beside them. The page is capped at 1120 px wide (1280 px on very wide screens).
- Deck pages on a computer: tabs no longer stretch across the screen, Grade, Odds and Practice read in one column that lines up with the tabs, and the Prize game button sits at the right of the bottom bar.
- Checked on every tab (Grade, Odds, Cards, Hand, Drills, Notes and a prize game) at 320, 390, 900 and 1280 px, in dark and light.

## Header
- RDY is red and DECK is white on dark (dark ink on light).
- The line under the name reads "Can Your Deck Win?".
- The moon button is now a Settings gear.

## One type system
- Light and dark used different fonts and corner sizes because an old rule set Inter for light mode only. Both themes now use the same fonts, sizes, weights and corners; only colors change.
- Three faces: Barlow for text, Barlow Condensed for headings and numbers, IBM Plex Mono for counts and labels.
- The font files are now part of the app (fonts/), so they load the same on every device and work offline. Nothing loads from Google Fonts any more.
- To try other fonts later: add the new font files to fonts/ and change the three font names in the "v38: one type system" block of index.html.

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
