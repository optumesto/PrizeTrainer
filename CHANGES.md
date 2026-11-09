# PrizeTrainer v34: audit of v33, full repo setup

## How to upload

See README.md, Set it up. v33 went up as `index.txt` and `sw.txt`, so the live site stayed on v26 until this upload.

## What v34 fixes

1. **Deck rules check in the grade.** The grade never checked the deck building rules, so a list with 5 Arven, 2 ACE SPEC cards or 61 cards graded like a legal one. A box at the top of Grade now names each rule the list breaks: exactly 60 cards, at most 4 with the same name (Basic Energy excepted), at most 1 ACE SPEC, at most 1 Radiant, at least 1 Basic Pokémon. The score is unchanged. All five starters and the daily deck pass.
2. **Home buttons cut off at 320 px.** "Starter decks" ran off the right edge on small phones. The two buttons now stack below 360 px wide.
3. **Ads could reach the art cache.** The page told the service worker to save any outside picture that loaded, and the worker saved it. An ad picture or tracking pixel would have been kept offline. Now only card art hosts (Limitless, pokemontcg.io, TCGdex) are saved, on both sides. Ads stay network only, as before.
4. **An error page could replace the saved app.** The worker saved the page even when the server answered with an error. It now keeps only a good answer.
5. **Delta Reign (DLR), out 6 Nov 2026,** added to the set codes (TCGdex id `me06`, inferred from me01 to me05; TCGdex refuses reads from here). Until then DLR cards were read by name only, so the exact printing could be wrong.
6. Weekly job moved to `.github/workflows/refresh-data.yml` and `scripts/refresh-data.mjs`, now on Node 22 and the current checkout and setup-node actions (Node 20 is past end of life).
7. `manifest.json`: description now says what the app does (grade, then practice).
8. `data.json`: date moved to 9 Nov 2026 and DLR added to `sets`. Starters and meta unchanged.

Cache is `prize-trainer-v34`. Card art stays on.

## Checked and current (9 Nov 2026)

- **Legal marks:** H, I and J. G left on 26 Mar 2026 (Live) and 10 Apr 2026 (events). The app matches.
- **2027 rotation:** not announced (CardJinx, 25 Oct 2026). The app's "H expected April 2027, not announced" stays right.
- **Newest set:** Delta Reign (DLR), 6 Nov 2026, J mark, tournament legal 20 Nov 2026 (one secondary site for the mark and the legal date). Next: Flowing Fists, reported for 5 Feb 2027, not official.
- **Bans:** none in Standard (secondary source). Diancie (SCR) had an errata before Worlds; the grade reads card text from TCGdex, so it may show the old wording.
- **Rules:** the Feb 2026 rulebook changes (0 allowed for "up to" in attacks, 6 prize tiebreaker games, end of round changes) do not touch anything the app models.
- **Meta:** data.json (online events, 8 Nov) leads with Dragapult ex, which matches the Regionals (Dragapult won Louisville and Puebla, Slowking won Gdańsk on 31 Oct). Basic Box and N's Zoroark are big at Regionals but not in the starters; the weekly job will refresh these once it runs.
- **APIs:** Limitless play API answered (8 Nov events). pokemontcg.io returned a server error once (it is deprecated). TCGdex refuses automated reads from here, so its answers are untested, as before.

## Tested

- New checks (18), all passing at 390, 360 and 320 px: version and cache, art cache keeps card art only (the real worker code run with stand-ins), error pages not saved, ads network only, home buttons fit, rules box shown once, right wording, no false flag on Basic Energy or a legal list, no Basic Pokémon flagged, DLR code, no dashes.
- Walk of every screen and sheet at 320 and 390: no page errors, no overflow apart from the game carousel (clipped on purpose).
- Offline: installs, reloads with no network, data.json from the saved copy.
- Old suites: A 16/16, B 19/19, C 17/17, v28 45/45, D 18/19 (known). v29, v31, v32, v33: every miss is only the version or cache name.
- Not tested: a real phone, live TCGdex, real AdSense.

Screenshots in `shots/`.

## Pinch zoom (your call, 9 Nov)
- Pinch zoom is on: the viewport tag no longer has maximum-scale or user-scalable=no.
- Text fields on phones (up to 820 px wide) are now at least 16 px, so iPhones do not zoom in by themselves when you tap a field. The deck list, feedback and backup boxes grow from 12 or 14 px to 16 px; nothing else changes.
- Checked at 390 and 320 px: every field is 16 px or more, and all v34 checks still pass.
