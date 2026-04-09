---
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
description: Audit and maintain all CLAUDE.md files for health, accuracy, and standard compliance.
---

# CLAUDE.md Maintenance

Audit all CLAUDE.md files in the repo against the content standard defined in the root CLAUDE.md § "CLAUDE.md Convention". Detect bloat, staleness, misplacement, duplicated content, and standard violations. Then apply fixes — relocating content to where it belongs before removing it from CLAUDE.md files.

**Two modes:**

- Default: full audit + apply fixes
- `--audit-only`: report issues without making changes

Severity levels:

- **CRITICAL** — actively degrading context quality (bloated file, stale structure, broken pointers)
- **WARNING** — deviates from standard (over target size, contains excludable content)
- **INFO** — minor observations (could be tighter, optional improvement)

---

## Phase 1: Inventory

### 1A. Find all CLAUDE.md files

```bash
find . -name 'CLAUDE.md' -not -path '*/node_modules/*' -not -path '*/.git/*'
```

For each file found, record:

- Path
- Tier classification: **Root** (repo root), **Scope** (top-level topic folder), **Task** (tasks/_/), **Project** (projects/_/)
- Line count (`wc -l`)
- Last modified date (`git log -1 --format='%ai' -- <path>`)

### 1B. Check placement — missing CLAUDE.md

Scan for scope folders that SHOULD have a CLAUDE.md but don't:

```bash
# Top-level topic folders
for d in tools testing tasks projects docs scripts; do
  [ -f "$d/CLAUDE.md" ] || echo "MISSING: $d/CLAUDE.md"
done

# Individual tasks
for d in tasks/*/; do
  [ -f "$d/CLAUDE.md" ] || echo "MISSING: ${d}CLAUDE.md"
done

# Individual projects
for d in projects/*/; do
  [ -f "$d/CLAUDE.md" ] || echo "MISSING: ${d}CLAUDE.md"
done
```

Flag missing files as **CRITICAL** — a scope folder without context forces Claude to guess.

### 1C. Check placement — unwanted CLAUDE.md

Check if any CLAUDE.md exists in implementation subfolders where it shouldn't:

- `tools/extract/`, `tools/audit/`, `tools/helpers/`, `tools/runners/`, `tools/inventory/`, `tools/generators/`
- `testing/specs/`, `testing/helpers/`, `testing/fixtures/`, `testing/pipelines/`, `testing/config/`, `testing/reporters/`
- `projects/*/extracts/`, `projects/*/analysis/`
- `tasks/*/analysis/`, `tasks/*/runs/`, `tasks/*/summaries/`, `tasks/*/test-cases/`
- `docs/architecture/`, `docs/reference/`, `docs/guides/`, `docs/standards/`

Flag as **WARNING** — content should be in the parent's CLAUDE.md instead.

---

## Phase 2: Size Audit

For each CLAUDE.md, check line count against the tier target:

| Tier         | Target       | Warning at | Critical at |
| ------------ | ------------ | ---------- | ----------- |
| Root         | ~150 lines   | >200       | >300        |
| Scope        | ~30-60 lines | >80        | >120        |
| Task/Project | flexible     | >200       | >400        |

Flag over-target files with severity level and the delta (e.g., "Root CLAUDE.md: 410 lines, target ~150, +260 over").

---

## Phase 3: Content Standard Audit

For each CLAUDE.md, check for content that violates the standard. Read the file, then scan for these anti-patterns:

### 3A. File inventories

Detect: lines matching patterns like `    filename.js    # description` or markdown tables with individual file listings (more than 10 rows of file→description).

Exception: subfolder-level structure tables (tools/ listing export/, runners/, etc.) are fine — those are structural, not file inventories.

Test: could this be replaced by `ls <directory>`? If yes, it's a file inventory.

Flag as **WARNING** with count of inventory lines.

### 3B. Code snippets

