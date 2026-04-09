---
allowed-tools: Bash, Read, Glob, Grep
description: Session briefing — current state of git, tasks, projects, tests, and CLAUDE.md health.
---

# Session Status Briefing

Generate a concise status report for the repo. Read-only — no modifications. Output a clean markdown report that fits on one screen.

**Arguments:**

- No args: full overview (~40 lines)
- `--task <name>`: deep view of a specific task (e.g., `--task date-handling`)
- `--project <name>`: deep view of a specific project (e.g., `--project wadnr`)

---

## Default Report (no args)

Collect data from these sources, then output the report in the format below.

### Data Collection

**1. Git state:**

```bash
branch=$(git branch --show-current)
last_commit=$(git log --oneline -1)
dirty=$(git status --short | head -5)
ahead_behind=$(git rev-list --left-right --count origin/$branch...$branch 2>/dev/null)
```

**2. Active tasks** — for each `tasks/*/CLAUDE.md`:

- Read the Scope table to get component statuses
- Read the "Next Steps" section (last ~5 lines of the section)
- For each `tasks/*/forms-calendar/matrix.md`, `tasks/*/web-services/matrix.md`, `tasks/*/dashboards/matrix.md`: extract line 6 which contains `Total slots: N | Done: M (NP/NF)` or similar

**3. Active projects** — for each `projects/*/`:

- Read `CLAUDE.md` for environment info
- For each `extracts/*/manifest.json`: extract `generatedAt` and item count

**4. Recent activity:**

```bash
git log --oneline -5
```

**5. Test results** — check modification dates:

```bash
ls -la testing/tmp/*latest* 2>/dev/null
```

**6. CLAUDE.md health:**

```bash
find . -name 'CLAUDE.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.claude/*' | while read f; do
  wc -l < "$f" | tr -d ' '
done
```

### Output Format

```markdown
## Status — {YYYY-MM-DD}

### Git

- **Branch:** {branch}
- **Working tree:** {clean / N uncommitted files}
- **Last commit:** {hash} {message} ({relative time})
- **Remote:** {up to date / N ahead, M behind}

### Active Tasks

| Task           | Components                 | Coverage     | Next Step                  |
| -------------- | -------------------------- | ------------ | -------------------------- |
| date-handling  | Forms: {N}/{M} ({P}P/{F}F) | WS: complete | {first next step}          |
|                | Dashboards: complete       |              |                            |
| form-templates | Active                     | —            | {next step from CLAUDE.md} |

### Active Projects

| Project | Environment  | Last Export | Exports                                                |
| ------- | ------------ | ----------- | ------------------------------------------------------ |
| wadnr   | vv5dev/WADNR | {date}      | {N} scripts, {N} templates, {N} globals, {N} schedules |

### Recent Activity

{last 5 commits, one per line with hash and message}

### Test Results

- Forms regression: {date or "no results"}
- WS regression: {date or "no results"}
- Dashboard regression: {date or "no results"}

### Health

{CLAUDE.md size summary — only flag files over target}
{Uncommitted changes warning if any}
```

---

## Deep Task View (`--task <name>`)

In addition to the default task row, include:

**1. Per-component matrix coverage:**

For each matrix.md in the task, extract:

- Line 6 (summary line with total/done/pass/fail)
- The Coverage Summary table (the category-level breakdown)

**2. "What Has NOT Been Tested" section** — read verbatim from the task's CLAUDE.md

**3. "Next Steps" section** — read verbatim from the task's CLAUDE.md

**4. Recent commits for this task:**

```bash
git log --oneline -5 -- tasks/{name}/
```

### Output format for deep view:

```markdown
## Task: {name} — Deep View

### Matrix Coverage

**Forms Calendar** ({total} slots: {done} done, {pending} pending)
| Category | Total | PASS | FAIL | PENDING |
{rows from Coverage Summary table}

**Web Services** ({total} slots — COMPLETE)
{same format}

**Dashboards** ({total} slots — COMPLETE)
{same format}

### Not Yet Tested

{verbatim from CLAUDE.md}

### Next Steps

{verbatim from CLAUDE.md}

### Recent Commits

{last 5 commits touching this task}
```

---

## Deep Project View (`--project <name>`)

In addition to the default project row, include:

**1. Per-component export details:**

For each `extracts/*/manifest.json`, extract:

- Component name
- Item count (`totalItems` or array length)
- Generated date
- For scripts: count of `.js` files on disk vs manifest count

**2. Analysis files** — list files in `analysis/` with sizes

**3. Recent commits for this project:**

```bash
git log --oneline -5 -- projects/{name}/
```

### Output format for deep view:

```markdown
## Project: {name} — Deep View

### Environment

{from CLAUDE.md: server, customer, database, readOnly}

### Exports

| Component        | Manifest  | On Disk        | Last Export     |
| ---------------- | --------- | -------------- | --------------- |
| web-services     | {N} items | {N} .js files  | {date}          |
| schedules        | {N} items | {N} .js files  | {date}          |
| global-functions | —         | {N} .js files  | {date from git} |
| form-templates   | —         | {N} .xml files | {date from git} |

### Analysis Files

{list files in analysis/ with line counts}

### Recent Commits

{last 5 commits touching this project}
```

---

## Constraints

1. **Read-only.** Never modify any file. Only read, glob, grep, and git commands.
2. **Fast.** Target <10 seconds. Don't read entire large files — extract specific lines (head, grep, sed).
3. **Scannable.** Output should be a clean markdown report. Tables for structured data. No prose paragraphs.
4. **Graceful fallback.** If a data source doesn't exist (no test results, no manifests), show "—" not an error.
5. **No stale assumptions.** Always read from the filesystem/git — never hardcode counts or dates.
