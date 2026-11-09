# RdyDeck

Grade your Pokémon TCG deck, then drill it. Free, offline, no account.
Live at https://rdydeck.com/

The app was called Prize Trainer before v37. The repo name, the saved deck storage and the offline cache names keep the old name on purpose: changing any of them would wipe saved decks or break installed copies. Since v41 the app lives at rdydeck.com (a Cloudflare Worker serves this repo there). The old address, https://optumesto.github.io/PrizeTrainer/, still works: players with saved decks see a banner that moves them over, and everyone else goes straight to rdydeck.com.

Unofficial fan-made app. Not affiliated with Nintendo or The Pokémon Company.

## What the repo should look like

```
PrizeTrainer/
  .github/workflows/refresh-data.yml   weekly job that refreshes data.json
  refresh-data.mjs                     the script that job runs first
  check-cards.mjs                      then this one: checks card facts in both card databases
  .github/workflows/watch-sets.yml     twice a day: moves the Prerelease section to the next set
  watch-sets.mjs                       the script it runs (whole card lists only, both databases must agree)
  set-watch.md                         what the set watch found last (the job writes it)
  index.html                           the app
  sw.js                                offline support (cache name shows the version)
  manifest.json                        name and icons for Install app
  data.json                            meta, starter decks, rotation, set codes, card fixes
  card-check.md                        the weekly card check report (the job writes it)
  terms.html, privacy.html             Terms of Service and Privacy Policy
  robots.txt, sitemap.xml              for search engines
  saira*.woff2                         the app's fonts (4 files)
  icon*.png, icon.svg, apple-touch-icon.png, og-image.png   icons and the share image
  .nojekyll                            tells GitHub Pages to serve files as they are
  CHANGES.md, README.md, LICENSE
```

Nothing else. In particular no `.txt` copies of these files: GitHub Pages ignores them.

## Set it up (GitHub website, about 10 minutes)

Do this on a computer if you can. Phones often save `.html` and `.js` files as `.txt`, which is why v33 never went live.

### 1. Delete the stray files

In the repo, open each of these, tap the **...** menu at the top right of the file, choose **Delete file**, then **Commit changes**:

- `index.txt`
- `sw.txt`
- `CHANGES.txt`
- `refresh-data.txt`
- `refresh-data.yml` (the one at the root; the new one goes in `.github/workflows/`)

### 2. Upload the new files

1. Unzip `prizetrainer-repo.zip`.
2. In the repo, **Add file**, then **Upload files**.
3. Drag in everything from the unzipped folder, folders included: `index.html`, `sw.js`, `data.json`, `manifest.json`, `CHANGES.md`, `README.md`, `.nojekyll`, and the `icons`, `scripts` and `.github` folders. Files with the same name are replaced.
4. **Commit changes.**

Folders and files whose names start with a dot are hidden on most computers. On a Mac press Cmd + Shift + . in Finder to show them; on Windows turn on View, Hidden items. If `.github` still will not upload, make it by hand: **Add file**, **Create new file**, type `.github/workflows/refresh-data.yml` as the name (the slashes make the folders), paste in that file's contents, and commit. Do the same for `scripts/refresh-data.mjs` if it is missing, and for `.nojekyll` (an empty file is fine).

### 3. Check the names

The repo's front page should match the layout above. Any file ending in `.txt` is wrong: open it, tap the pencil, fix the name in the box at the top, and commit.

### 4. Turn on the weekly job

1. **Settings**, then **Actions**, then **General**.
2. Under Actions permissions choose **Allow all actions and reusable workflows**.
3. Under Workflow permissions choose **Read and write permissions**, then **Save**.
4. Open the **Actions** tab. If it asks, tap the button to enable workflows.
5. Pick **Refresh data.json**, then **Run workflow**. It should finish with a green tick in about 3 to 5 minutes. It commits `data.json` and `card-check.md`.
6. Open `card-check.md` in the repo. Anything under "Needs a person to check the printed card" is a place where the two card databases disagree and the app could show something wrong. Check it against the card on Limitless and tell Claude what you find.

After that it runs every Monday at 09:17 UTC (4:17 AM New York time in winter). GitHub switches scheduled jobs off after 60 days with no activity in the repo. Since the job only commits when something changed, check the Actions tab now and then and tap **Enable workflow** if it shows as disabled.

### 5. Check GitHub Pages

**Settings**, then **Pages**: Source should be **Deploy from a branch**, branch **main**, folder **/ (root)**. It is already set up this way if the site works today.

### 6. Check the live version

Wait 1 to 3 minutes after the commit, then:

- Open https://rdydeck.com/sw.js and look for the newest `prize-trainer-v` number.
- Open the app, then **Help**. It should show the newest version number.
- On a phone where the app is installed, close it fully and open it twice. The first open fetches the new version; the second shows it.

## Rotation

When Pokémon announces the 2027 rotation (expected around January, H mark), edit the `rotation` block in `data.json` on GitHub: marks, dates, source link and `"announced": true`. No new app version is needed. The weekly job never changes rotation.

## Ads (later, only after AdSense approves the site)

- Fill in `PT_ADS` near the top of the v32 script block in `index.html` (search for `PT_ADS`): the publisher id and the ad unit ids for results, grade and home. Nothing shows and no ad code loads until then.
- The guide pages have their own two fill-ins at the top of `ads.js`: the same publisher id and the guide ad unit id.
- Keep Auto ads off in AdSense. Ads never show in the Play app (?src=play) or offline.
- AdSense gives you an `ads.txt` line. It must sit at the root of the domain. rdydeck.com serves this repo from its root, so `ads.txt` goes in this repo's top folder.

## Credits

Card data from TCGdex (MIT license) with pokemontcg.io as a backup. Decklists, meta and card images from Limitless TCG. Fonts: Saira and Saira Condensed by Omnibus-Type (SIL Open Font License 1.1). Pokémon, card names, card text and card images are trademarks and copyright of their respective owners.

Copyright 2026 Optume Ventures LLC. All rights reserved. See LICENSE.
