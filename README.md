# Math World

A complete, **fully offline** mathematics learning, practice, brain-training and
competitive-exam platform for Android and iOS. No backend, no account, no
internet, no data leaves the device — and the architecture is ready for a
backend to be added later without a rewrite.

Built with Expo (SDK 57) + React Native + TypeScript + SQLite + Zustand.

---

## Quick start

```bash
npm install
npm start            # Expo dev server
npm run android      # or: npm run ios / npm run web
```

Verification:

```bash
npm run typecheck        # tsc --noEmit
npm run validate:content # content + generator validation (spec §51)
npm test                 # 682 tests across engine + UI
npm run check            # all three
```

---

## Architecture

The single most important rule: **the UI never talks to SQLite.**

```
UI (features/)
  ↓
Use cases / services (domain/services)
  ↓
Domain interfaces (domain/repositories)
  ↓
Repository implementations (data/repositories/local)
  ↓
SqlDatabase adapter (data/database/sqlite)
  ↓
SQLite
```

A concrete path through the layers:

```
PracticeRunScreen
  → PracticeService.getPracticeQuestions()
  → QuestionRepository (interface)
  → LocalQuestionRepository
  → SqlDatabase
  → SQLite
```

The domain layer knows nothing about SQLite, REST, Axios, Firebase, Supabase or
any other storage technology. Version 1 binds the interfaces to `Local*`
implementations in one place — `createLocalRepositories()` — so a future
`Api*Repository` can be swapped in without touching a screen or a use case.

### Directory map

```
src/
├── app/            navigation, providers, boot sequence
├── features/       one folder per feature, screens only
├── domain/         models, repository interfaces, services (use cases), rules
├── data/           SQLite adapter, migrations, seeding, repositories, content
├── core/           math engine, question engine, adaptive learning, SR, utils
├── store/          Zustand slices (session + UI state only)
├── ui/             theme tokens and the shared component library
└── i18n/           bn (primary) + en dictionaries
```

### Why the layers are split this way

- **`core/` is pure TypeScript.** No React, no storage, no platform APIs. It is
  therefore unit-testable in plain Node, which is why the math and question
  engines have the heaviest test coverage in the project.
- **`data/` owns every SQL string.** Repositories map rows to domain models;
  nothing above them sees a column name.
- **Content is separate from user data.** Re-seeding a content pack can never
  touch a row of user progress, and migrations are append-only.

---

## The Math Engine

Deterministic, dependency-free, and the only place a mathematical result is ever
computed (`src/core/math/`).

| Module | Responsibility |
| --- | --- |
| `fraction.ts` | Exact rational arithmetic — `1/3 + 1/6` is exactly `1/2` |
| `numberTheory.ts` | Primes, factorisation, HCF/LCM, combinatorics, modular arithmetic |
| `expression.ts` | Tokeniser + precedence-climbing parser, implicit multiplication |
| `polynomial.ts` | Expansion, roots (exact ≤ 2, Durand-Kerner above), deflation |
| `equation.ts` | Linear, quadratic, higher-degree and linear systems, with steps |
| `geometry.ts` / `trigonometry.ts` | Areas, volumes, Pythagoras, laws of sines/cosines |
| `statistics.ts` / `probability.ts` | Summaries, regression, distributions, lab simulations |
| `matrix.ts` / `calculus.ts` | Determinants, inverses, symbolic derivatives, Simpson integration |
| `arithmetic.ts` | Percentage, profit/loss, interest, speed, work, mixtures |

Two rules hold throughout:

1. **Every answer comes with its working out.** Functions return `steps` next to
   the value, so the solver and the solution view show the derivation.
2. **An LLM is never the authority for a number.** `RuleBasedMathTutor`
   assembles explanations from engine output only; a future offline model must
   do the same (`domain/repositories/future.ts`).

---

## The Question Engine

`src/core/question-engine/` combines a static bank with **82 generators**
covering arithmetic through calculus, discrete mathematics and everyday
reasoning.

- `defineGenerator()` gives every generator identical metadata handling and a
  **deterministic, stable id** derived from its parameters — so an attempt made
  weeks ago still joins to the exact question the learner saw.
- `generateQuestions()` is reproducible for a given seed, de-duplicates within a
  batch, supports a difficulty ramp for boss battles, and **skips a failing
  generator rather than failing the set**.
- `answerValidator.ts` is the single place an answer is judged. It is generous
  about form (Bangla digits, `৳`, commas, `3/4` vs `0.75` vs `75%`, option
  letters) and strict about mathematics, with a relative tolerance reserved for
  estimation questions.

