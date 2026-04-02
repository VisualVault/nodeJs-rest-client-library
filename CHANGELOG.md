# Changelog

Notable changes to the VisualVault Node.js server and client library (`lib/VVRestApi/`).

**Scope:** Server/library code changes and project-wide development tooling. For investigation work, see [`tasks/`](tasks/). For platform documentation, see [`docs/`](docs/).

Format follows [Keep a Changelog](https://keepachangelog.com/). Entries stay under **Unreleased** until a version is published to npm.

## [Unreleased]

### Added

- Support for adding index fields to a folder ([#71](https://github.com/VisualVault/nodeJs-rest-client-library/pull/71))
- Get user role permissions ([#70](https://github.com/VisualVault/nodeJs-rest-client-library/pull/70))
- CurrentUser namespace and WhoAmI endpoint ([#69](https://github.com/VisualVault/nodeJs-rest-client-library/pull/69))
- ObjectsAPI support ([#68](https://github.com/VisualVault/nodeJs-rest-client-library/pull/68))
- Jest as test framework, replacing placeholder test script
- Documentation folder structure (`docs/`) for platform knowledge
- Task workspace (`tasks/`) for structured investigation tracking
- CHANGELOG.md for tracking server and project changes
- ESLint (flat config) + Prettier + Husky + lint-staged for code quality and pre-commit formatting
- Claude Code custom commands (`[@]-update-docs`, `[@]-smart-commit-push`, `[@]-sync-with-develop`, `[@]-create-date-test`, `[@]-vv-learn`, `[@]-create-pw-date-test`)
- `[@]-create-pw-date-test` batch mode: multiple space-separated IDs, grouped by TZ. `--skip-verify` flag: backfill test-data.js entries from existing run files without browser session
- `[@]-run-ws-date-test` command: WS test execution + artifact generation (TC spec, run file, summary, matrix update). Script and browser modes, batch support, TZ simulation
- `docs/guides/scripting.md` — Node.js server data flow guide: script contracts, API serialization chain, field name casing (camelCase), date passthrough behavior
- Web services date-handling test infrastructure: action-driven harness (`webservice-test-harness.js`), direct Node.js runner (`run-ws-test.js`), form button script (`ws-harness-button.js`), test matrix (9 categories, ~118 slots)
- Multi-environment credentials via `.env.json` (gitignored). Loaded at `app.js` startup into `global.VV_ENV`; server-side scripts read credentials from this global with fallback to placeholder defaults
- WS-3 through WS-9 action handlers in `webservice-test-harness.js`: round-trip, API→Forms cross-layer, format tolerance, empty/null handling, update path, query filtering, and date computation patterns
- `verify-ws4-browser.js` — Playwright browser verification script for WS-4 (API→Forms cross-layer testing)
- `docs/reference/api-date-patterns.md` — practical guide for CSV imports and web service datetime handling: decision tree, UTC offset reference, TZ-safe patterns, Bug #8 warnings
- `docs/guides/scripting.md` expanded: server-side date format acceptance table, OData query format tolerance, TZ-safe Date construction patterns for production scripts
- `docs/reference/form-template-xml.md` — Form template XML export format reference: field types with XML element names, Groups/Conditions structure, script library/assignments, built-in form control GUIDs, what's included vs excluded in exports
- `docs/reference/form-fields.md` expanded: field type enum table with 7 new types from production template analysis (Label, Dropdown, Checkbox, CellField, UploadButton, FormIDStamp), `mask`/`placeholder` calendar properties
- `docs/reference/vv-form-api.md` expanded: script event type IDs (onChange/onBlur/onClick), `VV.Form.Template` namespace correction, `CentralDateValidation` operator details, `CloseAndUnlockForm` method
- `[@]-cleanup` command: read-only 6-phase repository maintenance audit (staleness, orphans, bloat, doc consistency, config hygiene, git hygiene)
- `testing/README.md` — entry-point documentation for testing infrastructure
- Playwright testing infrastructure under `testing/` (3-TZ projects, global auth, reusable helpers, data-driven specs)
- `docs/guides/dev-setup.md` — canonical dev environment setup guide (single source of truth for all setup instructions)
- Playwright helpers: `captureDisplayValue`, `saveFormAndReload`, `roundTripCycle` in `testing/helpers/vv-form.js`
- Multi-browser Playwright testing: TZ × browser matrix (Chromium, Firefox, WebKit) with per-browser npm scripts (`test:pw:chromium`, `test:pw:firefox`, `test:pw:webkit`)
- Portable test record creation: `global-setup.js` auto-creates saved form records via browser UI using per-field input methods (popup, typed, SetFieldValue), caches DataIDs in `saved-records.json` (1h TTL). Replaces hardcoded SAVED_RECORDS for environment portability
- `RECORD_DEFINITIONS` in `vv-config.js`: declarative record definitions with timezone, field values, and input methods per record
- DateTime popup support in `vv-calendar.js`: `selectDateViaPopup` handles both kendo-datepicker (date-only) and kendo-datetimepicker (DateTime) popups with infinite-scroll navigation
- Legacy field handling in calendar helpers: `typeDateInField` and `roundTripCycle` detect plain `<input>` (useLegacy=true) vs Kendo wrappers and adapt interaction accordingly
- `saveFormOnly` helper in `vv-form.js`: saves form and extracts DataID via `VV.Form.DataID` property (reliable post-save indicator)
- New Playwright spec files: cat-5 (preset), cat-6 (current date), cat-8 (GetFieldValue), cat-8b (GetDateObject), cat-9-gdoc (GDOC round-trip), cat-9-gfv (GFV round-trip), cat-12 (edge cases) — 11 total category specs
- Web services date-handling test infrastructure: test matrix (WS-1 through WS-9, 145 slots — complete), form button harness (`ws-harness-button.js`), direct Node.js runner (`run-ws-test.js`), and `README.md` with setup/architecture docs

### Changed

- `[@]-create-date-test` command: parameter changed from execution test IDs (`1.2`) to category test IDs (`7-D-isoZ-BRT`); command now reads from `matrix.md` instead of `results.md`, derives field config from the Config letter, generates TC filenames as `tc-{category-id}.md`, and updates the matrix row (Actual/Status/Evidence) after writing the file
- `[@]-create-pw-date-test` command: removed Chrome hardcode from initial verification (Phase 0.3); browser row in generated TC specs now reflects actual engine used; Layer 2 re-runs handle multi-browser regression via `npx playwright test --project=...`
- Playwright output dirs moved from `/tmp/pw-test-results` and `/tmp/pw-report` to `testing/tmp/test-results` and `testing/tmp/playwright-report` (project-local, gitignored) for portability across machines
- Consolidated setup instructions into `docs/guides/dev-setup.md`; trimmed duplicated setup from `CLAUDE.md`, `testing/date-handling/README.md`, and `docs/guides/playwright-testing.md` (replaced with links)
- `[@]-update-docs` command: expanded documentation registry (6 → 12 files), added single-source-of-truth principle, added `testing/` impact zones

### Fixed

- WebKit popup click interception in `selectDateInDatePicker` (`vv-calendar.js`): switched from Playwright locator clicks to `page.evaluate()` DOM clicks for month and day selection, matching the proven pattern in `selectDateInDateTimePicker`. Fixes 4 WebKit-only failures caused by Playwright WebKit z-index stacking differences vs real Safari
- Cat 1 spec now skips legacy configs (E-H) — legacy fields use Angular UI Bootstrap datepicker, not Kendo; the Kendo popup toggle selector doesn't exist in legacy DOM. Eliminates 10 misleading timeout failures across all browsers
- Timezone config files (`testing/config/tz-*.json`) updated from flat `{ "timezoneId": "..." }` to nested `{ "browser": { "contextOptions": { "timezoneId": "..." } } }` format required by `playwright-cli` v0.1.3 — previous format was silently ignored, BRT tests only passed because it matched the system timezone

### Removed

- `Puppeteer.md` — stale (155 days), fully superseded by `docs/guides/playwright-testing.md`
- `tasks/date-handling/forms-calendar/test-bak-20260330/` — orphaned backup directory (16 files), superseded by current test structure
- `tasks/date-handling/forms-calendar/main.js` — untracked from git (13MB minified bundle, added to `.gitignore`)

## [1.2.0] - 2026-02-19

_Version bump for npm publish. Includes all changes above._

## Prior History

Changes before this changelog was introduced. See [git log](https://github.com/emanueljofre/nodeV2/commits/master) for full history.

- Add `setFieldImage` API function and config.yml path (2025-08-21)
- Allow parallel file downloads (2025-03-13)
- Add NotificationsApi with ForceUIRefresh endpoint (2025-02-11)
- Instantiate DocApi, FormsApi, StudioApi managers when authenticating with JWT (2024-09-17)
- Add function to run scheduled processes (2024-06-10)
- Fix common.js logging (2024-03-21)