Detect: fenced code blocks (```) longer than 5 lines that contain JavaScript, JSON, or shell code.

Exceptions:

- Dev commands (bash one-liners for running tools) — these are quick reference
- Structure trees (`\nnodeV2/\n  tools/\n...`) — these are structural context

Test: is this a copy of code that lives in a source file? If yes, it should be a pointer.

Flag as **WARNING** with the block location and suggested pointer.

### 3C. Line number references

Detect: patterns like `line ~\d+`, `lines \d+-\d+`, `(line \d+)`, `Line \d+`.

These go stale on any code edit. Flag as **WARNING**.

### 3D. Progress counts

Detect: patterns like `\d+/\d+ (done|complete|tested)`, `\d+P[,/]\d+F`, `PASS/FAIL` tallies, `~\d+ of ~\d+`.

These change every session. They belong in matrix.md or task status files, not CLAUDE.md.

Flag as **WARNING** with suggestion to reference the matrix file instead.

### 3E. Config file contents

Detect: JSON blocks that look like .env.json structure, field configuration tables with 8+ rows mapping to specific field IDs.

Test: does this content exist in a config file (`.env.example.json`, `vv-config.js`, `ws-config.js`)? If yes, replace with pointer.

Flag as **WARNING**.

### 3F. Duplicated content

Two checks:

1. **CLAUDE.md vs README.md in same directory**: If both exist, compare section headings (`## Heading`). Overlapping headings suggest duplicated content. Read overlapping sections and confirm.
2. **Root CLAUDE.md vs scope CLAUDE.md**: For each scope CLAUDE.md, check if the root CLAUDE.md has a section covering the same topic in detail (beyond a 1-line pointer). If so, the detail should live in only one place.

Flag as **WARNING** with the overlapping sections and which file is authoritative.

### 3G. Broken pointers

For each relative link or file reference in a CLAUDE.md (patterns: `[text](path)`, backtick paths), verify the target exists. Strip `#anchor` suffixes before checking — anchor validity can't be verified from the filesystem.

```bash
# Extract markdown links and verify (macOS-compatible)
grep -oE '\[.*\]\([^)]+\)' file | grep -oE '\([^)]+\)' | tr -d '()' | grep -v '^http' | while read target; do
  target_file=$(echo "$target" | sed 's/#.*//')
  [ -z "$target_file" ] || [ -e "$target_file" ] || echo "BROKEN: $target"
done
```

Flag broken file links as **CRITICAL**. Anchor-only links (`#section`) are skipped (can't verify).

### 3H. Structure drift

For each CLAUDE.md that contains a subfolder structure table, verify the listed subfolders still exist:

```bash
# For each subfolder mentioned in the table, check if the directory exists
```

Flag missing directories as **CRITICAL** (misleading structure). Flag unlisted directories as **INFO** (structure table may need updating).

### 3I. Hardcoded count verification

Extract numbers paired with countable nouns from each CLAUDE.md and verify against the filesystem:

**Known count-to-source mappings:**

| Pattern in CLAUDE.md          | Verification command                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| "N spec files"                | `ls testing/specs/date-handling/*.spec.js \| wc -l`                                              |
| "N scripts" (WADNR context)   | `ls projects/wadnr/extracts/web-services/scripts/*.js \| wc -l`                                  |
| "N globals" / "N functions"   | `ls projects/wadnr/extracts/global-functions/*.js \| wc -l`                                      |
| "N templates" (WADNR context) | `ls projects/wadnr/extracts/form-templates/*.xml \| wc -l`                                       |
| "N schedules"                 | `jq '.totalItems' projects/wadnr/extracts/schedules/manifest.json`                               |
| "N confirmed bugs"            | count `bug-*.md` + `ws-bug-*.md` + `formdashboard-bug-*.md` excluding `*-fix-recommendations.md` |
| "N commands"                  | `ls .claude/commands/*.md \| wc -l`                                                              |

For other numbers, look for patterns like `\d+ (spec|script|template|bug|global|schedule|field|function|command)` and attempt to verify by finding the corresponding directory or file.

Flag mismatches as **WARNING**: "Claims N items, actually M" with the file and line. Group related stale counts (e.g., if 4 files all say "271 scripts" and actual is 251, report once with all 4 file locations).

### 3J. Scope change detection

For each CLAUDE.md, check if its scope directory has had **structural changes** (new files added, files deleted, files renamed) since the CLAUDE.md was last updated:

```bash
claude_md_date=$(git log -1 --format='%aI' -- "$scope/CLAUDE.md")
# Find structural changes in scope since CLAUDE.md was last modified
git log --since="$claude_md_date" --diff-filter=ADR --name-only --format="" -- "$scope/" | sort -u | grep -v 'CLAUDE.md'
```

If structural changes exist, flag as **WARNING**: "N structural changes in {scope}/ since CLAUDE.md was last updated" and list them so the maintainer knows what to address.

Ignore changes to files inside subdirectories that aren't described by this CLAUDE.md (e.g., changes inside `tasks/date-handling/forms-calendar/runs/` don't affect `tasks/CLAUDE.md`).

**Noise filter:** Ignore changes from the same commit that created or last modified the CLAUDE.md itself. Initial file moves (e.g., from a restructure) that happen in the same commit as CLAUDE.md creation are not "unaddressed changes."

**Shell note:** Use `wc -l | tr -d ' '` for counts instead of `grep -c` in zsh — `grep -c` appends a newline that breaks integer comparisons.

### 3K. Dev command verification (root CLAUDE.md only)

For the root CLAUDE.md, verify the development commands section is accurate:

1. **Extract `npm run` commands** from the CLAUDE.md dev commands section. For each, check it exists in `package.json` scripts. Flag missing as **CRITICAL** (broken doc).

2. **Extract `node path/file.js` commands** from CLAUDE.md. Verify each file exists on disk. Flag missing as **CRITICAL**.

3. **Check for new `package.json` scripts** not mentioned in CLAUDE.md. Compare `package.json` script names (exact match) against commands documented in CLAUDE.md. Flag undocumented user-facing scripts as **INFO** (potential gap). Internal scripts (`prepare`, `prepublishOnly`) can be ignored.

---

## Phase 4: Report

Generate a consolidated report grouped by file, then by severity:

```
## CLAUDE.md Health Report

### /CLAUDE.md (Root — 410 lines, target ~150)

- CRITICAL: 260 lines over target
- WARNING: 3 code blocks >5 lines (lines 45-62, 148-165, 270-285)
- WARNING: 12 file inventory lines in repo structure tree
- WARNING: Progress counts detected (line 87: "~220 of ~246 test cases")
- WARNING: Claims "21 spec files", actual count is 23
- INFO: .env.json structure block could be replaced with pointer to .env.example.json
- INFO: npm script "test:pw:pst" in package.json not documented in dev commands

### tools/CLAUDE.md (Scope — 32 lines, target ~30-60)

- OK: within size target, no anti-patterns
- INFO: 2 structural changes since last update (new-tool.js added, old-probe.js deleted)

### tasks/date-handling/CLAUDE.md (Task — 812 lines, target <400)

- CRITICAL: 412 lines over target
- WARNING: 14 code blocks >5 lines
- WARNING: 47 line number references
- WARNING: 23 progress count instances
- WARNING: V1/V2 comparison table duplicates content in analysis/overview.md
- WARNING: Bug descriptions duplicate content in analysis/bug-*.md
...

## Summary

| Severity | Count | Category |
|----------|-------|----------|
| CRITICAL | 3 | size (2), broken pointer (1) |
| WARNING | 18 | bloat (10), stale counts (3), duplication (3), drift (2) |
| INFO | 5 | gaps (3), optimization (2) |
```

If `--audit-only`, stop here. Otherwise proceed to Phase 5.

---

## Phase 5: Apply Fixes

For each finding, apply fixes in this order:

### 5A. Ensure content exists elsewhere before removing

**IMPORTANT**: Never delete content from a CLAUDE.md unless you have verified it exists in its proper location. For each block to be removed:

1. Identify where it should live (analysis doc, config file, README, etc.)
2. Read that target file and confirm the content is there
3. If it's NOT there, **move it** to the target file first, then remove from CLAUDE.md
4. If the target file doesn't exist, create it with the relocated content

### 5B. Apply fixes by category

| Finding                   | Fix                                                                  |
| ------------------------- | -------------------------------------------------------------------- |
| Over size target          | Apply 5C-5G reductions, re-measure                                   |
| File inventory            | Replace with `ls <dir>` note or subfolder-only table                 |
| Code snippet (>5 lines)   | Replace with pointer: "See `path/to/file`"                           |
| Line number references    | Remove line numbers, keep the function/concept reference             |
| Progress counts           | Replace with pointer: "See `matrix.md` for current status"           |
| Config contents           | Replace with pointer: "See `.env.example.json` for structure"        |
| Duplicated content        | Keep in the authoritative location, replace the other with a pointer |
| Broken pointers           | Fix the path or remove the dead link                                 |
| Structure drift           | Update the structure table to match reality                          |
| Missing CLAUDE.md         | Create one following the tier template                               |
| Stale count               | Update the number to match current filesystem count                  |
| Scope changes unaddressed | Update CLAUDE.md structure/description to reflect new/removed files  |
| Missing dev command       | Add the command to dev commands section, or remove broken reference  |
| New undocumented script   | Add to dev commands if user-facing; ignore if internal               |

### 5C. Root CLAUDE.md — specific reductions

When trimming the root CLAUDE.md toward ~150 lines:

1. **Repo structure tree**: Replace detailed file listings with scope-folder-only tree. Each scope folder gets one line + its CLAUDE.md handles the rest.
2. **Section details**: Replace multi-paragraph sections (Playwright testing, WS testing, authentication) with 1-2 sentence summary + pointer to the scope CLAUDE.md or doc that covers it.
3. **Tables with >6 rows**: Check if the table content lives in a more detailed file. If yes, summarize + pointer.
4. **.env.json structure**: Replace with pointer to `.env.example.json`.
5. **VV Client API table**: Replace with pointer to `lib/VVRestApi/VVRestApiNodeJs/VVRestApi.js`.

### 5D. Task CLAUDE.md — specific reductions

When trimming a task CLAUDE.md:

1. **Bug descriptions**: Keep a bug index table (ID, name, severity, link). Move full descriptions to analysis docs if not already there.
2. **Code path traces**: Move to analysis docs. Keep only concept-level references.
3. **V1/V2 tables**: Move to `analysis/overview.md`. Keep 1-sentence summary.
4. **Per-category progress**: Replace with "See `matrix.md` for current status" + overall summary line.
5. **Test form URLs**: Replace with "See `testing/fixtures/vv-config.js`".
6. **JavaScript snippets**: Replace with "See `docs/reference/vv-form-api.md`" or keep only essential 1-2 liners.

### 5E. Scope CLAUDE.md — specific reductions

If a scope CLAUDE.md is over 60 lines:

1. Check for content that duplicates root CLAUDE.md — remove, add "See root CLAUDE.md" if needed.
2. Check for detailed descriptions that could be one line + pointer.

---

## Phase 6: Verification

After applying fixes:

1. Re-run the size audit — all files should be within target (or closer)
2. Re-run the anti-pattern scan — findings should be resolved
3. Re-run the broken pointer check — no new broken links introduced
4. Verify no content was lost — every removed block should have a home

```bash
# Quick size check
find . -name 'CLAUDE.md' -not -path '*/node_modules/*' | while read f; do
  echo "$(wc -l < "$f") $f"
done | sort -rn
```

Report final state:

```
## Post-Maintenance Summary

| File | Before | After | Target | Status |
|------|--------|-------|--------|--------|
| /CLAUDE.md | 410 | 148 | ~150 | OK |
| tasks/date-handling/CLAUDE.md | 812 | 185 | <400 | OK |
| tools/CLAUDE.md | 32 | 32 | ~30-60 | OK |
...
```

---

## Constraints

1. **Never delete without relocation.** Content removed from CLAUDE.md must exist somewhere else first. If it doesn't, move it before removing.
2. **Preserve the voice.** When rewriting sections, keep the same factual content and style — just make it more concise.
3. **One commit.** All CLAUDE.md changes go in a single commit: "Maintain CLAUDE.md files: trim to standard, relocate content".
4. **Don't touch task analysis docs.** If content is relocated to analysis docs, append it cleanly — don't reorganize those files.
5. **Audit first, always.** Even in fix mode, run the full audit before making any changes. Present the report to the user and confirm before applying.
