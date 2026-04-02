# Create Date-Handling Test Case

Generates a verified, deterministic test case file for a VisualVault Forms calendar field scenario. Runs the test live in Chrome before writing the file so the steps and results are confirmed, not assumed.

## Usage

```
/create-date-test <category-id>
```

Example: `/create-date-test 7-D-isoZ-BRT`

The category ID identifies a row in `tasks/date-handling/forms-calendar/matrix.md` (e.g., `1-A-IST`, `9-D-BRT-8`, `7-C-isoNoZ`).

---

## Phase 1 — Load source material

Read the following files before doing anything else:

1. `tasks/date-handling/forms-calendar/matrix.md` — find the row matching the given category ID. Extract:
    - The category section (1–13) and its scenario type (popup, typed input, SFV, GFV, round-trip, reload, etc.)
    - The Config column (A/B/C/D) — used to derive field flags in step 2
    - The TZ column — determines which timezone to set in preconditions
    - The input value or test data (Value / Input Value / URL Value column — varies by category)
    - The Expected column — the predicted stored/returned/displayed result
    - The Status (PASS/FAIL/PENDING) and any existing Actual value
    - The Evidence column — if a TC file or results.md link is listed, note it

2. `tasks/date-handling/forms-calendar/matrix.md` — **Field Configurations table** (top of file). Map the Config letter from step 1 to its flag values: `enableTime`, `ignoreTimezone`, `useLegacy`. Also note the Test Field name (e.g., Field5 for Config D) as a cross-check — but the field will be located dynamically in Phase 2 via P6.

3. `tasks/date-handling/forms-calendar/analysis.md` — identify every bug whose trigger conditions match the field config extracted above. For each matching bug, note: its number, name, the exact function where it lives, and what the observable symptom is.

4. `tasks/date-handling/forms-calendar/matrix.md` — check the CLAUDE.md section for:
    - The DateTest form template URL
    - The Key JavaScript section (console snippets)

    If the Key JavaScript section is not in matrix.md, read `tasks/date-handling/CLAUDE.md` to get it.

5. **If the Evidence column in step 1 references a `results.md` block** (e.g., `results.md § Test 2.5`): read that block in `tasks/date-handling/forms-calendar/results.md` to extract any additional context — exact console output, session notes, observed discrepancies. This supplements Phase 2 but does not replace it.

Do not proceed to Phase 2 until all required files are read.

---

## Phase 2 — Chrome live verification

1. Call `tabs_context_mcp` to get current tab state. Create a new tab with `tabs_create_mcp`.

2. Navigate to the **DateTest form template URL** (from Phase 1). Always use the template URL — never a saved record URL. The template creates a fresh instance with all fields empty, ensuring no pre-existing state contaminates the test.

3. Wait for the form to finish loading (tab title changes from "Viewer" to "DateTest-XXXXXX").

4. Run precondition checks via `javascript_tool`. Record the actual result of each:

    **TZ check:**

    ```javascript
    new Date().toString();
    ```

    Extract the GMT offset (e.g., `GMT-0300`). Compare against the TZ column from Phase 1 — if they don't match, stop and instruct the user to change the system timezone and restart Chrome before proceeding.

    **V1/V2 check:**

    ```javascript
    VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
    ```

    If this returns `true`, the test will run under V2 behavior. Note this — it does not block test execution, but the test file must document the actual code path, not an assumed one.

    **Field lookup by config:**

    ```javascript
    Object.values(VV.Form.VV.FormPartition.fieldMaster)
      .filter(f => f.fieldType === 13
        && f.enableTime === <enableTime from Phase 1>
        && f.ignoreTimezone === <ignoreTimezone from Phase 1>
        && f.useLegacy === <useLegacy from Phase 1>
        && f.enableInitialValue === <enableInitialValue from Phase 1>)
      .map(f => f.name)
    ```

    Substitute the actual boolean values from Phase 1. Record the returned field name(s). Use the first result as `<FIELD_NAME>` for the rest of Phase 2. If no field matches, stop and report — the test form does not support this config.

