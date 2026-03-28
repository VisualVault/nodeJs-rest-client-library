---
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
description: Identify and update all project documentation affected by recent changes.
---

# Update Documentation

Scan recent changes and update any project documentation that has fallen out of sync. This command is meant to be run at the end of a work session or before committing a batch of changes.

## Documentation Registry

These are the documentation files in the project and what each one covers:

| File                      | Tracks                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| `CLAUDE.md`               | Repo structure, server architecture, dev commands, active tasks, API managers |
| `README.md`               | Library usage, installation, API examples, module list                        |
| `CHANGELOG.md`            | Server/library changes under Unreleased (lib/ scope + project tooling)        |
| `docs/`                   | Platform knowledge: architecture, standards, guides, reference                |
| `tasks/README.md`         | Task index table (folder name, status, description)                           |
| `Readme-microservices.md` | Dev setup for microservices execution                                         |

## Workflow

### 1. Determine what changed

Run `git diff HEAD~10 --stat` and `git log --oneline -10` to understand recent changes. If there are uncommitted changes, also run `git diff --stat` and `git status`. Build a mental model of what areas were touched.

### 2. Classify changes into documentation impact zones

For each change, determine which docs **might** need updating using this mapping:

| Change area                                  | Docs to check                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `lib/VVRestApi/` (new features, API changes) | `CHANGELOG.md`, `README.md`, `CLAUDE.md` (API managers table)          |
| `lib/VVRestApi/` (bug fixes, refactors)      | `CHANGELOG.md`                                                         |
| `package.json` (scripts, deps, tooling)      | `CLAUDE.md` (dev commands), `CHANGELOG.md`                             |
| `scripts/`                                   | `CLAUDE.md` (repo structure if new dirs)                               |
| `docs/` (new or updated files)               | `docs/README.md` if index needs update                                 |
| `tasks/` (new task folders)                  | `tasks/README.md` (task index table), `CLAUDE.md` (active tasks table) |
| `.claude/` (commands, config)                | `CLAUDE.md` if it references commands                                  |
| Config files (eslint, prettier, husky, etc.) | `CHANGELOG.md` (tooling), `CLAUDE.md` (dev commands if new scripts)    |
| `app.js`, routes (new endpoints)             | `CLAUDE.md` (server architecture), `Readme-microservices.md`           |

### 3. Read and evaluate each affected doc

For each doc identified in step 2:

- Read the current content
- Compare against the actual state of the codebase (read the relevant files/dirs)
- Identify specific sections that are outdated, incomplete, or missing

### 4. Update each doc

Apply updates following these rules:

- **CLAUDE.md**: Keep the existing structure. Update repo structure tree, tables, and dev commands to reflect reality. Do not add commentary — this is a reference doc.
- **README.md**: Only update if public API surface changed (new managers, new usage patterns). Do not touch prose style.
- **CHANGELOG.md**: Add entries under `## [Unreleased]` in the correct subsection (Added/Changed/Fixed/Removed). Follow existing entry style. Keep entries concise. Scope: lib/ changes + project-wide tooling only.
- **tasks/README.md**: Update the task index table if tasks were added, completed, or removed.
- **docs/**: If new docs were added, ensure they follow the existing folder structure.
- **Readme-microservices.md**: Only update if execution modes or setup steps changed.

### 5. Skip what doesn't need updating

If a doc is already accurate, say so and move on. Do not make cosmetic edits, rewrap paragraphs, or reorganize sections that are already correct. The goal is accuracy, not perfection.

## Report

Output a summary:

```
## Docs Update Summary

| Doc | Status | Changes |
|-----|--------|---------|
| CLAUDE.md | Updated | Added linting scripts to dev commands |
| CHANGELOG.md | Updated | Added ESLint + Prettier entry |
| README.md | Skipped | No API surface changes |
| ... | ... | ... |
```

If nothing needed updating, say: **All docs are current. No updates needed.**
