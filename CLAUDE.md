# Gym Tracker

Personal gym tracker, installed on iPhone as a PWA. Read [docs/SPEC.md](docs/SPEC.md) before building features; it is the source of truth.

## Stack
Vite + React + TypeScript, Dexie (IndexedDB), vite-plugin-pwa. Hosted on a free static host (Cloudflare Pages or GitHub Pages).

## Conventions
- Offline-first, no backend. All persistence goes through Dexie in `src/db/`.
- Logged data (workouts, sets, bodyweight, templates) has a `profileId`; always filter by the active profile. The exercise library is shared across profiles.
- Exercise library seeds from `public/exercises.json` (built by `scripts/build-exercises.mjs` from free-exercise-db, Unlicense). Seeding never overwrites rows, so user edits survive. IndexedDB can't index booleans: don't add indexes on boolean fields.
- Weights in kg. Store durations in seconds.
- Mobile-first, one-handed, minimal taps; test at ~400px width.
- Keep components small; no new dependencies without a reason.

## Commands
- `npm run dev` – dev server (add `-- --host` to open it from a phone on the same Wi-Fi)
- `npm run build` – typecheck (`tsc -b`) + production build into `dist/`
- `npm run lint` – oxlint
- `npm run preview` – serve the production build (service worker only works here / when deployed)

Deploy: pushing to `main` triggers `.github/workflows/deploy.yml` (GitHub Pages). Vite `base` is `./` so it works under a repo subpath.

## Workflow
Build one milestone from SPEC.md at a time. Commit after each working feature.
