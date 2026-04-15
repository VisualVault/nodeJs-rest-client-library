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

**1. Git state (harness repo):**

```bash
branch=$(git branch --show-current)
last_commit=$(git log --oneline -1)
dirty=$(git status --short | head -5)
ahead_behind=$(git rev-list --left-right --count origin/$branch...$branch 2>/dev/null)
```

**1b. Nested repo state** — detect independent repos in `lib/` and `projects/*/repo/`:

```bash
# lib/ repo
if [ -d lib/.git ]; then
  lib_branch=$(git -C lib branch --show-current)
  lib_dirty=$(git -C lib status --short | wc -l | tr -d ' ')
fi

# project repos
for repo_dir in projects/*/repo; do
  if [ -d "$repo_dir/.git" ]; then
    proj=$(basename $(dirname "$repo_dir"))
    proj_branch=$(git -C "$repo_dir" branch --show-current)
    proj_dirty=$(git -C "$repo_dir" status --short | wc -l | tr -d ' ')
  fi
done
```

**2. Active tasks** — for each `research/*/CLAUDE.md`:

- Read the **Scope table** to get component statuses
- Read the **"Next Steps"** section (last ~5 lines of the section)
- Read the **remaining-work section** (if present) — may be titled "What Has NOT Been Tested", "Known Gaps", "Remaining Work", "Open Items", or similar. Match by intent: it lists what is not yet done.
- For **per-project progress**: read `projects/*/testing/{task}/status.md` (rollup files). Rollup tables are self-describing — use whatever columns they have (could be Slots/Executed/PASS/FAIL for testing tasks, or Milestone/Done/Remaining for dev tasks, etc.). When multiple projects have rollup data for the same task, keep them **separate** — do NOT aggregate.
- For **blockers/context**: read the `## Notes` section from each project's rollup `status.md` — these explain WHY things are blocked, pending, or constrained.

**3. Active projects** — for each `projects/*/`:

- Read `CLAUDE.md` for environment info
- For each `extracts/*/manifest.json`: extract `generatedAt` and item count
- For each `testing/*/status.md` (task rollup files): extract component summary table

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

````markdown
## Status — {YYYY-MM-DD}

### Git

- **Branch:** {branch}
- **Working tree:** {clean / N uncommitted files}
- **Last commit:** {hash} {message} ({relative time})
- **Remote:** {up to date / N ahead, M behind}

**Nested repos** (only show if any exist):

| Repo                  | Branch   | Status            |
| --------------------- | -------- | ----------------- |
| lib/                  | {branch} | {clean / N dirty} |
| projects/{name}/repo/ | {branch} | {clean / N dirty} |

### Active Tasks

For each task, check how many projects have rollup files (`projects/*/testing/{task}/status.md`).

**Single or no project rollup** — compact row in a summary table:

| Task           | Status | Next Step                  |
| -------------- | ------ | -------------------------- |
| form-templates | Active | {next step from CLAUDE.md} |

**Multiple project rollups** — per-task sub-section with one row per project. Column headers come from the rollup Summary table's Component column (not hardcoded).

Cell format — **adapt to the rollup table's columns**, don't assume testing semantics:

- If the rollup has **numeric progress columns** (e.g., Slots/Executed, Total/Done): show `{done}/{total}` with key metrics in parens. Include any non-zero "problem" columns (Blocked, Pending, Failed, etc.) as qualifiers: `140/148 (140P/0F, 8 blocked)`.
- If a component shows **Status = Complete** and all work is done with no blocks: `Complete` + key metric summary.
- If the rollup has **only status keywords** (e.g., Done, In Progress, Blocked): show the keyword directly.
- **Not Started**: show as-is.
- Include the total column from the rollup if numeric.

#### {Task Name} Progress

| Project    | {Component1} ({col info}) | {Component2} ({col info}) | ... | Total        |
| ---------- | ------------------------- | ------------------------- | --- | ------------ |
| {project1} | {adapted from rollup}     | Complete ({metrics})      | ... | {done}/{tot} |
| {project2} | Not Started               | {adapted from rollup}     | ... | {done}/{tot} |

**Blockers & gaps** — surface from two sources. Omit this section entirely if nothing to report.

Source 1: `## Notes` from each project's rollup `status.md` — one bullet per project with non-trivial blockers, constraints, or environment issues. Cite the specific reason.

Source 2: The **remaining-work section** from `research/{task}/CLAUDE.md` (may be titled "What Has NOT Been Tested", "Known Gaps", "Remaining Work", etc.) — one bullet, compact comma-separated list.

```markdown
**Blockers:**

- {Project}: {reason from Notes — e.g., "DB-5 filter toolbar not enabled; Forms Calendar not yet executed"}

**Remaining:** {comma-separated list from task CLAUDE.md remaining-work section}
```
````

**Next:** {first next step from task CLAUDE.md}

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

````

---

## Deep Task View (`--task <name>`)

In addition to the default task row, include:

**1. Per-project progress:**

For each `projects/*/testing/{task}/status.md` (rollup files), extract the Summary table as-is. Show one section per project. Also extract the `## Notes` section.

**2. Remaining-work section** — read verbatim from the task's CLAUDE.md (may be titled "What Has NOT Been Tested", "Known Gaps", "Remaining Work", etc.)

**3. "Next Steps" section** — read verbatim from the task's CLAUDE.md

**4. Recent commits for this task:**

```bash
git log --oneline -5 -- research/{name}/
````

### Output format for deep view:

```markdown
## Task: {name} — Deep View

### Per-Project Progress

For each project with a rollup file, show its Summary table with the original columns (they vary by task type). Include the Notes section as blockquote if non-empty.

**{Project} ({env})** — from `projects/{project}/testing/{task}/status.md`
{Summary table as-is from rollup — preserve original columns}

> {Notes section, if present}

### Remaining

{verbatim from task CLAUDE.md remaining-work section — whatever its title is}

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

**2. Testing status:**

For each `testing/*/status.md` (task rollup files), extract the Summary table.

**3. Analysis files** — list files in `analysis/` with sizes

**4. Recent commits for this project:**

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

### Testing

{For each testing/\*/status.md rollup, show the task name and Summary table}
{If no rollup files exist, show "No test execution data"}

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
