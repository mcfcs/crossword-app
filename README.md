# Krosalita

Krosalita is a React + Vite app for generating, editing, and playing crossword puzzles from CSV word lists.

## Features

- **Generate mode**: build a crossword automatically from a word/clue dictionary
- **Create mode**: manually edit a grid, clues, and then auto-fill remaining slots
- **Play mode**: solve generated/imported puzzles with timer, auto-check, and reveal tools
- **Layout tools**: choose built-in layouts or create/edit custom symmetric layouts
- **Required words**: force specific words into puzzle generation (anchor or opportunistic)
- **Difficulty filters**: generate by target difficulty band (`easy` → `difficult`)
- **Dictionary manager**: add/edit/delete entries and export dictionary CSV
- **Import/export**:
  - export puzzle JSON
  - import puzzle JSON (generate/create/play workflows)
  - download puzzle as an image with clue lists
- **Tagalog mode**: switches to Tagalog crossword dataset (if available in `public/`)

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

Then open the local Vite URL (usually `http://localhost:5173`).

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
