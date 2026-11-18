# Player-reported event results (3.4, branch player-results)

Players can share the result of an in-person event they played (League Challenge, League Cup, Regionals and up) from a deck's Grade history. The totals go into matchups.json as a third source, "Player-reported", counted at half the weight of Limitless results. Nothing is live: the button only shows when the Worker says the feature is on, and the weekly job only merges when a repo variable is on.

## What is built

| Part | File | What it does |
| --- | --- | --- |
| Share form | js/v81-player-results.js | "Share this result" on a grade history entry with an event record, when the list is still the one played and is 60 cards. Event type, date, player count, placing, deck (prefilled from the grade's match), each round's opponent deck and result, two check boxes (Masters with this exact list; my own result and correct). Shows exactly what is sent. 13 and older only (see Age). |
| Server | worker/player-results.js, wired in worker/rdydeck-worker.js | POST /api/results checks and stores one result. GET /api/results/summary gives totals only. GET /api/results/status tells the app whether to show the button. All three are 404 until PLAYER_RESULTS is "on". |
| Weekly merge | merge-player-results.mjs, step in .github/workflows/refresh-data.yml | Reads the summary, scales it to half weight, caps each deck at 25% of its Limitless games, and writes it as source "player". Runs after the grade scoreboard, so the public accuracy numbers stay Limitless only. With the variable off it takes any earlier player data out. |
| Label | js/matchups.js | The results line reads "How decks like this one did in N Limitless online tournaments and M player-reported events", adds "Player-reported results count half as much as Limitless results.", and the results picker lists "Player-reported" on its own. |
| Text | js/i18n.js, js/i18n-de.js, js/i18n-fr.js, js/i18n-it.js | Every new string in es, pt, fr, de, it, plus three older results picker strings that only show once there are two sources. |
| Tests | tests/i18n-check.mjs | Five new screens: the Share button, the form, and the results line with a player source, in all five languages. |

## Honesty checks (server)

- Masters only; dates within the last 45 days and not in the future; 4 to 5000 players; placing no larger than the player count.
- The deck must be a known archetype, and the 60 card list must play at least half of that archetype's core Pokemon (cards in 90% or more of its lists), so a result cannot be filed under a deck it was not played with.
- 3 rounds or more, and no more than the event size allows (about log2 of players plus a top cut; more for two-day events).
- A placing that cannot go with the record is refused (top 8 at 32 players or more with more losses than wins; first place with more than two losses).
- Card names are checked against a strict pattern; no free text is taken anywhere.
- One result per connection per event (same date and type), at most 3 a day per connection, at most 2,000 a day site wide, and the existing rate limit (10 a minute).
- Optional Cloudflare Turnstile check, only when its keys are set.
- A deck's totals are only published once it has 5 or more results. Mirror matches are left out, as in the Limitless numbers.

## Privacy

Stored per result: the RdyDeck version, event type, date, player count, placing, archetype, wins, losses, ties, the rounds (opponent archetype and result), the 60 card list (names and counts), the day it was sent, and a status.

Not stored: no name, no event name, no account, no device id, no IP address. The IP address is used for a moment for the rate limit, and turned into two salted one-way hashes (one per event, one per day) so the same connection cannot send the same event twice or more than 3 a day. Those hashes are wiped after 45 days. Results are deleted after 400 days.

Age: the button never shows for anyone who told RdyDeck they are under 13 or skipped the age question. Someone who never answered is asked the app's own neutral question ("How old are you?", no default) when they tap Share; under 13 or Skip hides the feature for good on that device. The Play app uses the same stored age group as its Instagram and YouTube screen.

## What Mason sets up (all in Cloudflare and GitHub, nothing done yet)

1. Deploy the Worker from the branch. It now imports a second file, so it has to go up with Wrangler (`npx wrangler deploy` in worker/, which bundles both) or the API as a two-module upload, not by pasting into the dashboard editor. Same D1 database (rdydeck-reports); the player_results table creates itself.
2. Worker, Settings, Variables and Secrets:
   - Secret RESULTS_SALT: a long random string (32 characters or more). Never shared.
   - Variable PLAYER_RESULTS = on. This is the switch; leave it off until the privacy policy below is live.
   - Optional: Turnstile. Make a widget for rdydeck.com in Cloudflare, Turnstile, then set secret TURNSTILE_SECRET and variable TURNSTILE_SITEKEY.
3. GitHub, the repo, Settings, Secrets and variables, Actions, Variables: PLAYER_RESULTS = on, so the weekly job merges the totals.
4. Merge the branch and push the app (version and build number to be set at that time).

## His calls before it goes on

- Weight: half of a Limitless result, capped at 25% of a deck's Limitless games. Lower or higher?
- Minimum results before a deck's totals show: 5.
- Masters only, or Seniors too (Juniors stays out).
- Keep the 60 card lists on the server (useful for later checks, never published), or drop them after the archetype check.
- Turnstile on from day one, or only if spam shows up.

## Privacy policy changes needed (draft, for privacy.html)

Short version, new bullet:
> If you choose to share an event result, RdyDeck sends us the event type, date and size, your placing, your deck's archetype and 60 card list, and each round's opponent archetype and result. It never asks for your name or the event's name. Sharing results is only offered to players 13 and older.

New section "Shared event results":
> When you tap Share this result and send it, RdyDeck sends rdydeck.com (our Cloudflare Worker) the RdyDeck version, the event type, date and number of players, your placing, the archetype of your deck, its 60 card list (card names and counts), and the opponent archetype and result of each round. There is no text box, and we never ask for your name, player ID or the event's name. We use these results, added together with other players' results and counted at half the weight of public tournament results, to make grades match real events. We publish only totals per archetype, and only once an archetype has at least 5 shared results. Cloudflare uses your IP address for a moment to stop anyone from sending too many results; we keep only a one-way code made from it, which cannot be turned back into your IP address, to stop the same result being sent twice, and we delete that code after 45 days. Shared results are deleted after 400 days. Sharing is optional, only offered to players who said they are 13 or older, and is not available to players under 13.

If Turnstile is turned on, also list it under "Information other services receive":
> Cloudflare Turnstile (challenges.cloudflare.com): checks that a shared result comes from a person, only when you send one. It receives your IP address and browser details, like any website you visit.

"Delete your data" page: add that a shared result cannot be found again by us (no name or device id is kept), so it cannot be deleted on request, and is deleted after 400 days. Worth a line in the attorney review already planned before ads.

## Play Data safety changes needed

- Data collected: App activity, "Other user-generated content" (the shared event result). Collected, not shared with third parties.
- Optional: yes (users choose to share). Not linked to the user's identity. Not used for tracking.
- Purpose: App functionality (grades) and Analytics (grade accuracy).
- Encrypted in transit: yes. Deletion: results are deleted automatically after 400 days; users cannot request deletion of one result because it holds nothing that identifies them.
- If Turnstile is on: no new data type (Cloudflare is a service provider for the request).
- Target audience answers stay as they are: the feature is off for under 13.
