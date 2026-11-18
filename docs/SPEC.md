# Gym Tracker – Spec

## Vision: the best gym buddy
1. **Effortless logging.** Pop it open between sets and log in seconds. Spontaneous sets and planned routines are equally easy.
2. **Accountability.** Knows your plan, shows what's due today and how your week is going, without nagging.
3. **Visible progress (just as important).** Motivates you to keep going: "your bench press is up 10 kg", personal bests, achievements, insights, body progress.

Every feature should serve one of these three. Long term (not now): import from InBody, Garmin, Apple Health; keep the data model open to external measurement sources.

## Goal
A personal gym tracker, installed on iPhone as a PWA. Log sets fast at the gym, then see progression and which muscles are under-trained. Used by the owner and a workout buddy on the same phone.

## Navigation
- **Today**: week strip, choose a workout or quick log (or continue the running session), weekly goal + streak.
- **Log**: same chooser + recent sessions; the active session screen.
- **Progress**: personal bests, "since you started" deltas; later insights, body map, charts, achievements.
- **Profile**: regime (preset workouts + weekly goal), body metrics, exercise library, profiles, appearance settings.

## Principles
- Offline-first, all data on-device (IndexedDB). No backend, no accounts.
- Minimum taps to log a set. Prefill from last session.
- Units: kg.
- One-handed, mobile-first, dark mode friendly.
- Logged data carries `profileId` so a real backend/login can be added later without a data-model change.

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
- Rest timer: optional. Off by default; toggle to auto-start after each logged set, or start manually. Duration selectable (1–5 min), settings remembered.
- Input: typed numbers plus ± buttons (2.5 kg, 1 rep, 5 s). Decimal comma accepted.

## Regime: structure on top of free logging
Terminology: **workout** = a preset (e.g. "Lower A"); **regime** = a profile's set of workouts + weekly goal; **session** = what you log on a day.

Principle: flexibility. Not tied to weekdays; the user **chooses every time** what to train. Some weeks you get 3 of 4 in, and that's fine.

- **Regime** (Profile → Regime): preset workouts + **weekly goal** (sessions per week) + **streak minimum** (a week with at least this many sessions keeps the streak). Template default: goal 4, streak from 3.
- **Workouts**: name, free-text label (suggestions: Strength, Volume, Endurance, Deload), items. Item: exercise, target sets, rep range (or seconds), optional note. New items default by label (strength ≈ 4 × 4–6, otherwise 3 × 8–12).
- **Alternatives (variants)** per item, e.g. machine / dumbbell / cable. Each variant is its own exercise with its own history and prefill; while logging, a toggle switches variant (locked once a set is logged). Starting a workout picks the variant used most recently.
- Template "Upper / Lower · 4 a week" (`src/db/templates.ts`) holds the owner's four workouts; any profile can apply it.
- **Choosing** (Today and Log): a card listing all workouts, nothing pre-selected. Workouts done this week show a tick with the day. Plus **Quick log** (pick exercises yourself). Shows "x / goal this week · n to go".
- **During a session**: preset exercises preloaded with targets; add, remove and **replace** exercises freely (replace until a set is logged). Session edits never change the preset.
- **Accountability**: "This week x / goal" tile and a **streak** of consecutive weeks reaching the streak minimum. The current week doesn't break the streak until it's over; a short week is shown neutrally, never as failure.
- **Progression hints** (double progression): last session hit the top of the rep range on all target sets at the same weight → prefill weight + step at the bottom of the range, with a hint. Step: +5 kg for barbell/machine quad/hamstring/glute work, +2.5 kg otherwise. Applies to weight × reps and bodyweight + added kg; not to durations.
- Regimes are per profile. "Copy {name}'s regime" so a buddy following the same plan sets up in one tap.
- Later: month calendar/history view; multiple regimes (switch programme); mesocycles / deload weeks.

## Profile metrics
- Fixed: birth date (→ age), height, optional sex (only for strength standards).
- Tracked over time: bodyweight (log + trend).
- Derived: BMI (shown, not headlined), estimated 1RM per main lift, **relative strength** (e1RM ÷ bodyweight), max pull-up reps, max dead hang.
- Later: waist, body fat %, resting HR, custom benchmarks (e.g. 5k time).

## Design
- Inspired by fintech apps like Revolut (feel only, no copied branding): neutral greys, lots of whitespace, big bold numbers, rounded cards, pill buttons, stat tiles with sparklines, short copy.
- One saturated accent used sparingly against neutrals (contrast + isolation draws the eye).
- Appearance is a setting (Profile → Appearance): theme Light / Dark / System, accent Electric / Volt / Ember / Aurora. **Default: Light + Aurora.** Stored per device.
- System font (SF Pro on iPhone).

## Insights (later milestones)
- Weekly working sets per muscle vs 10–20 target; flag under-trained muscles.
- Body map (front/back) shaded by sets, per session and per week.
- Estimated 1RM trend (Epley), volume trend, PR badges.
- Push/pull and upper/lower balance.
- Extras: calendar heatmap, bodyweight log with trend, plate calculator.

## Data model (draft)
- Profile { id, name, weeklyGoal?, streakMin?, birthDate?, heightCm?, sex? }
- Exercise { id, name, logType, primaryMuscles[], secondaryMuscles[], equipment, custom }
- Routine (UI: "workout" preset) { id, profileId, name, label, createdAt, items[{ key, exerciseIds[] (first = default, rest = alternatives), sets, repMin, repMax, note? }] }
- Workout (UI: "session") { id, profileId, name, startedAt, finishedAt?, exerciseIds[], routineId? } (finishedAt unset = in progress; one per profile)
- (v4 had Profile.schedule = weekday plan; migrated in v5 to weeklyGoal = number of planned days, streakMin = min(3, goal).)
- SetEntry { id, workoutId, profileId, exerciseId, order, type, weightKg?, reps?, durationSec?, completedAt, rpe?, note? }
- BodyweightEntry { id, profileId, date, kg }

## Milestones
1. Scaffold: git, docs, Vite+React+TS PWA, installable on iPhone, deployed. ✅ done
2. Exercise library + profiles. ✅ done
3. Workout logging (3 log types) + prefill. ✅ done
4. Design system + restyle + new navigation (Today · Log · Progress · Profile) + appearance settings + first personal-bests view. ✅ done
5. Regime (built under Profile): preset workouts with label, alternatives, weekly goal + streak, choose-every-time on Today/Log, session edits (add/remove/replace), progression hints, copy regime. ✅ done (month calendar view still open)
6. Profile metrics: baseline, bodyweight log, BMI, relative strength.
7. History + export/import.
8. Insights: weekly sets per muscle + body map.
9. Progression charts.

## Out of scope (for now)
Accounts/login, cloud sync, App Store distribution, Apple Health.
