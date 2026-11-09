# Prize Trainer

Grade your Pokémon TCG deck, then practice it. Free, offline, no account.
Live at https://optumesto.github.io/PrizeTrainer/

Unofficial fan-made app. Not affiliated with Nintendo or The Pokémon Company.

## What the repo should look like

```
PrizeTrainer/
  .github/workflows/refresh-data.yml   weekly job that refreshes data.json
  scripts/refresh-data.mjs             the script that job runs
  icons/                               app icons (9 files)
  .nojekyll                            tells GitHub Pages to serve files as they are
  index.html                           the app
  sw.js                                offline support (cache name shows the version)
  data.json                            meta, starter decks, rotation, set codes
  manifest.json                        name and icons for Install app
  CHANGES.md                           what changed in this version
  README.md                            this file
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
5. Pick **Refresh data.json**, then **Run workflow**. It should finish with a green tick in about a minute. It commits a new `data.json` only when the meta, starters or set codes changed.

After that it runs every Monday at 09:17 UTC (4:17 AM New York time in winter). GitHub switches scheduled jobs off after 60 days with no activity in the repo. Since the job only commits when something changed, check the Actions tab now and then and tap **Enable workflow** if it shows as disabled.

### 5. Check GitHub Pages

**Settings**, then **Pages**: Source should be **Deploy from a branch**, branch **main**, folder **/ (root)**. It is already set up this way if the site works today.

### 6. Check the live version

Wait 1 to 3 minutes after the commit, then:

- Open https://optumesto.github.io/PrizeTrainer/sw.js and look for `prize-trainer-v35`.
- Open the app, then **Help**. It should say **Prize Trainer v35**.
- On a phone where the app is installed, close it fully and open it twice. The first open fetches the new version; the second shows it.

## Rotation

When Pokémon announces the 2027 rotation (expected around January, H mark), edit the `rotation` block in `data.json` on GitHub: marks, dates, source link and `"announced": true`. No new app version is needed. The weekly job never changes rotation.

## Ads (later, only after AdSense approves the site)

- Fill in `PT_ADS` near the top of the v32 script block in `index.html` (search for `PT_ADS`). Nothing shows and no ad code loads until then.
- AdSense gives you an `ads.txt` line. It must sit at the root of the domain, so for `optumesto.github.io` it goes in a separate repo named `optumesto.github.io`, not in this one. A custom domain makes this simpler.

## Credits

Card data from TCGdex (MIT license) with pokemontcg.io as a backup. Decklists, meta and card images from Limitless TCG. Font: Inter (SIL Open Font License 1.1). Pokémon, card names, card text and card images are trademarks and copyright of their respective owners.
