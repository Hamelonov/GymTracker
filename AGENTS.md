This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Code style: readability first

The owner is a React frontend developer who reads and edits this code by hand. Code must read like plain English.

- **Full-word names, no abbreviations.** `colors` not `c`, `exercise` not `e`/`ex`, `workout` not `w`, `set` not `s`, `index` not `i`/`idx`, `previous` not `prev`, `value` not `v`, `event` not `e`, `transaction` not `tx`, `formatters` not `fmt`, `database` not `db`, `button` not `btn`, `wrapper` not `wrap`. Zustand selectors are `(state) => state.workout`. The translation function is `const { t: translate } = useTranslation()`. Allowed short forms: `id`, `i18n` (library name), `ms`/`kg`/`cm` inside unit names like `durationMs`, `weightKg`.
- **Names say what things do.** Functions are verbs (`addSetToExercise`, `formatWeightWithUnit`), booleans read as yes/no questions (`isCompleted`, `hasNote`, `canComplete`).
- **Small pieces.** A screen file holds layout and handlers; sheets, sections and rows live in named components under `src/features/<area>/`. Split a file once it grows past ~250 lines.
- **No clever one-liners.** No nested ternaries deeper than one level: use a small helper function, a lookup object, or `if` statements. Prefer early returns.
- **Comments are written in Russian** and explain why, not what. Every non-obvious decision gets a one-line comment; obvious code gets none. Code identifiers stay in English.
- **Styles** live in `StyleSheet.create` at the bottom of the file with descriptive keys (`exerciseNameColumn`, not `col1`).
- Before finishing: `npm run format`, `npm run typecheck`, `npm run lint`, `npm test`.
