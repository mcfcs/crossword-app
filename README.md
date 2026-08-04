# Krosalita — Crossword Studio

Krosalita is a full-stack crossword studio: **generate** puzzles from a word list, **build** them by hand, **import** real published puzzles from crosswithfriends, and **play** them solo or with friends in real time — as a clean, installable web app. It started as a client-side generator and grew into a React + Vite front end backed by Vercel serverless functions and Supabase (Postgres · Auth · Realtime), with an optional local‑LLM clue assistant.

> Clean, NYT / LA Times–style solving UI · mobile‑first & installable (PWA) · real‑time multiplayer · zero paid dependencies to run locally.

---

## Highlights

**Create & generate**
- **Generate mode** — build a full crossword automatically from a word/clue dictionary (wave‑function‑collapse solver in a Web Worker so the UI stays smooth).
- **Create mode** — hand‑edit a grid + clues, auto‑fill the rest, force in required words, and target a difficulty band.
- **Rich clues** — `**bold**` / `*italic*` markup and symbols/accents render across play, create, mobile, and export.
- **AI clue assist (local, private)** — draft clues with a self‑hosted [Ollama](https://ollama.com) model; nothing leaves your machine.

**Play**
- **Clean solving UI** — NYT / LA Times palette (blue active word · yellow cell), a grid that fits any screen width, and legible correct/wrong/revealed states.
- **Mobile‑first** — on‑screen keyboard + sticky current‑clue bar; installable **PWA** ("Add to Home Screen") that works offline and resumes your last solve.
- **Solving tools** — pause the clock, one‑off **Check** cell/word/board (with confirmation), **Reveal**, a **smart cursor** (skips filled squares, jumps to the next empty clue), **rebus** entry, and a **clean‑solve** badge + confetti result card.
- **Circles & shades** — themed‑puzzle markings are preserved and rendered.
- **Today's Puzzle + streaks**, sound effects, share‑as‑image, and a print stylesheet.

**Import from crosswithfriends**
- Search the crosswithfriends catalogue and play any puzzle right in Krosalita — a serverless "middle‑man" that reproduces the site's Socket.IO fetch and normalises it into Krosalita's format (handy when the site misbehaves outside iOS).

**Multiplayer**
- **5‑digit lobby codes** and one‑tap **invite links** (auto‑join). Co‑solve any puzzle (generated, imported, or Tagalog) with live cursors, everyone's highlights shown in their colour, and a shared board.
- **Host controls** (auto‑check, reveal, check board, game mode) and two modes: cooperative solve or **points** (first correct letter scores).

**Profiles**
- Guest‑first: play/host/join with just a display name. Optional email + Google sign‑in to **save your created puzzles** and history across devices.

---

## Tech stack

- **Front end:** React 19, Vite 7, Tailwind CSS (no component library — a small hand‑built design system).
- **Solver:** custom wave‑function‑collapse fill running in a Web Worker.
- **Back end:** Vercel serverless (Node) functions for the crosswithfriends proxy (`socket.io-client`), and **Supabase** for Auth, Postgres, and Realtime (multiplayer + saved puzzles).
- **AI:** optional local Ollama over HTTP(S) — configurable, off by default.
- **PWA:** web manifest + service worker + generated icons.

### Architecture

```
Browser SPA (Vite/React, PWA)
   ├── /api/cwf/*   → Vercel serverless → crosswithfriends REST + downforacross Socket.IO
   ├── Supabase     → Auth · Postgres (games, players, profiles, puzzles) · Realtime
   └── Ollama       → local model over HTTP(S) (optional, private)
```

---

## Getting started

```bash
npm ci
npm run dev            # Vite dev server on http://localhost:7891
# or, to also run the /api serverless functions locally:
npx vercel dev
```

The dev/preview server also binds to your LAN / Tailscale address, so you can open it on a phone on the same network.

### Scripts

```bash
npm run dev       # dev server (7891)
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # ESLint
```

### Environment (optional — for multiplayer & profiles)

Copy `.env.example` → `.env` and add a [Supabase](https://supabase.com) project's keys:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor. Without these, the app still runs fully as a guest (generate / create / import / solo play); multiplayer and saved puzzles simply prompt you to configure Supabase. On the deployed site, set the same variables in Vercel → Project → Environment Variables and add your domain to Supabase → Auth → URL Configuration.

### AI clue assist (Ollama)

1. `ollama pull llama3.1`
2. In the header open **AI**, enable it, set the server URL (default `http://localhost:11434`), pick a model, **Test connection**.
3. In Create mode, select a filled word → **AI Clue**.

Reaching Ollama from another device / over Tailscale: run it with `OLLAMA_HOST=0.0.0.0:11434` and `OLLAMA_ORIGINS=<your app origin>`, and point the URL at the host's Tailscale address (the Settings dialog shows the exact origin to allow). For a deployed HTTPS site, expose Ollama over HTTPS via `tailscale serve`.

---

## CSV dictionary format

```csv
Date,Word,Clue,Difficulty
2026-01-01,APPLE,Common red fruit,EASY
```

`Date,Word,Clue` are required; `Difficulty` is optional (used for filtering/scoring). If present in `public/`, `crosswords.csv` (default) and `tagalogcrosswordfinal_test.csv` (Tagalog mode) auto‑load.

## Project structure

```text
api/cwf/            # Vercel serverless: crosswithfriends search + puzzle fetch/transform
src/
  App.jsx           # app state, generation, play logic
  components/       # views & modals (Play, Create, Browse, Multiplayer, Auth, …)
  multiplayer/      # Supabase Realtime client + state-adapter hook
  lib/              # supabase client, api client, saved-puzzles
  utils/            # solver, grid utils, sound, confetti, rich text, storage
  worker/           # Web Worker solver
supabase/migrations # Postgres schema + RLS
```

---

## Notes

Puzzle imports are for personal, on‑demand use; published crosswords are the copyright of their respective publishers. Krosalita doesn't cache or redistribute them.

*Built with React, Vite, Tailwind, Supabase, and Vercel.*
