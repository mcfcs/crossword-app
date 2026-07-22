# Krosalita

Krosalita is a React + Vite app for generating, editing, and playing crossword puzzles from CSV word lists.

## Features

- **Generate mode**: build a crossword automatically from a word/clue dictionary
- **Create mode**: manually edit a grid, clues, and then auto-fill remaining slots
- **Play mode**: solve generated/imported puzzles with timer, auto-check, and reveal tools
- **Mobile-first solving**: NYT/LA Times-style clean UI, a grid that fits any screen width,
  an on-screen keyboard, and a sticky current-clue bar (‹ ›) — great on a phone
- **Installable app (PWA)**: "Add to Home Screen" for a standalone, offline-capable app
  (service worker + web manifest + icons). Tap **Install App** in the header when offered
- **Auto-save & resume**: an in-progress solve is saved locally and restored on reload
- **Today's Puzzle + streaks**: a deterministic daily puzzle with a solve-streak counter
- **AI clue assist (local Ollama)**: draft clues for a filled word using a model you host
  locally — nothing leaves your machine (see below)
- **Layout tools**: choose built-in layouts or create/edit custom symmetric layouts
- **Required words**: force specific words into puzzle generation (anchor or opportunistic)
- **Difficulty filters**: generate by target difficulty band (`easy` → `difficult`)
- **Dictionary manager**: add/edit/delete entries and export dictionary CSV
- **Import / export / share**:
  - export & import puzzle JSON (generate/create/play workflows)
  - download puzzle as an image with clue lists (and a clean print stylesheet)
  - **Share** a blank puzzle image via the Web Share API (falls back to a PNG download)
- **Tagalog mode**: switches to Tagalog crossword dataset (if available in `public/`)

## Install as an app

Krosalita is a PWA. Serve the production build over HTTPS (or `http://localhost`) and:

- **Android / Chrome / Edge**: use the **Install App** button in the header, or the browser's
  "Install app" menu item.
- **iOS / Safari**: Share → **Add to Home Screen**.

Once installed it launches full-screen, works offline, and resumes your last solve.

## Local AI clue assist (Ollama)

The app can call a locally-hosted [Ollama](https://ollama.com) server to draft crossword
clues while you build in **Create** mode. Everything runs on your machine.

1. Install a model, e.g. `ollama pull llama3.1`.
2. In the app header, open **AI** and enable it. Set the server URL
   (default `http://localhost:11434`) and pick a model, then **Test connection**.
3. In Create mode, select a fully-filled word and press **AI Clue** to get suggestions.

### Connection troubleshooting (incl. Tailscale)

The Settings dialog shows the exact origin to allow. In general, on the machine running Ollama:

- **Allow the web origin (CORS):** `OLLAMA_ORIGINS=http://localhost:7891` (or `*` while testing).
- **Expose it beyond localhost** (required to reach it from a phone or over Tailscale):
  `OLLAMA_HOST=0.0.0.0:11434`.
- Restart Ollama with those env vars set (they must be set for the `ollama serve` process).

**Over Tailscale:** if the browser and Ollama are on different devices, `localhost` points at the
*browser's* device. Set the app's Ollama URL to the **host's Tailscale address**, e.g.
`http://100.x.x.x:11434` (or its MagicDNS name), and include that same origin in `OLLAMA_ORIGINS`.

**Mixed content:** a site served over HTTPS cannot call an `http://` Ollama. Use the app over
HTTP (the dev/preview server is HTTP) or put Ollama behind HTTPS.

## Tech stack

- React 19
- Vite 7
- Tailwind CSS
- ESLint

## Getting started

From the repository root:

```bash
npm ci
npm run dev
```

Then open the local Vite URL (`http://localhost:7891`). The dev/preview server also
listens on your LAN / Tailscale address, so you can open it from a phone on the same tailnet.

## Available scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build locally
npm run lint     # run ESLint
```

## CSV dictionary format

Expected columns:

```csv
Date,Word,Clue,Difficulty
2026-01-01,APPLE,Common red fruit,EASY
```

Notes:

- Minimum required columns are `Date,Word,Clue`
- `Difficulty` is optional but used by difficulty filtering/scoring
- Words are normalized to uppercase A–Z characters

## Optional default datasets

If present in `public/`, the app auto-loads:

- `crosswords.csv` (default mode)
- `tagalogcrosswordfinal_test.csv` (Tagalog mode)

## Project structure

```text
src/
  App.jsx                  # main app state and generation logic
  components/              # UI views/modals (play, manual editor, layouts, dictionary)
  data/layouts.js          # built-in crossword layouts
  utils/crosswordUtils.js  # CSV parsing, slot detection, numbering, layout stats
tagalog-scraper/           # helper scripts/data for Tagalog word list prep
```
