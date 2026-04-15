---
allowed-tools: Bash, Read, Write, Glob
description: Scaffold a new investigation task with standard structure and CLAUDE.md.
---

# Create Task

Scaffold a new investigation task with standard structure and CLAUDE.md. **Where** it goes depends on scope.

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
- Derive the name from the user's description if they provided a question/phrase instead of a name

### 2. Determine scope

**Ask the user** (unless the scope is unambiguous from context):

> **Scope check:** Is this a platform-level investigation (true for any VV environment) or bound to a specific customer/environment?

| Answer                            | Location                               | Sharing                 |
| --------------------------------- | -------------------------------------- | ----------------------- |
| **Platform** (cross-environment)  | `research/<name>/`                     | Shared (team repo)      |
| **Customer-bound** (specific env) | `projects/<customer>/analysis/<name>/` | Personal (private repo) |

**How to judge when the user doesn't specify:**

- "Does VV accept X?" / "How does the platform handle Y?" → **platform**
- "Why is WADNR showing X?" / "Check our client's Y" → **customer-bound**
- If genuinely ambiguous → ask

**If customer-bound:**

- Check `projects/<customer>/` exists. If not, suggest `/@-create-project` first.
- Create `projects/<customer>/analysis/<name>/` with a lightweight `README.md` (not CLAUDE.md — analysis subfolders don't get one per CLAUDE.md standards).
- Skip steps 4–5 (no updates to `research/CLAUDE.md` or root `CLAUDE.md` Active Tasks table).
- Report what was created and stop.

**If platform:** continue to step 3.

### 3. Check for conflicts

- Check `research/<name>/` doesn't already exist
- If it exists, stop and report: "Task already exists at research/<name>/"

### 4. Create directory structure

```
research/<name>/
  CLAUDE.md
  analysis/
```

Note: Don't pre-create `matrix.md`, `test-cases/`, `runs/`, `summaries/`, `results.md` — these emerge as work progresses. Only create what's needed from day one.

### 5. Generate CLAUDE.md

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

research/<name>/
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

### 6. Update research/CLAUDE.md

Read `research/CLAUDE.md`. Add the new task to the "Active Tasks" table.

### 7. Update root CLAUDE.md

Read root `CLAUDE.md`. Add the new task to the "Active Tasks" table.

### 8. Report

For **platform** tasks:

```
Task created: research/<name>/

Structure:
  research/<name>/CLAUDE.md
  research/<name>/analysis/

Next steps:
  1. Define scope — fill in the Scope table in CLAUDE.md
  2. Begin investigation — document findings in analysis/
  3. As test methodology develops, add matrix.md, test-cases/, etc.
```

For **customer-bound** tasks:

```
Analysis folder created: projects/<customer>/analysis/<name>/

Structure:
  projects/<customer>/analysis/<name>/README.md

Next steps:
  1. Begin investigation — document findings here
  2. If this turns out to be platform-level, promote to research/<name>/ with /@-create-task
```

---

## Constraints

1. **Scope first.** Always determine platform vs customer-bound before creating anything. Don't assume `research/` is the right location.
2. **Minimal scaffolding.** Only create the directories and files needed from day one. Don't pre-create empty matrix.md or test-cases/ — they emerge from the investigation.
3. **Follow CLAUDE.md content standard** — generated CLAUDE.md should be concise (~30 lines) with the template structure, not filled with placeholder prose. Customer-bound analysis folders get a `README.md`, not a `CLAUDE.md` (per CLAUDE.md standards — no CLAUDE.md for implementation subfolders).
4. **Sharing boundary** — `research/` is shared (team repo), `projects/` is personal (private repo). The generated CLAUDE.md doesn't need to mention this (it's in the parent docs).
5. **Bug report standard** — point to `docs/standards/bug-report-standard.md` for how to write bug documents.
6. **Promotion path** — if a customer-bound investigation turns out to be platform-level, it can be promoted to `research/` later. Mention this in the customer-bound report.
