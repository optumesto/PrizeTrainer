# Prize Trainer — PWA Deployment Guide

## What's in this package

```
prize-trainer-pwa/
├── index.html        ← Your app (updated for PWA)
├── manifest.json     ← Web app manifest (name, icons, theme)
├── sw.js             ← Service worker (offline support + installability)
├── icons/            ← App icons (72px to 512px + SVG)
│   ├── icon.svg
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── README.md         ← This file
```

## How to deploy (pick one)

### Option A: GitHub Pages (free, easiest)

1. Create a GitHub account if you don't have one
2. Create a new repository (e.g., `prize-trainer`)
3. Upload all files from this folder to the repo
4. Go to **Settings → Pages → Source** → select `main` branch
5. Your app is live at `https://yourusername.github.io/prize-trainer/`

### Option B: Netlify (free, drag & drop)

1. Go to [netlify.com](https://www.netlify.com/) and sign up
2. Drag and drop this entire folder onto the Netlify dashboard
3. Done — you'll get a URL like `https://prize-trainer.netlify.app`
4. You can set a custom domain in site settings

### Option C: Vercel (free)

1. Go to [vercel.com](https://vercel.com/) and sign up
2. Import your GitHub repo, or use `npx vercel` from the command line
3. Deployed automatically

### Option D: Any static hosting

Upload these files to any web server or static host. The only requirement
is that it's served over **HTTPS** (needed for service workers / PWA install).

## How users install the app

Once deployed, the app works on **every platform**:

| Platform          | How to install                                                  |
|-------------------|-----------------------------------------------------------------|
| **Android**       | Chrome shows "Add to Home Screen" banner automatically,         |
|                   | or tap ⋮ menu → "Install app"                                  |
| **iOS / iPadOS**  | Safari → Share button (□↑) → "Add to Home Screen"              |
| **Windows**       | Edge/Chrome → address bar install icon (⊕) → "Install"         |
| **macOS**         | Chrome → ⋮ menu → "Install Prize Trainer"                      |
| **Linux**         | Chrome/Edge → address bar install icon → "Install"              |
| **ChromeOS**      | Chrome → ⋮ menu → "Install app"                                |

The app also shows a gold **"📲 INSTALL APP"** button on the home screen
when the browser's install prompt is available (Android/desktop Chrome/Edge).

## Offline support

After the first visit, the service worker caches:
- The app shell (HTML, manifest, icons)
- Google Fonts
- Pokémon card images (cached after first load)

Users can play with previously loaded decks even without internet.

## Updating the app

To push an update:
1. Edit `index.html` with your changes
2. In `sw.js`, change `CACHE_NAME` from `'prize-trainer-v1'` to `'prize-trainer-v2'` (etc.)
3. Re-deploy — the service worker will automatically update on users' next visit

## Custom domain (optional)

All three free hosts (GitHub Pages, Netlify, Vercel) support custom domains.
Buy a domain from Namecheap, Cloudflare, Google Domains, etc., then follow
your host's DNS setup instructions.
