# Create Date-Handling Test Case

Generates a verified, deterministic test case file for a VisualVault Forms calendar field scenario. Runs the test live in Chrome before writing the file so the steps and results are confirmed, not assumed.

## Usage

```
/create-date-test <category-id>
```

Example: `/create-date-test 7-D-isoZ-BRT`

The category ID identifies a row in `tasks/date-handling/forms-calendar/test/matrix.md` (e.g., `1-A-IST`, `9-D-BRT-8`, `7-C-isoNoZ`).

---

## Phase 1 — Load source material

Read the following files before doing anything else:

1. `tasks/date-handling/forms-calendar/test/matrix.md` — find the row matching the given category ID. Extract:
    - The category section (1–13) and its scenario type (popup, typed input, SFV, GFV, round-trip, reload, etc.)
    - The Config column (A/B/C/D) — used to derive field flags in step 2
    - The TZ column — determines which timezone to set in preconditions
    - The input value or test data (Value / Input Value / URL Value column — varies by category)
    - The Expected column — the predicted stored/returned/displayed result
    - The Status (PASS/FAIL/PENDING) and any existing Actual value
    - The Evidence column — if a TC file or results.md link is listed, note it

2. `tasks/date-handling/forms-calendar/test/matrix.md` — **Field Configurations table** (top of file). Map the Config letter from step 1 to its flag values: `enableTime`, `ignoreTimezone`, `useLegacy`. Also note the Test Field name (e.g., DataField5 for Config D) as a cross-check — but the field will be located dynamically in Phase 2 via P6.

3. `tasks/date-handling/forms-calendar/analysis.md` — identify every bug whose trigger conditions match the field config extracted above. For each matching bug, note: its number, name, the exact function where it lives, and what the observable symptom is.

4. `tasks/date-handling/forms-calendar/test/matrix.md` — check the CLAUDE.md section for:
    - The DateTest form template URL
    - The Key JavaScript section (console snippets)

    If the Key JavaScript section is not in matrix.md, read `tasks/date-handling/CLAUDE.md` to get it.

5. **If the Evidence column in step 1 references a `results.md` block** (e.g., `results.md § Test 2.5`): read that block in `tasks/date-handling/forms-calendar/test/results.md` to extract any additional context — exact console output, session notes, observed discrepancies. This supplements Phase 2 but does not replace it.

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

7. Compare captured values against the Expected column from Phase 1. If they differ, note the discrepancy — it means the form or codebase changed since the matrix was last updated. The test file documents the **observed** behavior from this run. Update the matrix row (Actual + Status + Run Date) after writing the TC file.

---

## Phase 3 — Generate the test case file

**Determine filename:**
`tc-{category-id}.md`

- `category-id`: the exact category ID passed as the command argument, with no modification
- Examples: `tc-7-D-isoZ-BRT.md`, `tc-1-A-IST.md`, `tc-9-D-BRT-8.md`

**Output path:** `tasks/date-handling/forms-calendar/test/`

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

Do NOT use: vague labels like "Date Storage & GetFieldValue Output" (describes what is measured, not what is found), field names (DataField5), or function names (getCalendarFieldValue).

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

Rules:

- Row 1 is always: `| 1 | Complete setup | See Preconditions P1–P6 | All P1–P6 checks pass | ☐ |`
- Reference the target field as "the target field (identified in P6)" in the Action column; use `<FIELD_NAME>` in Test Data cells
- For UI interaction steps (click, type, key): Action column is the verb phrase; Input / Command is the value typed or `—`; Expected Result is the immediately observable UI state
- For console capture steps: Action column is a short label (e.g., "Capture raw stored value"); Input / Command is the full inline JS command in backticks; Expected Result is the exact string returned
- For typed-input scenarios: include one row per segment typed (month, day, year, hour, minute), with the progressive field display state as Expected Result
- For calendar popup scenarios: include rows for opening popup, navigating to month, clicking day, verifying time header, clicking Set
- Every Expected Result is an exact string — no ranges, no "approximately", no "contains"
- Display assertions must include the time component when `enableTime=true` (e.g., `03/15/2026 12:00 AM`)
- `GetFieldValue()` row: if Bug #5 applies (enableTime=true, ignoreTimezone=true, useLegacy=false), append `— fake Z (Bug #5)` to the Expected Result cell
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

- Bugs identified in Phase 1 that affect this field config (each bug → one FAIL condition)
- The toISOString environment check (always → FAIL pattern: returns UTC midnight with no shift)
- Any pre-existing state issues (round-trip drift → FAIL pattern if Bug #5 is relevant)
- Any step-execution issues observed during Phase 2 (e.g., wrong time selected, wrong segment clicked)

---

### Section 7 — Related

Table columns: Reference | Location

Always include:

- Link to the matrix row: `matrix.md` — row `{category-id}`
- Link to results.md evidence block only if the Evidence column from Phase 1 referenced one
- Link to the relevant bug section(s) in `analysis.md`
- Links to sibling TC files if they exist (same category, adjacent configs or TZs)
- Link to the field config reference in `CLAUDE.md`

---

## Phase 4 — Update the matrix

After writing the TC file, update the matrix row for this category ID in `matrix.md`:

- **Actual** column: fill with the observed value from Phase 2
- **Status** column: set to `PASS` or `FAIL` based on whether Actual matches Expected
- **Run Date** column: today's date (YYYY-MM-DD)
- **Evidence** column: link to the newly created TC file — `[tc-{category-id}](tc-{category-id}.md)`

---

## Constraints — enforced in every generated file

- **No relative dates.** Every timestamp carries an explicit UTC offset.
- **No field names in prose.** Fields are described by their config properties. Console snippets use `<FIELD_NAME>` as a placeholder resolved via P6.
- **All four OS timezone variants** in P1, every time.
- **Expected result is always on the same row as the step that produces it.** Never in a separate section.
- **Pass criteria are exact string matches** — binary, not approximate.
- **Fail Conditions carry all risk reasoning** and live in their own `## Fail Conditions` section.
- **Display assertions include time** when `enableTime=true`.
- **Source values come from Phase 2 observations**, not from prior sessions or assumptions.
- **Matrix is updated after the TC file is written** — the TC file and the matrix row stay in sync.
