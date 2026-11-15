# Building the RdyDeck Android app for Google Play

The Play app is a Trusted Web Activity (TWA): a small Android shell that opens https://rdydeck.com/?src=play full screen in Chrome. Site updates reach the app on their own; a new upload is only needed to change the shell (name, icon, colors, version).

Nothing in this folder is a key or a password. Never add a keystore, its passwords or signing-key-info.txt to this repo: it is public.

## Already in place (checked 15 Nov 2026)

- **manifest.json:** passes Bubblewrap's own check with no changes. Name and short name RdyDeck, 512 px icon, 512 px maskable icon (logo sits inside the safe circle), theme and background #131210, display standalone, scope the whole site.
- **.well-known/assetlinks.json:** live at rdydeck.com since 9 Nov. Google's Digital Asset Links API reads it correctly: package com.rdydeck.app, one SHA-256 fingerprint (DD:C1:74 ... 6F:DC). The Worker passes GitHub's application/json type through, so no hosting change is needed.
- **Play mode in the site:** the app is recognized by ?src=play or by its Android referrer, which hides ads and the Install button inside the app.

## Package name: com.rdydeck.app

Keep it. The site code, the live assetlinks.json and the key you saved on 9 Nov all use it, and it can never change once the app is published. A different name (for example com.optumeventures.rdydeck) would mean a new key, a new assetlinks entry and a code change.

## Step 1: check your saved key matches

Open signing-key-info.txt from the zip you saved on 9 Nov. Its SHA-256 should be the DD:C1:74 ... 6F:DC value above. If it matches, build with that key (below). If it does not, stop: the live assetlinks.json would need the new value.

## Step 2a: build with PWABuilder (what you used before)

1. Go to pwabuilder.com, enter https://rdydeck.com, then Package for stores, Android, Google Play, Options.
2. Fill in:
   - Package ID: com.rdydeck.app
   - App name: RdyDeck. Launcher name: RdyDeck
   - App version: 1.0.0. Version code: 1 (raise the code by 1 on every later upload)
   - Host: rdydeck.com. Start URL: /?src=play
   - Theme, background, nav and nav divider colors (light and dark): #131210
   - Display mode: standalone. Fallback: Custom Tabs
   - Notification delegation: off. Location delegation: off. Google Play billing: off
   - Signing key: Use mine. Upload your saved keystore, with its alias and both passwords from signing-key-info.txt
3. Download. From the zip you need app-release-bundle.aab (for Play) and app-release-signed.apk (to try on your phone). Ignore its assetlinks.json; the live one is already right.

If your 9 Nov download already has an .aab built with com.rdydeck.app and your saved key, you can upload that one instead of rebuilding.

## Step 2b: or build with Bubblewrap (command line)

Needs Node 18+, then Bubblewrap installs its own JDK and Android SDK on first run.

```
npm i -g @bubblewrap/cli
mkdir rdydeck-android
cd rdydeck-android
```

Copy play/twa-manifest.json from this repo into that folder, copy your saved keystore in as android.keystore, and set "alias" in twa-manifest.json to the alias in signing-key-info.txt. Then:

```
bubblewrap update --skipVersionUpgrade
bubblewrap build
```

It asks for the keystore and key passwords and writes app-release-bundle.aab and app-release-signed.apk. For later uploads, raise appVersionCode (or run bubblewrap update without the flag) and build again.

## Step 3: upload to Play Console

1. Create the app in Play Console (org account under Optume Ventures LLC), default language English.
2. Keep Play App Signing on (it is required for new apps) and let Google create the app signing key.
3. Upload app-release-bundle.aab to Internal testing first, add yourself as a tester and install it from the Play link.
4. Fill in the listing, Data safety and content rating from the listing draft.

## Step 4: add Google's fingerprint to assetlinks.json (required)

With Play App Signing, Google re-signs the app with its own key, so the installed app's fingerprint is not the DD:C1 one. Until Google's is added, the app opens with a browser address bar on top.

1. In Play Console: Test and release, App integrity, App signing. Copy the SHA-256 under "App signing key certificate".
2. Add it as a second entry in .well-known/assetlinks.json (keep the first one):

```
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.rdydeck.app",
    "sha256_cert_fingerprints": [
      "DD:C1:74:8B:9D:24:8A:B3:EF:C2:6A:E5:1C:C7:91:46:DC:37:B6:26:95:A3:BF:FA:02:E0:87:F0:CB:AA:6F:DC",
      "PASTE_THE_APP_SIGNING_SHA256_HERE"
    ]
  }
}]
```

The same page also shows a ready-made "Digital Asset Links JSON" you can compare against. With Bubblewrap, `bubblewrap fingerprint add <SHA-256>` then `bubblewrap fingerprint generateAssetLinks` writes the same file.

3. Push it, wait about 5 minutes for the site cache, then check https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://rdydeck.com&relation=delegate_permission/common.handle_all_urls lists both fingerprints.
4. Uninstall and reinstall the test app. It should open with no address bar.

Do not put a placeholder in the live file: only real fingerprints go in.

## Later: AdMob

A native app with AdMob can replace this one as an update to the same listing, as long as it keeps com.rdydeck.app and is uploaded with the same upload key. Keep the keystore backed up in two places.