5. Execute the test scenario in Chrome. The scenario type comes from the category section identified in Phase 1:

    **Calendar popup scenario (Cat 1):**
    - Click the calendar icon next to the target field
    - Navigate to the target month and click the target day
    - The popup auto-advances to the Time tab — verify the time header before clicking Set
    - To click Set: the modal is self-contained and displays all controls without internal scrolling. If the Set button is not visible, scroll the PAGE (use the browser scrollbar or drag outside the modal) to bring the full modal into view. Do not scroll inside the time picker columns — that changes the selected time.
    - Click Set

    **Typed input scenario (Cat 2):**
    - Click the target field input
    - Type the date segment by segment (month, day, year) using the format `MM/dd/yyyy`
    - Press Tab to confirm

    **SetFieldValue / round-trip scenario (Cat 7, 9, 10):**
    - Run the relevant JS via `javascript_tool` directly

    **GetFieldValue scenario (Cat 8):**
    - Set a known value first if needed, then call GetFieldValue and capture the return

    **Form load / server reload scenario (Cat 3, 5, 6):**
    - Navigate to the saved record URL if applicable, or observe the field's initial state on the template form

6. After the action, capture all outputs via `javascript_tool` in a single call:

    ```javascript
    ({
      raw: VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>'),
      api: VV.Form.GetFieldValue('<FIELD_NAME>'),
      isoRef: new Date(<year>, <month-0-indexed>, <day>, 0, 0, 0).toISOString()
    })
    ```

    Take a screenshot to capture the display value in the form input.

7. Compare captured values against the Expected column from Phase 1. Note any discrepancy — it means the live system differs from predicted/intended behavior. Observed values go into `results.md` (Phase 5) and the matrix Actual column. The TC file's Expected column always reflects **correct/intended** behavior regardless of what Phase 2 observed. Update the matrix row (Actual + Status + Run Date) after writing the TC file.

---

## Phase 3 — Generate the test case file

**Determine filename:**
`tc-{category-id}.md`

- `category-id`: the exact category ID passed as the command argument, with no modification
- Examples: `tc-7-D-isoZ-BRT.md`, `tc-1-A-IST.md`, `tc-9-D-BRT-8.md`

**Output path:** `tasks/date-handling/forms-calendar/test-cases/`

---

### Section 1 — Title

```
# TC-{CATEGORY-ID} — Config {X}, {Input Method}, {TZ}: {storage behavior}; {API/developer behavior} ({Bug #N if applicable})
```

Five required elements — all must be present:

- **Config {X}** — the config short name (A/B/C/D) from the Field Configurations table. Determines which bugs apply.
- **Input Method** — the scenario type: `Calendar Popup`, `Typed Input`, `Round-Trip`, `SetFieldValue`, `Form Load`
- **TZ** — timezone code: `BRT`, `IST`, `UTC`. Always required — behavior differs per timezone.
- **Storage behavior** — what the test finds about the raw stored value. State the behavioral finding, not the measurement: `local midnight stored`, `same storage as popup`, `date shifts -3h per trip`. If storage is correct for this config, say so explicitly.
- **API/developer behavior** — what GetFieldValue or SetFieldValue does. Include bug reference if applicable: `GetFieldValue appends fake Z (Bug #5)`, `no drift (Bug #2 absent)`.

Separate the storage and API claims with a semicolon. Keep the full title under ~100 characters.

Do NOT use: vague labels like "Date Storage & GetFieldValue Output" (describes what is measured, not what is found), field names (Field5), or function names (getCalendarFieldValue).

---

### Section 2 — Environment Specs

Table with these rows. All values come from Phase 2 observations, not assumptions:

