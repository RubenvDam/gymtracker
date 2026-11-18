# Gym Tracker

Personal gym tracker, installed on iPhone as a PWA. Read [docs/SPEC.md](docs/SPEC.md) before building features; it is the source of truth.

## Stack
Vite + React + TypeScript, Dexie (IndexedDB), vite-plugin-pwa. Hosted on a free static host (Cloudflare Pages or GitHub Pages).

## Conventions
- Offline-first, no backend. All persistence goes through Dexie in `src/db/`.
- Logged data (workouts, sets, bodyweight, templates) has a `profileId`; always filter by the active profile. The exercise library is shared across profiles.
- Exercise library seeds from `public/exercises.json` (built by `scripts/build-exercises.mjs` from free-exercise-db, Unlicense). Seeding never overwrites rows, so user edits survive. IndexedDB can't index booleans: don't add indexes on boolean fields.
- Weights in kg. Store durations in seconds. Number inputs are strings in state; parse with `parseNum` (accepts decimal comma).
- One unfinished workout (`finishedAt` unset) per profile. Prefill + double-progression logic lives in `suggestNext` (`src/db/workouts.ts`); only working sets count.
- Naming: code `Routine` = UI "workout" (preset); a profile's routines + `weeklyGoal`/`streakMin` = UI "regime"; code `Workout` = UI "session". Regime logic in `src/db/routines.ts` (`regimeGoals` gives defaults). No weekday scheduling: users choose a workout every time (`WorkoutChooser`).
- A routine slot's alternatives are separate exercises. `replaceExercise` (variant toggle and session "Replace") only works before a set is logged on that exercise; session edits never touch the preset.
- Adding library extras: edit `scripts/build-exercises.mjs`, regenerate `public/exercises.json`, and bump `LIBRARY_SENTINEL` in `src/db/db.ts` so existing installs pick them up. Template exercise ids must exist in the library.
- Lint rules reject setState-in-effect and `Date.now()` in render: mount time-driven components only while needed (see `RestTimer`).
- Mobile-first, one-handed, minimal taps; test at ~400px width.
- Keep components small; no new dependencies without a reason.

## Design system
- All colours are CSS tokens in `src/index.css`; never hard-code colours in components. Theme (`data-theme`) and accent (`data-accent`) are attributes on `<html>`, managed by `src/lib/theme.ts` and a pre-paint script in `index.html` (keep the two in sync).
- `--accent` may be a gradient (Aurora): use it only as `background`. Use `--accent-solid` for borders/controls and `--accent-text` for accent-coloured text.
- Building blocks: `PageHeader` (large title + profile avatar/switcher), `.card`, `.hero`, `.tiles/.tile`, `.group/.group-row` (grouped lists), `.btn` (+ `.secondary`, `.danger`, `.inline`), `.btn-text`, `.chip`, `.seg`, `.switch`, `Icon`.
- Use the accent sparingly: primary action, active state, highlights. Everything else neutral.
- Pluralise counts with `plural()`.

## Commands
- `npm run dev` – dev server (add `-- --host` to open it from a phone on the same Wi-Fi)
- `npm run build` – typecheck (`tsc -b`) + production build into `dist/`
- `npm run lint` – oxlint
- `npm run preview` – serve the production build (service worker only works here / when deployed)

Deploy: pushing to `main` triggers `.github/workflows/deploy.yml` (GitHub Pages). Vite `base` is `./` so it works under a repo subpath.

## Workflow
Build one milestone from SPEC.md at a time. Commit after each working feature.
