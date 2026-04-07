---
allowed-tools: Bash, Read, Glob, Grep
description: Run a read-only maintenance audit and generate a cleanup report.
---

# Repository Maintenance Audit

Scan the entire repository for staleness, bloat, orphaned files, documentation drift, config hygiene issues, and git hygiene problems. This command is **read-only** — it never modifies or deletes anything. It produces a categorized report with findings and recommendations. The user decides what to act on.

Severity levels:

- **CRITICAL** — should be addressed soon (security risk, significant bloat, broken references)
- **WARNING** — worth reviewing (stale content, accumulation, inconsistencies)
- **INFO** — awareness items (minor observations, suggestions)

Collect all findings as you go. Output the final report only once, at the end.

---

## Phase 1: Staleness Detection

Goal: identify files that have gone stale relative to active development.

### 1A. Establish baseline

Run `git log --format='%ai' -1` to get the most recent commit date. This is the **reference date** — anything last touched more than 30 days before this date is considered stale.

### 1B. Check last-modified dates

For each file below, run `git log -1 --format='%ai %s' -- <path>` to get the last modification date and commit message. Process them in batch (one `git log` call per file is fine — they're fast):

| Category     | Paths                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| Root docs    | `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `Readme-microservices.md`                     |
| Docs         | all `docs/**/*.md` files                                                                |
| Task files   | `tasks/README.md`, `tasks/date-handling/CLAUDE.md`                                      |
| Testing docs | `testing/README.md`, `testing/date-handling/README.md`, `testing/config/README.md`      |
| Commands     | all `.claude/commands/*.md` files                                                       |
| Config       | `package.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `playwright.config.js` |

### 1C. Flag stale items

- **WARNING** if a documentation file (docs/, testing/ READMEs) is stale — it may be outdated
- **INFO** if a config or root file is stale — may be fine, just noting it

---

## Phase 2: Orphaned and Wrongly-Created Files

Goal: detect files that look auto-generated, misplaced, or leftover from AI agent sessions.

### 2A. Backup directories

Search for directories or files matching these patterns anywhere in the repo (excluding `node_modules/` and `.git/`):

- `*bak*`, `*backup*`, `*.bak`, `*-old`, `*-copy`

For each found: report the path, size (`du -sh`), and file count. Classify as **WARNING**.

### 2B. Empty or near-empty markdown files

Find all `.md` files in the repo (excluding `node_modules/` and `.git/`). For each, check line count. Flag any file with fewer than 3 non-empty lines as **WARNING** — it may be a placeholder that was never filled in or an agent artifact.

### 2C. Unexpected files at root

The expected root-level items are:

**Directories**: `.claude/`, `.husky/`, `.playwright/`, `.playwright-cli/`, `docs/`, `lib/`, `node_modules/`, `playwright-report/`, `scripts/`, `tasks/`, `test-results/`, `testing/`

**Files**: `_config.yml`, `.gitattributes`, `.gitignore`, `.npmignore`, `.prettierignore`, `.prettierrc`, `CHANGELOG.md`, `CLAUDE.md`, `eslint.config.js`, `package.json`, `package-lock.json`, `README.md`, `Readme-microservices.md`

Run `ls -1A` at root and compare against these lists. Any unexpected items: **WARNING** with a note about what they might be. Ignore hidden system files (`.DS_Store`, `.env`).

### 2D. Suspect duplicate content

Check these pairs for overlap:

1. `tasks/date-handling/CLAUDE.md` vs root `CLAUDE.md` — is the task-level file redundant or contradictory?

Read the first 30 lines of each file in the pair. If one appears to be a stale or outdated version of the other, flag as **INFO** with a recommendation.

---

## Phase 3: Bloat Detection

Goal: identify accumulated large files, test artifacts, and cache directories.

### 3A. Large files

Find all files over 1MB excluding `node_modules/`, `.git/`, and `package-lock.json`:

```bash
find . -not -path './.git/*' -not -path './node_modules/*' -not -name 'package-lock.json' -type f -size +1M -exec ls -lh {} \;
```

Classify:

- Over 5MB: **CRITICAL** (e.g., `tasks/date-handling/forms-calendar/main.js` at ~13MB)
- 1–5MB: **WARNING**

### 3B. Test artifact directories

Measure size and file count for each:

| Directory                    | Notes                         |
| ---------------------------- | ----------------------------- |
| `testing/test-results/`      | Failure logs, should be small |
| `testing/playwright-report/` | HTML traces, auto-generated   |
| `test-results/` (root)       | Legacy location               |
| `playwright-report/` (root)  | Legacy location               |
| `.playwright/`               | Browser cache                 |
| `.playwright-cli/`           | CLI cache                     |

For each, run `du -sh` and count files. Over 50MB: **CRITICAL**. Over 10MB: **WARNING**. Non-empty but fully gitignored: **INFO**.

### 3C. Screenshot accumulation

Count files in `testing/config/screenshots/` and any other screenshot directories. More than 50 screenshots: **WARNING** with total size.

### 3D. Task workspace accumulation

Measure `tasks/date-handling/forms-calendar/` subdirectories:

- `runs/` — file count and total size
- `summaries/` — file count and total size
- `test-cases/` — file count and total size

Over 100 files in any single subdirectory: **INFO** (accumulation awareness). Always flag `main.js` separately per 3A.

---

## Phase 4: Documentation Consistency

Goal: cross-reference what CLAUDE.md claims vs actual filesystem state.

### 4A. Repo structure tree

Read the `## Repo Structure` section from `CLAUDE.md`. Extract every path listed in the code block. For each path, verify it exists on disk:

- **WARNING** for documented paths that do NOT exist
- **INFO** for significant directories/files that exist but are NOT documented (check `docs/`, `tasks/`, `testing/`, `scripts/`, `.claude/commands/` for undocumented items)

### 4B. Active Tasks table

Read the `## Active Tasks` table from `CLAUDE.md`. For each task:

- Verify the folder exists
- Check last-modified date vs stated status (e.g., "Not Started" but has recent files → flag)
- **WARNING** for tasks with apparently incorrect status
- **INFO** for task folders that exist but aren't in the table

### 4C. Documentation registry

Read the Documentation Registry table from `.claude/commands/[@]-update-docs.md`. Verify each listed file exists on disk. Missing files: **WARNING**.

### 4D. docs/README.md index

Read `docs/README.md`. Verify:

- All files listed actually exist
- All files in `docs/` subdirectories are listed in the index

Discrepancies: **WARNING**.

---

## Phase 5: Config Hygiene

Goal: flag sensitive data that might be committed to git.

### 5A. Sensitive files in git

Check whether these files are tracked by git (`git ls-files`):

- `testing/config/auth-state.json`
- `testing/config/auth-state-pw.json`
- `.env.json`
- `testing/config/saved-records.json`
- Any file matching `*.env`, `*credential*`, `*secret*`

If tracked: **CRITICAL**. If present on disk but gitignored: **INFO** (expected).

### 5B. Gitignore coverage

Read `.gitignore` and verify it has entries covering:

- Auth state files (`auth-state*.json`)
- Config files with credentials (`.env.json`)
- Test result directories (`test-results/`)
- Playwright report directories (`playwright-report/`)
- Screenshot directories
- `node_modules/`
- `.DS_Store`

Missing expected patterns: **CRITICAL**.

---

## Phase 6: Git Hygiene

Goal: check for untracked files and gitignore gaps.

### 6A. Untracked files

Run `git status --short`. Collect any untracked files (`??` prefix). Group by directory:

- **WARNING** if untracked in `docs/`, `scripts/`, `lib/`, `.claude/`, `tasks/` (likely should be committed or deleted)
- **INFO** if untracked in `testing/config/`, `test-results/`, `playwright-report/` (expected transient files)

### 6B. Wrongly tracked files

Check if any of these are tracked by git:

- `.DS_Store` files anywhere
- `*.log` files
- `*.png`, `*.jpg` files outside `docs/` (accidental screenshot commits)

If tracked: **WARNING** with recommendation to untrack and add to `.gitignore`.

### 6C. Git LFS candidates

Check all tracked files for size. Any tracked file over 5MB: **WARNING** — recommend Git LFS or removal from tracking.

---

## Report

After all phases complete, output the full audit report in this format:

```
# Repository Maintenance Audit Report

**Date**: [today's date]
**Branch**: [current branch from git]
**Last commit**: [short hash] [message] ([relative date])

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | [n]   |
| WARNING  | [n]   |
| INFO     | [n]   |

## Critical Findings

- **[Phase N] [Brief title]**: [Description]. *Recommendation*: [what to do]

## Warnings

- **[Phase N] [Brief title]**: [Description]. *Recommendation*: [what to do]

## Info

- **[Phase N] [Brief title]**: [Description]

## Recommended Actions

Prioritized list of suggested cleanup actions, most impactful first:

1. [Action] — addresses [which findings]
2. [Action] — addresses [which findings]
...
```

End the report with:

> **This report is read-only. No files were modified.**

If a phase finds zero issues, skip it in the report (don't output empty sections). If the entire audit is clean, say so in the summary.
