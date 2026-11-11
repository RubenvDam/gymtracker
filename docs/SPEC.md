# Gym Tracker – Spec

## Goal
A personal gym tracker, installed on iPhone as a PWA. Log sets fast at the gym, then see progression and which muscles are under-trained. Used by the owner and a workout buddy on the same phone.

## Principles
- Offline-first, all data on-device (IndexedDB). No backend, no accounts.
- Minimum taps to log a set. Prefill from last session.
- Units: kg.
- One-handed, mobile-first, dark mode friendly.
- Every record carries `profileId` so a real backend/login can be added later without a data-model change.

## Profiles
- Profile switcher ("You" / "Buddy"), separate history per profile.
- Export/import JSON backup per profile.

## Exercise library
- Seeded from the open `free-exercise-db` dataset (primary/secondary muscles, equipment, instructions).
- Custom exercises: name, log type, muscles.
- Each exercise has one **log type**:
  - `weight_reps` – weight (kg) × reps
  - `bodyweight_reps` – reps, optional added weight
  - `duration` – seconds, optional added weight (dead hangs, planks)
  - `assisted_reps` – assistance weight subtracts from bodyweight (optional, later)

## Workouts
- Session = date + ordered exercises, each with sets.
- Set: `type` (warmup | working), values per log type, optional RPE/RIR, optional note.
- Prefill weight/reps from the last session of the same exercise.
- Rest timer.

## Templates (upper/lower split)
- Upper A, Lower A, Upper B, Lower B (user-editable).
- Template exercise: target sets + rep range.
- Double progression hint: hit top of rep range on all sets → suggest +2.5 kg.

## Insights (later milestones)
- Weekly working sets per muscle vs 10–20 target; flag under-trained muscles.
- Body map (front/back) shaded by sets, per session and per week.
- Estimated 1RM trend (Epley), volume trend, PR badges.
- Push/pull and upper/lower balance.
- Extras: calendar heatmap, bodyweight log with trend, plate calculator.

## Data model (draft)
- Profile { id, name }
- Exercise { id, name, logType, primaryMuscles[], secondaryMuscles[], equipment, custom }
- Template { id, profileId, name, items[{ exerciseId, targetSets, repMin, repMax }] }
- Workout { id, profileId, date, templateId?, notes }
- SetEntry { id, workoutId, exerciseId, order, type, weightKg?, reps?, durationSec?, rpe?, note? }
- BodyweightEntry { id, profileId, date, kg }

## Milestones
1. Scaffold: git, docs, Vite+React+TS PWA, installable on iPhone, deployed.
2. Exercise library + profiles.
3. Workout logging (3 log types) + prefill.
4. Upper/lower templates.
5. History + export/import. ← first usable version
6. Insights: weekly sets per muscle + body map.
7. Progression charts and suggestions.

## Out of scope (for now)
Accounts/login, cloud sync, App Store distribution, Apple Health.
