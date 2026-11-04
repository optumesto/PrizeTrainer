# PrizeTrainer v24: tour, Practice tab, starter decks, feedback, phone pass

Before: a new player landed on Home with the daily challenge above their decks, six deck tabs, and no guide. Several buttons were under 44px tall on phones, there was no way to report a bug, and you had to paste a list before you could play.

After: a short skippable tour on the first visit, decks first on Home, four deck tabs with Hand, Drills and Notes grouped under Practice, every control at least 44px on phones, a feedback button that opens a GitHub issue, and five current tournament lists you can load in one tap. Grading, odds and card grouping logic are untouched, and the look matches v20 to v23.

## First run tour
- Five short steps: what the prize drill is, adding a deck, playing, the deck tabs, the daily challenge and log. Back, Next, Skip, arrow keys and Escape all work.
- Shows once, on the first visit with no decks. Stored on the device (pt_tour_v24). It does not show when the app opens from a shared deck or daily challenge link.
- The last step offers Import a deck and Starter decks.
- People updating from v23 with decks already saved get a one time note that Hand, Drills and Notes moved to Practice, instead of the tour.
- Replay it any time from Help and feedback, or from How to play.

## Simpler navigation
- Deck tabs are now Cards, Grade, Odds and Practice. Practice has a switch for Hand, Drills and Notes and remembers the last one you used. Nothing was removed.
- Home now leads with your decks, then Import a deck and Starter decks side by side, then the daily challenge.
- More has four tiles: Tournament log, Share with a friend, Help and feedback, Backup and restore. Help and feedback holds the tour, How to play, Send feedback and Keyboard shortcuts.
- With no decks, Home says "Start with a prize game" so the core drill comes first.

## Phone pass
- Every button, toggle and field is at least 44px on touch screens and at widths up to 520px: header buttons, small buttons, the Modes options, the format toggle, the games count, energy chips, Clear all data, and the cover card button (its picture stays the same size, the tap area grew).
- Checked at 320, 360, 390 and 430px with no sideways scrolling.
- The Google Fonts stylesheet no longer blocks the first paint. The same fonts show once loaded.
- Card pictures in the Cards tab load as they scroll into view, which saves data on a phone.
- Speed with the phone CPU slowed 4x: the page was ready in about 0.22 to 0.36 seconds, opening a deck took about 12 ms, and switching tabs or starting a game took under 10 ms. The file is 437 KB, about 119 KB once GitHub Pages compresses it. I did not minify it, so it stays easy for you to edit.

## Feedback button
- Help and feedback, then Send feedback. Pick Bug, Missing card or Idea, type a note, and optionally tick "Include my list". It opens a new issue on github.com/optumesto/PrizeTrainer with the app version, screen and device filled in.
- No email address is in the app. Nothing is sent until the person presses Submit on GitHub, and they need a free GitHub account. This is the default; the address lives in one line (FEEDBACK_REPO) if you want it to point somewhere else, such as a form. If issues are turned off on the repo, turn them on in the repo settings.
- Typed text is cleaned (control and direction marks removed, length capped) and only ever goes into the link.

## Starter decks
- Five Standard lists, loaded through the normal import, so they behave like any pasted list and can be edited. The picker says "List as of 31 Oct 2026" and shows each finish.
- Dragapult ex: Andrew Hedrick, 1st, Regional Puebla, 24 Oct 2026. https://limitlesstcg.com/decks/list/29678
- Slowking: Aarni Karjala, 1st, Regional Gdańsk, 31 Oct 2026. https://limitlesstcg.com/decks/list/30165
- Team Rocket's Honchkrow: Finn Lasse Fries, 2nd, Regional Gdańsk, 31 Oct 2026. https://limitlesstcg.com/decks/list/28372 (Limitless shows one page per identical list; its header credits an earlier pilot)
- Alakazam Dudunsparce: Nathan Ginsburg, 3rd, Regional Puebla, 24 Oct 2026. https://limitlesstcg.com/decks/list/30794
- Crustle Kangaskhan: Miloslav Posledni, 4th, Regional Gdańsk, 31 Oct 2026. https://limitlesstcg.com/decks/list/31082
- Set codes are as Limitless shows them (for example 30C for Mew ex). Whether every card in these newer sets gets art and card data depends on the card database, the same as for any pasted list.

## Tested
- New feature run (v24): 132 of 132, three runs in a row. Covers the tour (first visit, steps, keys, Skip, not after reload, not from links, the update note, replay from Help and How to play), the Practice tab and switch at 320 to 430px, Home order, Help, feedback links (version, no email, deck only when ticked, script strings never run), all five starter lists parsing to 60 and loading, 44px controls on 17 screens and sheets at 360 and 430px with touch on, light theme, cache name, no dashes, and Grade and Odds rendering the same as v23.
- Existing feature run (38 checks): 38 of 38 at 390, 360 and 320px.
- The v23 feature run on v24: 90 of 92. The two misses are expected: the deck now has four tabs instead of six, and the cache name is prize-trainer-v24.
- The card database and card art cannot be reached from my test machine, so both were simulated (screenshots use stand-in art and fallback fonts). Not checked on a real phone.

## To install
Upload index.html and sw.js from this folder over the current ones (cache is prize-trainer-v24). Includes all v23 changes.
