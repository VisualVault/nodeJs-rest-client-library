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
- Claude Code custom commands (`[@]-update-docs`, `[@]-smart-commit-push`, `[@]-sync-with-develop`)

### Changed

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