| Parameter               | Required Value                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                            |
| **System Timezone**     | `<IANA name>` — UTC±X, `<short name>`. Note if DST is active.                                       |
| **Platform**            | VisualVault FormViewer, Build `<number from top-right of form page>`                                |
| **VV Code Path**        | V1 or V2 — `useUpdatedCalendarValueLogic = <value>` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=<>`, `ignoreTimezone=<>`, `useLegacy=<>`, `enableInitialValue=<>`                       |
| **Scenario**            | `<date>`, `<TZ short>` midnight — `<local timestamp with explicit offset>` = `<UTC equivalent>` UTC |

---

### Section 3 — Preconditions

Number each step P1–PN. Always include all of the following.

**P1 — Set system timezone to `<IANA name>`:**

Include all four OS variants every time. Never assume the tester's OS.

macOS:

```bash
sudo systemsetup -settimezone <IANA name>
```

Windows (run as Administrator):

```bat
tzutil /s "<Windows TZ ID>"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "<Windows TZ ID>"
```

Linux:

```bash
sudo timedatectl set-timezone <IANA name>
```

Common mappings:

- `America/Sao_Paulo` → Windows: `"E. South America Standard Time"`
- `Asia/Calcutta` → Windows: `"India Standard Time"`
- `Europe/London` → Windows: `"GMT Standard Time"`
- `UTC` → Windows: `"UTC"`

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains <expected GMT offset>
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
<template URL from CLAUDE.md>
```

