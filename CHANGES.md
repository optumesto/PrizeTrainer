# PrizeTrainer v30: backup card source, live data file, weekly refresh

Upload `index.html`, `sw.js` and the new `data.json` to the root of the repo, next to index.html (cache is prize-trainer-v30). Then add the weekly job with the steps below. Builds on v29, so it includes every v29 change.

## 1. Backup card source (TCGdex)

- pokemontcg.io is still read first. Any card it can't read, because it hasn't added a new set yet or a request failed, is then read from TCGdex (api.tcgdex.net), a free open card database.
- It reads the exact printing when it knows the set, and the newest printing by name when it doesn't (marked "read from another printing", as v29 already does).
- TCGdex cards are turned into the same shape, so grade, odds and rotation read them the same way. A test deck graded the same with either source.
- Card data is still saved with the deck, so offline works as before. Offline, TCGdex is not asked. When both sources fail, a saved deck keeps its old card data.
- The grade says when cards came from the backup ("1 card was read from TCGdex, the backup card database, because the main one did not have it yet.").
- Polite use: 4 requests at a time at most, 40 cards per read at most, one retry.
- Not changed: the rotation tracker's reprint check still asks pokemontcg.io only.

## 2. Live data file (data.json)

- Starter decks, the current meta and rotation now also come from `data.json` next to the page. The copy built into the page is the fallback.
- Every field is checked before use: 60 card lists, dates, marks, links only to Limitless, Pokémon, CardJinx, Bulbapedia or TCGdex, no markup. A broken or older file is ignored and the app keeps what it had.
- The last good file is saved on the phone, so it works with no signal.
- Help shows "Data as of 8 Nov 2026, updated weekly", or "built into this version" when it is using the fallback.
- The starter picker now shows **Most played right now** (top decks and share), with its source and date.
- Match log and matchup notes suggest the current meta decks as opponents.
- `sw.js` now fetches data.json fresh each time and uses the saved copy only offline.
- When Pokémon announces the 2027 rotation, edit the `rotation` block in data.json on GitHub (marks, dates, source, `"announced": true`). No new app version is needed.

## 3. Weekly refresh (GitHub Action)

The job runs every Monday. It updates the meta and starter decks from Limitless and new set codes from TCGdex, and commits data.json only when something changed. It never touches rotation.

To add it, on github.com in the PrizeTrainer repo:

1. Tap **Add file**, then **Create new file**. Name it `.github/workflows/refresh-data.yml` (typing the slashes makes the folders). Paste in `github-action/refresh-data.yml`. Commit.
2. Again **Add file**, **Create new file**. Name it `scripts/refresh-data.mjs`. Paste in `github-action/refresh-data.mjs`. Commit.
3. Open the **Actions** tab, pick **Refresh data.json**, tap **Run workflow** to try it once now.
4. If it fails at "git push" with a permission error: **Settings**, **Actions**, **General**, **Workflow permissions**, choose **Read and write permissions**, save, and run it again.
5. A few minutes after a run that changed something, open optumesto.github.io/PrizeTrainer/data.json and check the `asOf` date.

## Sources and their terms (read 8 Nov 2026)

| Source | Used for | Terms | Limits |
|---|---|---|---|
| Limitless play API (play.limitlesstcg.com/api) | Meta share, starter decks | Docs: "you do NOT need an API key". No scraping or API clause in their terms; robots.txt blocks nothing | Rate limits apply, numbers not published. The job makes about 11 requests a week, one at a time with a pause, and stops on a 429 |
| TCGdex (api.tcgdex.net) | Backup card data, new set codes | MIT license, no key. FAQ: no hard rate limits, "please be considerate" | App: 4 at a time. Job: about 11 requests a week |

## Things to know

- **Starter decks will change source.** The Limitless API only covers online tournaments, not Regionals (Regionals have no API, only web pages). After the first weekly run, starters become the best finish for each top deck at the biggest online events of the last two weeks, labeled like "Big Cup (210 players, online)". If you'd rather keep Regionals lists, say so and I'll make the job leave starters alone.
- The meta in today's data.json is Limitless's online meta page for the current format (Dragapult ex 11.32%, Basic Box 5.46%, N's Zoroark 4.93%, Dhelmise 4.84%, Slowking 4.75%).
- TCGdex lags on brand new sets too: Delta Reign (out 6 Nov 2026) was not in its source files yet on 8 Nov. The backup helps most in the weeks when one database has a set and the other doesn't.
- Limitless offers a free API key to public projects for higher limits. Not needed at this volume.

## Tested

- New checks (55): data file loads, Help date, meta in the picker, newer file replaces starters, meta and rotation, rotation "Announced" from the file shows on the grade, saved copy used with no data.json, older and broken files ignored, 13 field checks (markup, bad links, wrong card counts, bad marks, duplicate ids), meta in opponent suggestions, set code mapping, Mega ex, ACE SPEC, Tool, Supporter and Energy from TCGdex, missing card read from TCGdex with the same grade, unknown set read by name with newest printing, set code from data.json reads the exact card, main source down, both down, offline, service worker rule, screen width. 55 of 55 at 390, 360 and 320 px.
- Existing checks: A 16/16, B 19/19, C 17/17, v28 45/45, regression 38/38, v29 44/45 (the one miss is the check that the version says v29), D 18/19 (same expected miss as v27 to v29). All three widths.
- The weekly script was run against made-up Limitless and TCGdex answers: good data, a rate limit and junk. Junk changed nothing; a rate limit kept the old meta and starters; a 61 card list was skipped.
- No en or em dashes. Light and dark checked.

## Not verified

- **No live TCGdex or Limitless answer could be read from here** (this environment blocks both APIs). The TCGdex card shape comes from TCGdex's own type definitions and card source files; the Limitless shapes come from their docs and a sample their docs page returned. Worth one tap on your phone after upload: open a deck and check the grade, and run the workflow once.
- Two TCGdex details are inferred: basic energy card numbers are three digits (sve-002), and an ACE SPEC card's rarity contains "ACE SPEC". If either is wrong, those few cards fall back to a name lookup, which still works.
- Whether GitHub Pages republishes after a commit made by the workflow. Step 5 above checks it. If data.json does not update, tell me and I'll add a deploy step.
- Whether TCGdex allows requests from a web page (CORS). Its docs don't say. If it doesn't, the backup simply finds nothing and the app works as v29 did.
