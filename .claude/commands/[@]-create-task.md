---
allowed-tools: Bash, Read, Write, Glob
description: Scaffold a new investigation task with standard structure and CLAUDE.md.
---

# Create Task

Create a new cross-cutting investigation task under `tasks/` with the standard structure and CLAUDE.md.

## Usage

```
/@-create-task <name> [--description "short description"]
```

**Example:** `/@-create-task reports --description "VV Reports date filtering and display behavior"`

If description is not provided, prompt the user for a one-line description.

---

## Steps

### 1. Validate the name

- Name must be lowercase-kebab (e.g., `reports`, `workflow-dates`, `node-client`)
- Check `tasks/<name>/` doesn't already exist
- If it exists, stop and report: "Task already exists at tasks/<name>/"

### 2. Create directory structure

```
tasks/<name>/
  CLAUDE.md
  analysis/
```

Note: Don't pre-create `matrix.md`, `test-cases/`, `runs/`, `summaries/`, `results.md` — these emerge as work progresses. Only create what's needed from day one.

### 3. Generate CLAUDE.md

Use this template:

```markdown
# <Name> — <Description>

## What This Is

<Description expanded to 1-2 sentences.>

## Scope

| Component                            | Status | Notes |
| ------------------------------------ | ------ | ----- |
| _(to be filled as scope is defined)_ |        |       |

## Folder Structure
```

tasks/<name>/
analysis/ # Investigation findings, bug reports, fix recommendations

```

## Key Facts

*(Document key facts as they are discovered during investigation.)*

## Confirmed Bugs

*(Add bugs here as they are confirmed, using the index table format:)*

| ID | Name | Severity | File |
|----|------|----------|------|

Each bug gets its own file in `analysis/` following `docs/standards/bug-report-standard.md`.

## Next Steps

1. *(Define initial investigation steps)*
```

### 4. Update tasks/CLAUDE.md

Read `tasks/CLAUDE.md`. Add the new task to the "Active Tasks" table.

### 5. Update root CLAUDE.md

Read root `CLAUDE.md`. Add the new task to the "Active Tasks" table.

### 6. Report

```
Task created: tasks/<name>/

Structure:
  tasks/<name>/CLAUDE.md
  tasks/<name>/analysis/

Next steps:
  1. Define scope — fill in the Scope table in CLAUDE.md
  2. Begin investigation — document findings in analysis/
  3. As test methodology develops, add matrix.md, test-cases/, etc.
```

---

## Constraints

1. **Minimal scaffolding.** Only create the directories and files needed from day one. Don't pre-create empty matrix.md or test-cases/ — they emerge from the investigation.
2. **Follow CLAUDE.md content standard** — generated CLAUDE.md should be concise (~30 lines) with the template structure, not filled with placeholder prose.
3. **Sharing boundary** — task analysis is shared, but runs/summaries/results are personal. The generated CLAUDE.md doesn't need to mention this (it's in the parent `tasks/CLAUDE.md`).
4. **Bug report standard** — point to `docs/standards/bug-report-standard.md` for how to write bug documents.
