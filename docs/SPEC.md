# Gym Tracker – Spec

## Vision: the best gym buddy
1. **Effortless logging.** Pop it open between sets and log in seconds. Spontaneous sets and planned routines are equally easy.
2. **Accountability.** Knows your plan, shows what's due today and how your week is going, without nagging.
3. **Visible progress (just as important).** Motivates you to keep going: "your bench press is up 10 kg", personal bests, achievements, insights, body progress.

Every feature should serve one of these three. Long term (not now): import from InBody, Garmin, Apple Health; keep the data model open to external measurement sources.

## Goal
A personal gym tracker, installed on iPhone as a PWA. Log sets fast at the gym, then see progression and which muscles are under-trained. Used by the owner and a workout buddy on the same phone.

## Navigation
- **Today**: week strip, today's planned session (when a plan exists), start/continue, weekly stats.
- **Log**: quick workout or (later) start from a preset routine; active workout screen.
- **Progress**: personal bests, "since you started" deltas; later insights, body map, charts, achievements.
- **Profile**: routines + weekly schedule (plan builder), body metrics, exercise library, profiles, appearance settings.

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

## Plans: structure on top of free logging
Principle: the plan is a suggestion layer, never a gate. Quick (unplanned) workouts are first-class and count toward all insights.

- **Session templates** per profile, e.g. "Upper – Strength", "Upper – Volume", "Lower – Strength", "Lower – Volume". Exercises usually differ between strength and volume days.
- Each template has a **focus**: `strength` (heavy, low reps, long rest) or `volume` (moderate/high reps). Focus sets defaults for new items (strength ≈ 4 × 4–6, 3 min rest; volume ≈ 3 × 8–12, 90 s rest), all editable.
- Template item: exercise, target sets, rep range (or duration range), optional note, optional rest override.
- **Alternatives (variants)** per item, e.g. machine / dumbbell / cable. Each variant is its own exercise with its own history and prefill; while logging, a toggle switches variant (locked once a set is logged). Starting a routine picks the variant used most recently.
- Template "Upper / Lower · 4 days" (`src/db/templates.ts`) holds the owner's plan; any profile can apply it.
- **Weekly schedule** on fixed weekdays (e.g. Mon Upper-S, Tue Lower-S, Thu Upper-V, Fri Lower-V). Missed sessions are never punished: "move to today" or skip.
- **Built in Profile** ("Routines & weekly plan"): create routines, give them a name and label (e.g. focus), assign to weekdays.
- **Calendar**: week strip on Today + month view; shows planned, done, missed and unplanned workouts.
- **Today screen**: aligned to the schedule: today's planned session → Start; always a "Quick log" alternative. A quick workout can be linked to a planned session afterwards.
- **Log**: pick one of your preset routines, or quick log.
- Starting from a template preloads exercises with targets shown per set.
- **Progression hints** (double progression): last session hit the top of the rep range on all target sets at the same weight → prefill weight + step at the bottom of the range, with a hint. Step: +5 kg for barbell/machine quad/hamstring/glute work, +2.5 kg otherwise. Applies to weight × reps and bodyweight + added kg; not to durations.
- Plans are per profile. "Copy plan from another profile" so a buddy following the same plan sets up in one tap.
- Later: mesocycles / deload weeks (model must not block this).

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
- Profile { id, name, birthDate?, heightCm?, sex? }
- Exercise { id, name, logType, primaryMuscles[], secondaryMuscles[], equipment, custom }
- Routine { id, profileId, name, label, createdAt, items[{ key, exerciseIds[] (first = default, rest = alternatives), sets, repMin, repMax, note? }] }
- Profile.schedule: (routineId | null)[7], Monday first
- Workout { id, profileId, name, startedAt, finishedAt?, exerciseIds[], routineId? } (finishedAt unset = in progress; one per profile)
- SetEntry { id, workoutId, profileId, exerciseId, order, type, weightKg?, reps?, durationSec?, completedAt, rpe?, note? }
- BodyweightEntry { id, profileId, date, kg }

## Milestones
1. Scaffold: git, docs, Vite+React+TS PWA, installable on iPhone, deployed. ✅ done
2. Exercise library + profiles. ✅ done
3. Workout logging (3 log types) + prefill. ✅ done
4. Design system + restyle + new navigation (Today · Log · Progress · Profile) + appearance settings + first personal-bests view. ✅ done
5. Plans (built under Profile): routines with label/focus, weekly schedule, calendar, start from routine in Log, Today aligned to schedule, progression hints, copy plan. ✅ done (month calendar view and "move missed session to today" still open)
6. Profile metrics: baseline, bodyweight log, BMI, relative strength.
7. History + export/import.
8. Insights: weekly sets per muscle + body map.
9. Progression charts.

## Out of scope (for now)
Accounts/login, cloud sync, App Store distribution, Apple Health.
