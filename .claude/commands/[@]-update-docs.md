---
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
description: Identify and update all project documentation affected by recent changes.
---

# Update Documentation

Scan recent changes and update any project documentation that has fallen out of sync. This command is meant to be run at the end of a work session or before committing a batch of changes.

## Documentation Registry

These are the documentation files in the project and what each one covers:

| File                                        | Tracks                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `CLAUDE.md`                                 | Repo structure, server architecture, dev commands, active tasks, API managers     |
| `README.md`                                 | Library usage, installation, API examples, module list                            |
| `CHANGELOG.md`                              | Server/library changes under Unreleased (lib/ scope + project tooling)            |
| `docs/guides/dev-setup.md`                  | **Canonical setup guide** — env setup, Playwright, credentials, troubleshooting   |
| `docs/guides/playwright-testing.md`         | Playwright patterns, architecture, extension guide (links to dev-setup for setup) |
| `docs/architecture/visualvault-platform.md` | VV platform architecture, URL anatomy, navigation, Enterprise Tools               |
| `docs/reference/form-fields.md`             | Calendar field config properties, popup behavior, known bugs                      |
| `docs/reference/vv-form-api.md`             | VV.Form object structure, methods, automation patterns                            |
| `docs/README.md`                            | Index of all docs/ contents                                                       |
| `tasks/README.md`                           | Task index table (folder name, status, description)                               |
| `testing/date-handling/README.md`           | Date-handling test suite context, field matrix, TZ rationale, debugging           |
| `Readme-microservices.md`                   | Dev setup for microservices execution                                             |

### Single Source of Truth Principle

Setup instructions live in **one place only** — `docs/guides/dev-setup.md`. Other files link to it instead of repeating setup steps. When reviewing docs for staleness:

- If you find setup/install/config steps duplicated outside `dev-setup.md`, remove the duplicate and add a link
- If `dev-setup.md` is missing something that other files mention, add it to `dev-setup.md` and link from the other file

## Workflow

### 1. Determine what changed

Run `git diff HEAD~10 --stat` and `git log --oneline -10` to understand recent changes. If there are uncommitted changes, also run `git diff --stat` and `git status`. Build a mental model of what areas were touched.

### 2. Classify changes into documentation impact zones

For each change, determine which docs **might** need updating using this mapping:

| Change area                                  | Docs to check                                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `lib/VVRestApi/` (new features, API changes) | `CHANGELOG.md`, `README.md`, `CLAUDE.md` (API managers table)                                      |
| `lib/VVRestApi/` (bug fixes, refactors)      | `CHANGELOG.md`                                                                                     |
| `package.json` (scripts, deps, tooling)      | `CLAUDE.md` (dev commands), `CHANGELOG.md`, `docs/guides/dev-setup.md` (commands/tooling)          |
| `scripts/`                                   | `CLAUDE.md` (repo structure if new dirs)                                                           |
| `testing/` (helpers, fixtures, config)       | `docs/guides/dev-setup.md`, `docs/guides/playwright-testing.md`, `testing/date-handling/README.md` |
| `testing/helpers/` (new or changed helpers)  | `docs/guides/playwright-testing.md` (key files table), `CLAUDE.md` (test infrastructure list)      |
| `docs/` (new or updated files)               | `docs/README.md` if index needs update                                                             |
| `tasks/` (new task folders)                  | `tasks/README.md` (task index table), `CLAUDE.md` (active tasks table)                             |
| `.claude/` (commands, config)                | `CLAUDE.md` if it references commands                                                              |
| Config files (eslint, prettier, husky, etc.) | `CHANGELOG.md` (tooling), `docs/guides/dev-setup.md` (code quality section)                        |
| `app.js`, routes (new endpoints)             | `CLAUDE.md` (server architecture), `Readme-microservices.md`                                       |

### 3. Read and evaluate each affected doc

For each doc identified in step 2:

- Read the current content
- Compare against the actual state of the codebase (read the relevant files/dirs)
- Identify specific sections that are outdated, incomplete, or missing

### 4. Update each doc

Apply updates following these rules:

- **CLAUDE.md**: Keep the existing structure. Update repo structure tree, tables, and dev commands to reflect reality. Do not add commentary — this is a reference doc. Does NOT contain setup instructions — those live in `dev-setup.md`.
- **README.md**: Only update if public API surface changed (new managers, new usage patterns). Do not touch prose style.
- **CHANGELOG.md**: Add entries under `## [Unreleased]` in the correct subsection (Added/Changed/Fixed/Removed). Follow existing entry style. Keep entries concise. Scope: lib/ changes + project-wide tooling only.
- **docs/guides/dev-setup.md**: Canonical setup guide. Update when dependencies, scripts, config, credentials, auth flow, or troubleshooting steps change. All other docs link here for setup — if this file is wrong, everything downstream is wrong.
- **docs/guides/playwright-testing.md**: Patterns and architecture only. Setup steps link to `dev-setup.md`. Update when helpers change, new test directories are added, or extensibility patterns evolve.
- **testing/date-handling/README.md**: Date-handling-specific context (field matrix, TZ rationale, debugging tips). Setup steps link to `dev-setup.md`. Update when field configs, categories, or test architecture changes.
- **docs/reference/**: Update when VV platform APIs, form field behaviors, or VV.Form object structure changes.
- **tasks/README.md**: Update the task index table if tasks were added, completed, or removed.
- **docs/README.md**: Update if new docs are added to `docs/` subdirectories.
- **Readme-microservices.md**: Only update if execution modes or setup steps changed.

### 5. Skip what doesn't need updating

If a doc is already accurate, say so and move on. Do not make cosmetic edits, rewrap paragraphs, or reorganize sections that are already correct. The goal is accuracy, not perfection.

## Report

Output a summary:

```markdown
## Docs Update Summary

| Doc          | Status  | Changes                               |
| ------------ | ------- | ------------------------------------- |
| CLAUDE.md    | Updated | Added linting scripts to dev commands |
| CHANGELOG.md | Updated | Added ESLint + Prettier entry         |
| README.md    | Skipped | No API surface changes                |
| ...          | ...     | ...                                   |
```

If nothing needed updating, say: **All docs are current. No updates needed.**
