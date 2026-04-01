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
- Claude Code custom commands (`[@]-update-docs`, `[@]-smart-commit-push`, `[@]-sync-with-develop`, `[@]-create-date-test`, `[@]-vv-learn`)
- Playwright testing infrastructure under `testing/` (3-TZ projects, global auth, reusable helpers, data-driven specs)
- `docs/guides/dev-setup.md` — canonical dev environment setup guide (single source of truth for all setup instructions)
- Playwright helpers: `captureDisplayValue`, `saveFormAndReload`, `roundTripCycle` in `testing/helpers/vv-form.js`

### Changed

- `[@]-create-date-test` command: parameter changed from execution test IDs (`1.2`) to category test IDs (`7-D-isoZ-BRT`); command now reads from `matrix.md` instead of `results.md`, derives field config from the Config letter, generates TC filenames as `tc-{category-id}.md`, and updates the matrix row (Actual/Status/Evidence) after writing the file
- Consolidated setup instructions into `docs/guides/dev-setup.md`; trimmed duplicated setup from `CLAUDE.md`, `testing/date-handling/README.md`, and `docs/guides/playwright-testing.md` (replaced with links)
- `[@]-update-docs` command: expanded documentation registry (6 → 12 files), added single-source-of-truth principle, added `testing/` impact zones

### Fixed

### Removed

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
