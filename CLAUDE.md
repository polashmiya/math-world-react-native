@AGENTS.md

# Math World — working notes

Read `README.md` first for the architecture. These are the rules that are easy
to break by accident.

## Hard rules

1. **The UI never imports a repository or `expo-sqlite`.** Screens call
   `useServices()` and go through `domain/services`. If a screen needs data that
   no use case exposes, add the use case.
2. **`core/` stays pure.** No React, no `expo-*`, no platform APIs, no storage.
   It must keep running under the `engine` jest project in plain Node.
3. **`core/` never imports from `data/`.** Content ids live in
   `domain/taxonomy.ts`, which both sides may read.
4. **Only the Math Engine computes a number.** Screens, services and the tutor
   format and orchestrate; they never do arithmetic that belongs in
   `core/math/`.
5. **Content ids are permanent.** Renaming a topic, skill, generator or formula
   id orphans saved user progress. Add a new id instead.
6. **Migrations are append-only.** Never edit a shipped migration; add
   `00N_*.ts`, register it in `migrations/index.ts`, and keep it non-destructive.
7. **Every user-visible string goes through `t()`**, and content carries both
   `field` and `fieldBn`. Bangla is the primary language.
8. **A screen never plays a tap.** `Button`, `Card`, `Chip`, `OptionButton` and
   `Toggle` already do, from inside the component. Screens call `play()` only
   for sounds that carry meaning — right, wrong, level up. Use `sound={null}` on
   a control whose result is the sound.
9. **Sound never blocks anything.** `useSound().play()` returns immediately and
   swallows its own failures; nothing may await it or branch on it.

## Adding things

**A generator** — add it to a file in `core/question-engine/generators/`, export
it from that file's array, and register the array in `registry.ts`. Reference
only ids that exist in `domain/taxonomy.ts`. The generator suite then tests it
automatically at every difficulty in its declared range; `npm run
validate:content` must stay green.

**A question type** — add it to `QuestionType`, and to `CHOICE_QUESTION_TYPES`
if it is answered from an option list. Then teach `answerValidator.ts` how to
judge it.

**An exam** — content only: add a blueprint to `data/content/exams.ts`. The exam
engine never needs to change. Section `questionCount`s must sum to
`totalQuestions` or validation fails.

**A sound** — add a recipe to `RECIPES` in `scripts/generate-sounds.mjs`, run
`npm run sounds:build`, then add the name to `SoundName` and `SOUND_SOURCES` in
`src/ui/sound/catalogue.ts`. Give it a voice count only if it can overlap
itself. The `level` in the recipe is how loud it ends up relative to the
loudest effect — set it low unless the sound is a reward.

**A screen** — put it in `features/<feature>/`, register the route in
`app/navigation/types.ts` and `RootNavigator.tsx`, and use the components from
`ui/components` so theming, text size, high contrast and sound keep working.

## Verifying

```bash
npm run check   # typecheck + content validation + all tests
```

Before claiming a UI change works, also confirm it bundles:

```bash
npx expo export --platform android --output-dir .expo-export
```

## Things that look like bugs but are not

- `orderBy: 'random'` with a `seed` sorts by `(rowid × factor) mod p`. SQLite has
  no seedable `RANDOM()`, and reproducible practice sets need determinism.
- `Mistake.questionSnapshot` and `ReviewItem.snapshot` duplicate a generated
  question on purpose, so it can be retried even if the row is pruned.
- Mastery can fall while accuracy stays flat: recency decay is part of the
  formula (spec §17).
- `render()` from `@testing-library/react-native` v14 is **async** — `await` it,
  and read queries from its return value rather than the `screen` global.