Difficulty is a 1–9 integer and is **independent of academic level**: "Class 8 +
Algebra + Expert" is a valid combination.

---

## Adaptive learning

```
previous performance + mistakes + speed + skill gaps + difficulty +
spaced repetition  →  next questions
```

- **Difficulty engine** moves on accuracy *and* speed *and* streaks *and* hint
  usage — right-but-very-slow consolidates instead of climbing.
- **Mastery** is deliberately not accuracy. It blends accuracy, consistency,
  speed, difficulty attempted, recency and volume, so guessing through easy
  questions does not look like mastery.
- **Spaced repetition** uses the ladder the spec names (today → 1 → 3 → 7 → 14 →
  30 days); a wrong answer drops the item back to today or tomorrow.
- **Mathematical Thinking Score** (never called IQ) tracks eight trainable
  dimensions with exponential smoothing, so one bad day cannot erase weeks.

---

## Database

SQLite via `expo-sqlite`, behind the `SqlDatabase` interface.

- **Six append-only migrations**, applied in a transaction, recorded in
  `schema_migrations`. Re-running is a no-op and user data always survives.
- **Content tables** (`topics`, `questions`, `lessons`, `formulas`, `exams`, …)
  are strictly separate from **user tables** (`question_attempts`, `mistakes`,
  `topic_progress`, `review_items`, …).
- Every user row carries `createdAt / updatedAt / deletedAt / syncStatus /
  lastSyncedAt / version` from day one, so a future sync engine needs no
  migration of meaning.
- **Indexes and pagination everywhere.** Join tables (`question_skills`,
  `question_exams`, `question_tags`) keep tag and skill lookups indexable on a
  bank designed to grow to hundreds of thousands of rows. No query ever loads
  the whole table, and the repositories clamp page sizes.
- Corrupt-database recovery: the boot sequence runs `PRAGMA integrity_check` and
  rebuilds from bundled content if the file is unreadable.

Testing note: because storage sits behind an interface, the repository tests run
against **real SQLite** in Node (`node:sqlite`) rather than a hand-written fake.

---

## Content

Bundled content packs (`src/data/content/`), seeded through
`JSON/TS → validation → normalisation → SQLite`:

`Core` · `Foundation` · `School` · `Higher Math` · `Competitive Exam` ·
`Admission` · `Olympiad` · `University` · `Engineering`

Seeding is idempotent — a pack whose version and checksum are unchanged is
skipped — and **a pack with any validation error is refused outright**, so an
invalid question can never reach the production database.

Content includes a 57-topic skill tree, 71 skills, 12 full seven-section
lessons, 58 formulas with variables/examples/pitfalls, 10 exam blueprints
(BCS, Bank, NTRCA, SSC, HSC, Admission, Primary, Govt, Olympiad, Quick 10),
10 games, 18 boss battles, 24 achievements, recurring missions, and
hand-checked previous-year style questions.

Bangla is the primary language; every topic, lesson section, formula and static
question carries Bangla text, and the UI uses translation keys throughout.

---

## Performance

Aimed at low-end Android:

- The Zustand store holds **only** the in-flight session and UI state. Persistent
  data stays in SQLite behind the repositories.
- `FlatList` with windowing for the skill tree; charts are plain views with no
  animation loops.
- `reduceAnimations`, `largeText` and `highContrast` are real settings that the
  theme and components honour.

---

## Testing

```
__tests__/engine/mathEngine.test.ts          the math engine
__tests__/engine/questionEngine.test.ts      every generator × every difficulty
__tests__/engine/dataLayer.test.ts           migrations, seeding, repositories (real SQLite)
__tests__/engine/services.test.ts            use cases end to end
__tests__/engine/contentValidation.test.ts   the content validation entry point
__tests__/ui/components.test.tsx             component + accessibility tests
```

682 tests. The generator suite alone asserts, for every generator at every
difficulty in its range and across multiple seeds, that the question has a
prompt in both languages, ordered solution steps, distinct options containing
the answer, and that the validator accepts its own answer and rejects a wrong
one.

---

## Deliberately not built (interfaces only)

`src/domain/repositories/future.ts` defines the contracts for the phases the
spec puts after version 1, with no implementation anywhere in the app:

- **Offline AI tutor** beyond the rule-based one
- **Camera → OCR → parser → Math Engine** pipeline
- **Cloud sync** (queue, cursors, conflict resolution)
- **Teacher mode** (classrooms, assignments, class analytics)
- **Downloadable content packs**

---

## License

See `LICENSE`.