**P5 — Verify code path** (DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
  .filter(f => f.fieldType === 13
    && f.enableTime === <value>
    && f.ignoreTimezone === <value>
    && f.useLegacy === <value>
    && f.enableInitialValue === <value>)
  .map(f => f.name)
// Expected: ["<field name observed in Phase 2>"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

### Section 5 — Test Steps

A single table merging actions and expected results. Every row that produces a measurable output has its expected result in the same row — the tester never jumps to another section to know what to look for.

Table columns: `#` | `Action` | `Test Data` | `Expected Result` | `✓`

**Expected Results always reflect correct/intended behavior** — not what a buggy system produces. If a known bug affects a step and causes the observed value to differ from Expected, do NOT change the Expected Result to match the buggy output. The test step is intended to FAIL when a bug is present. Document the buggy value in the Fail Conditions section (Section 6) instead.

**Determining correct Expected values:** Use Phase 1 source material (analysis.md bug descriptions, the matrix's intended semantics) to establish what the system _should_ do — not what Phase 2 observed. For storage steps: the correct raw value is the date formatted as intended for this config (e.g., date-only string for `enableTime=false`, local midnight datetime without Z for non-legacy `enableTime=true`). For `GetFieldValue()`: the correct return is always the raw stored value with no added transformation.

Rules:

- Row 1 is always: `| 1 | Complete setup | See Preconditions P1–P6 | All P1–P6 checks pass | ☐ |`
- Reference the target field as "the target field (identified in P6)" in the Action column; use `<FIELD_NAME>` in Test Data cells
- For UI interaction steps (click, type, key): Action column is the verb phrase; Input / Command is the value typed or `—`; Expected Result is the immediately observable UI state
- For console capture steps: Action column is a short label (e.g., "Capture raw stored value"); Input / Command is the full inline JS command in backticks; Expected Result is the exact correct string
- For typed-input scenarios: include one row per segment typed (month, day, year, hour, minute), with the progressive field display state as Expected Result
- For calendar popup scenarios: include rows for opening popup, navigating to month, clicking day, verifying time header, clicking Set
- Every Expected Result is an exact string — no ranges, no "approximately", no "contains"
- Display assertions must include the time component when `enableTime=true` (e.g., `03/15/2026 12:00 AM`)
- `GetFieldValue()` row: Expected Result is the raw stored value with no added transformation. If Bug #5 is active (enableTime=true, ignoreTimezone=true, useLegacy=false), the observed value will differ — document the buggy observed value as FAIL-N in the Fail Conditions section, not here.
- `toISOString()` row: append `— confirms <TZ> active` to the Expected Result cell
- The `toISOString()` row is always the last row
- The `✓` column uses `☐` in every row
- Add a blockquote note below the table for any procedural warning that does not fit a single cell (e.g., modal scroll behavior, segment click targeting)

---

### Section 6 — Fail Conditions

One entry per failure mode at `## Fail Conditions` heading level (not nested under Test Steps).

Each entry has three parts:

1. Bold label: `FAIL-N (short description):`
2. The observed symptom — an exact value or pattern that appeared
3. Bullet: `- Interpretation:` root cause explanation + recovery action

Derive from:

- Bugs identified in Phase 1 that affect this field config — each bug becomes one FAIL condition. For each bug, the FAIL condition must include: (a) the exact value the tester will observe when the bug is present, and (b) what the Expected Result shows (correct behavior). This gives the tester a complete picture: Expected tells them what should happen; the FAIL condition tells them what the buggy system produces instead.
- The toISOString environment check (always → FAIL pattern: returns UTC midnight with no shift)
- Any pre-existing state issues (round-trip drift → FAIL pattern if Bug #5 is relevant)
- Any step-execution issues observed during Phase 2 (e.g., wrong time selected, wrong segment clicked)
- For scenarios where no bugs apply, Fail Conditions cover only environmental/setup issues (wrong TZ, V2 active, wrong field) — not bug symptoms.

---

### Section 7 — Related

Table columns: Reference | Location

Always include:

- Link to the matrix row: `matrix.md` — row `{category-id}`
- Link to the results.md test block added in Phase 5 — `results.md § Test {N.M}`
- Link to the relevant bug section(s) in `analysis.md`
- Links to sibling TC files if they exist (same category, adjacent configs or TZs)
- Link to the field config reference in `CLAUDE.md`

---

## Phase 4 — Update the matrix

After writing the TC file, update `matrix.md` in two places:

**1. The category row:**

- **Actual** column: fill with the observed value from Phase 2
- **Status** column: set to `PASS` or `FAIL` based on whether Actual matches Expected
- **Run Date** column: today's date (YYYY-MM-DD)
- **Evidence** column: link to the summary file created in Phase 5B — `[summary](summaries/tc-{category-id}.md)`. For PENDING rows where this is the first run, create the summary first (Phase 5B), then set this link.

If the live result differs from the Expected column prediction, also update Expected to reflect the observed value and add a parenthetical note (e.g., `(prediction corrected 2026-03-30)`). Do the same for any sibling rows whose Expected was derived from the now-disproven prediction.

**2. The Coverage Summary table** (top of the matrix):

Update the PASS/FAIL/PENDING/BLOCKED counts for the affected category row to reflect the new status. The totals row does not need updating unless you want to keep it precise.

---

## Phase 5A — Generate the run file

Create `tasks/date-handling/forms-calendar/runs/tc-{category-id}-run-{N}.md` from the Phase 2 observations. N is the next sequential integer for this TC (check whether previous run files exist first).

**Run files are immutable after creation.** Never modify a run file — create a new one for each re-run.

```markdown
# TC-{ID} — Run {N} | {YYYY-MM-DD} | {TZ short} | {PASS / FAIL-N}

**Spec**: [tc-{id}.md](../test-cases/tc-{id}.md) | **Summary**: [summary](../summaries/tc-{id}.md)

## Environment

| Parameter | Value                                                |
| --------- | ---------------------------------------------------- |
| Date      | {YYYY-MM-DD}                                         |
| Tester TZ | {IANA name} — UTC±X ({short})                        |
| Code path | V{1 or 2} (`useUpdatedCalendarValueLogic = {value}`) |
| Platform  | VisualVault FormViewer, Build {N}                    |

## Preconditions Verified

| Check        | Command                                                     | Result                                        |
| ------------ | ----------------------------------------------------------- | --------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"{actual output}"` — contains GMT{±HHMM} ✓/✗ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `{value}` → V{N} active ✓/✗                   |
| Field lookup | filter snippet                                              | `["{field name}"]` ✓/✗                        |

## Step Results

Include only steps that have an Expected value in the spec (skip pure UI navigation rows):

| Step # | Expected       | Actual       | Match           |
| ------ | -------------- | ------------ | --------------- |
| {N}    | `"{expected}"` | `"{actual}"` | PASS / **FAIL** |

## Outcome

**{PASS / FAIL-N}** — {one line referencing the Fail Condition label from the spec and what it means}

## Findings

- Whether actual matched matrix prediction; if not, what the correct behavior is
- Which bugs confirmed or ruled out (reference bug number)
- Knock-on corrections to sibling matrix rows if prediction was wrong
- Recommended next action
```

---

## Phase 5B — Create or update the summary file

**Path:** `tasks/date-handling/forms-calendar/summaries/tc-{category-id}.md`

If this is the **first run** for the TC (file does not exist): create it.
If this is a **re-run** (file exists): open it and append a row to the Run History table + update Current Status and Current Interpretation.

```markdown
# TC-{ID} — Summary

**Spec**: [tc-{id}.md](../test-cases/tc-{id}.md)
**Current status**: {PASS / FAIL-N} — last run {YYYY-MM-DD} ({TZ short})
**Bug surface**: {Bug #N name, or "none — control/passing scenario"}

## Run History

| Run | Date         | TZ         | Outcome         | File                              |
| --- | ------------ | ---------- | --------------- | --------------------------------- |
| 1   | {YYYY-MM-DD} | {TZ short} | {PASS / FAIL-N} | [run-1](../runs/tc-{id}-run-1.md) |

## Current Interpretation

{One paragraph: what the run history implies. Examples: "Bug #7 confirmed in IST. Awaiting fix verification." / "Passes consistently — no bug in UTC+0 control." / "Run 2 (PASS) confirms Bug #7 fix works for Config A IST."}

## Next Action

{One line: what happens next. E.g., "Re-run after Bug #7 fix deployed." / "No further action — closed PASS." / "Run 1-F-IST (sibling) next."}
```

---

## Phase 5C — Update results.md session index

`results.md` is now a **frozen historical archive** for sessions run before 2026-04-01. New runs are recorded in run files (5A) and summaries (5B).

The only update to results.md for new runs is a **one-line index entry** in the session log section at the end of the file. Find the current session heading (date + TZ match) or create a new one, then append:

```
- {YYYY-MM-DD} [TC-{id} Run {N}](runs/tc-{id}-run-N.md) — {TZ short} — {PASS / FAIL-N} — {one-phrase description}
```

Session heading format (create only if none exists for today's date + TZ):

```markdown
## Session {YYYY-MM-DD} ({TZ short})

**Purpose**: {one sentence}
**Key outcomes**: {fill in after all tests for the session are done}
```

---

## Constraints — enforced in every generated file

- **No relative dates.** Every timestamp carries an explicit UTC offset.
- **No field names in prose.** Fields are described by their config properties. Console snippets use `<FIELD_NAME>` as a placeholder resolved via P6.
- **All four OS timezone variants** in P1, every time.
- **Expected result is always on the same row as the step that produces it.** Never in a separate section.
- **Pass criteria are exact string matches** — binary, not approximate.
- **Fail Conditions carry all risk reasoning** and live in their own `## Fail Conditions` section.
- **Display assertions include time** when `enableTime=true`.
- **Expected Results in the TC file come from correct/intended behavior**, derived from analysis.md bug descriptions and the matrix's intended semantics — not from what the buggy system currently produces. Phase 2 observed values go into the run file (Phase 5A) and the matrix Actual column. Never copy a buggy observed value into the TC file's Expected Result column.
- **TC spec files are immutable after creation.** Never modify a TC file to record execution results, update actual values, or add findings. All execution data goes into run files (5A) and summaries (5B). The only legitimate reason to edit a TC file is to correct a spec error.
- **Run files are immutable after creation.** Never modify a run file. Create a new run file (`run-2`, `run-3`) for each re-execution.
- **Checkbox (☐) column is a transient execution aid.** Fill checkboxes during a run session to track progress, but do NOT commit TC files with filled checkboxes. The permanent execution record is the run file, not the ☐ column state.
- **Matrix Evidence column links to the summary file**, not the TC spec. Format: `[summary](summaries/tc-{id}.md)`. For PENDING slots with no summary yet, link to the spec: `[spec](tc-{id}.md)`.
- **results.md is a frozen archive** for sessions before 2026-04-01. New runs append only a one-line index entry (Phase 5C). Do not add narrative blocks to results.md for new tests.
- **No Findings or Key Finding section in TC files.** TC files are test procedures, not analytical records. Observations about whether the matrix prediction was right or wrong, which bugs were confirmed, and what sibling rows imply belong exclusively in run files (Phase 5A). The title encodes the behavioral finding; Fail Conditions encode the risk reasoning. Do not add any other analytical sections to TC files.
