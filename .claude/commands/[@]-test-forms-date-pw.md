# Create Playwright Date-Handling Test Case

Generates a verified, deterministic test case file for a VisualVault Forms calendar field scenario. Uses Playwright CLI for browser automation instead of Chrome MCP tools. Playwright's `timezoneId` context option simulates timezones without system changes.

## Two Automation Layers

This command is **Layer 1** — it uses `playwright-cli` (interactive CLI) to verify behavior live and generate artifacts. The generated `.spec.js` files are **Layer 2** — reusable Playwright tests runnable via `npx playwright test` for regression.

|            | Layer 1 (this command)                               | Layer 2 (test runner)                              |
| ---------- | ---------------------------------------------------- | -------------------------------------------------- |
| Tool       | `playwright-cli`                                     | `@playwright/test` via `npx playwright test`       |
| Purpose    | Exploratory testing + artifact generation            | Headless regression testing                        |
| Auth state | `testing/config/auth-state.json`                     | `testing/config/auth-state-pw.json`                |
| Outputs    | TC spec (.md) + run file + summary + test-data entry | testing/test-results/ + testing/playwright-report/ |

### Output separation: manual vs automated

This command produces **two independent artifact types**:

1. **TC spec file** (`.md` in `test-cases/`) — a **manual testing procedure** written for a human tester using Chrome + DevTools console. **Must not mention Playwright, `playwright-cli`, `timezoneId`, or any automation tooling.** The tester follows P1–P6 preconditions, opens the form in Chrome, runs console commands, and visually inspects results. Browser = "Google Chrome, latest stable (V8 engine)".

2. **test-data.js entry** + parameterized spec file (`cat-*.spec.js`) — the **automated Playwright regression test**. This is where Playwright config, `timezoneId`, browser engine matrix, and automation details belong. Run files (Phase 5A) document how the command _verified_ the values (Playwright CLI) and may reference Playwright tooling.

The TC spec is the authoritative test procedure. The Playwright test is a regression harness derived from the same expected values. They share expected values but have completely different audiences and tooling references.

See `testing/specs/date-handling/README.md` and `docs/guides/playwright-testing.md` for full documentation.

## Usage

```
/test-forms-date-pw <category-id> [category-id-2 ...] [--skip-verify]
```

**Single test (default):** `/test-forms-date-pw 7-D-isoZ-BRT`

**Batch mode:** `/test-forms-date-pw 8-D-BRT 8-D-IST 8-D-UTC0` — processes multiple IDs in one invocation. Groups by TZ to minimize browser context switches. Each ID goes through the full pipeline.

**Skip-verify mode:** `/test-forms-date-pw --skip-verify 8-E-BRT 8-F-BRT` — skips Phases 0–2 (no browser session). Extracts expected values from the existing TC spec and/or latest run file. Use this to backfill test-data.js entries for TCs that already have verified run files.

**Batch + skip-verify:** `/test-forms-date-pw --skip-verify 1-A-BRT 1-B-BRT 2-A-BRT 3-A-BRT-BRT` — backfill multiple entries without opening a browser.

The category ID identifies a row in `tasks/date-handling/forms-calendar/matrix.md` (e.g., `1-A-IST`, `9-D-BRT-8`, `7-C-isoNoZ`).

---

## Batch Mode

When multiple category IDs are provided:

1. **Parse all IDs** from the arguments (space-separated). Filter out `--skip-verify` flag.
2. **Group by TZ** (last segment of each ID) to minimize browser context switches.
3. **For each TZ group:**
    - Open one browser session with that TZ (Phase 0, unless `--skip-verify`)
    - Process each ID through Phases 1–5 sequentially
    - Close browser after the group is done
4. **Report** a summary table at the end:

```
| ID          | Status | Artifacts Created               |
|-------------|--------|---------------------------------|
| 8-D-BRT     | PASS   | test-data entry                 |
| 8-D-IST     | FAIL-1 | TC spec + run + summary + entry |
| 8-D-UTC0    | PASS   | test-data entry + run           |
```

---

## Skip-Verify Mode (`--skip-verify`)

When `--skip-verify` is present, the command **does not open a browser**. Instead:

### What it DOES:

- **Phase 1**: Read source material (matrix.md, analysis.md) — same as normal
- **Phase 3**: Generate TC spec if it doesn't exist — **only if the matrix row has Actual values filled in** (from a previous manual run). If the matrix row has no Actual values, STOP and report: "Cannot create TC spec without verified values. Run without --skip-verify first."
- **Phase 3B**: Add test-data.js entry — extract expected values from:
    1. The **latest run file** (`runs/tc-{id}-run-N.md`) if it exists — parse the Step Results table for actual observed values
    2. Or the **TC spec** (`test-cases/tc-{id}.md`) — parse the Expected Result column from the Test Steps table
    3. Or the **matrix row** Expected/Actual columns
- **Phase 3B**: Create `cat-*.spec.js` if the category doesn't have one yet
- **Phase 4**: Update matrix Evidence column to link to summary (if not already linked)

### What it SKIPS:

- **Phase 0** (no browser session)
- **Phase 2** (no live verification)
- **Phase 5A** (no new run file — no verification was performed)
- **Phase 5B** (no summary update — no new run to record)
- **Phase 5C** (no results.md entry — no new run)

### Value extraction priority:

When building the test-data.js entry without live verification:

1. **Run file** (most reliable — contains actual observed values): parse `Step Results` table → `Actual` column
2. **Matrix row** (second choice): `Actual` column values
3. **TC spec** (last resort — these are intended/correct values, not necessarily what the system produces): `Expected Result` column

For fields like `expectedRaw` and `expectedApi`, use the **Actual** values from the latest run (what the system really does), not the Expected values from the TC spec (what the system should do). The Playwright regression test needs to match current behavior to detect future changes.

### Required artifacts:

Skip-verify mode requires at least ONE of these to exist:

- A run file with step results (`runs/tc-{id}-run-*.md`)
- A matrix row with Actual values filled in
- A TC spec with Expected Result values (fallback — less reliable)

If none exist, report: "No verified data found for {id}. Run without --skip-verify to verify live."

---

## Phase 0 — Playwright session setup

### 0.1 — Read credentials

Read credentials from the root `.env.json` by loading `testing/fixtures/env-config.js` (`loadConfig()`) to get VV instance URL, username, password, customerAlias, and databaseAlias. If `.env.json` does not exist, stop and instruct the user to create it from `.env.example.json`.

### 0.2 — Determine timezone

Extract the TZ column from the category ID (the last segment: `BRT`, `IST`, or `UTC`). Map to IANA name:

| TZ short | IANA name         | Config file                   |
| -------- | ----------------- | ----------------------------- |
| BRT      | America/Sao_Paulo | `testing/config/tz-brt.json`  |
| IST      | Asia/Calcutta     | `testing/config/tz-ist.json`  |
| UTC      | Etc/GMT           | `testing/config/tz-utc0.json` |

> **Cross-TZ IDs (Category 3):** IDs with pattern `{cat}-{config}-{saveTZ}-{loadTZ}` (e.g., `3-A-BRT-IST`) have two TZ segments — save TZ and load TZ. Use the **load TZ** (last segment) for Phase 0.3 browser launch. For the save step, use a pre-saved record from `SAVED_RECORDS` in `testing/fixtures/vv-config.js` instead of saving a fresh form — this avoids needing two browser launches. If no matching saved record exists, save one manually first and add its DataID URL to `SAVED_RECORDS`.

### 0.3 — Open browser with timezone

```bash
playwright-cli open --config=testing/config/tz-{tz}.json
```

This sets `timezoneId` at the browser context level. All `Date` APIs inside the page will reflect the target timezone. Defaults to Chromium (Playwright's default engine).

> The browser used for initial verification (Layer 1) does not constrain future runs. Layer 2 re-runs execute across all configured browsers (Chromium, Firefox, WebKit) via `npx playwright test --project=...`.

### 0.4 — Authenticate

Check if `testing/config/auth-state.json` exists:

**If auth state exists:**

```bash
playwright-cli state-load testing/config/auth-state.json
```

Then navigate to the DateTest form template URL (from Phase 1 step 4). After navigation, check if the page URL contains `/VVLogin` — if so, the saved state is expired and you must re-authenticate (see below).

**If no auth state or state is expired:**

```bash
playwright-cli goto "<loginUrl from .env.json>"
playwright-cli snapshot
```

Identify the login form elements from the snapshot. The VV login page has:

- A "User Name" textbox
- A "Password" textbox
- A "Log In" button

```bash
playwright-cli fill e{username_ref} "<username from .env.json>"
playwright-cli fill e{password_ref} "<password from .env.json>"
playwright-cli click e{login_ref}
```

Wait for login to complete:

```bash
playwright-cli run-code "async page => {
  await page.waitForURL('**/FormDataAdmin**', { timeout: 15000 });
  return 'Login successful';
}"
```

Save authenticated state:

```bash
playwright-cli state-save testing/config/auth-state.json
```

### 0.5 — Navigate to DateTest form template

```bash
playwright-cli goto "<DateTest form template URL from CLAUDE.md>"
```

Always use the template URL — never a saved record URL. The template creates a fresh instance with all fields empty, ensuring no pre-existing state contaminates the test.

### 0.6 — Wait for form to load

```bash
playwright-cli run-code "async page => {
  await page.waitForFunction(
    () => typeof VV !== 'undefined'
      && VV.Form
      && VV.Form.VV
      && VV.Form.VV.FormPartition
      && VV.Form.VV.FormPartition.fieldMaster,
    { timeout: 30000 }
  );
  return await page.title();
}"
```

The returned title should be `DateTest-XXXXXX`. If it still shows `Viewer` or a login page, stop and report.

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

3. `tasks/date-handling/forms-calendar/analysis/overview.md` — identify every bug whose trigger conditions match the field config extracted above. For each matching bug, note: its number, name, the exact function where it lives, and what the observable symptom is.

4. `tasks/date-handling/forms-calendar/matrix.md` — check the CLAUDE.md section for:
    - The DateTest form template URL
    - The Key JavaScript section (console snippets)

    If the Key JavaScript section is not in matrix.md, read `tasks/date-handling/CLAUDE.md` to get it.

5. **If the Evidence column in step 1 references a `results.md` block** (e.g., `results.md § Test 2.5`): read that block in `tasks/date-handling/forms-calendar/results.md` to extract any additional context — exact console output, session notes, observed discrepancies. This supplements Phase 2 but does not replace it.

Do not proceed to Phase 2 until all required files are read.

---

## Phase 2 — Playwright live verification

### Tool usage rules

- **Simple scalar expressions** (string, number, boolean returns): use `playwright-cli eval`

    ```bash
    playwright-cli eval "new Date().toString()"
    playwright-cli eval "VV.Form.calendarValueService.useUpdatedCalendarValueLogic"
    ```

- **Complex JS with arrow functions, chaining, or object returns**: use `playwright-cli run-code` with `page.evaluate()`

    ```bash
    playwright-cli run-code "async page => {
      return await page.evaluate(() => {
        // complex JS here
      });
    }"
    ```

    `playwright-cli eval` wraps expressions as `() => (expr)` which breaks arrow functions and method chains. Always use `run-code` for these.

- **UI interactions** (click, type, fill): use `playwright-cli snapshot` first to get element refs, then interact

    ```bash
    playwright-cli snapshot
    playwright-cli click e{N}
    playwright-cli fill e{N} "value"
    playwright-cli press Tab
    ```

- **Wait for async operations**: use `run-code` with `page.waitForFunction()` or `page.waitForSelector()`

- **Screenshots**: use `playwright-cli screenshot --filename=testing/config/screenshots/tc-{id}-step-{n}.png`

### 2.1 — Precondition checks

**TZ check (P3):**

```bash
playwright-cli eval "new Date().toString()"
```

Extract the GMT offset (e.g., `GMT-0300`). Compare against the TZ column from Phase 1. Since Playwright sets the timezone at context level, this should always match. If it doesn't, stop — the `--config` TZ file may be malformed.

**V1/V2 check (P5):**

```bash
playwright-cli eval "VV.Form.calendarValueService.useUpdatedCalendarValueLogic"
```

If this returns `true`, the test will run under V2 behavior. Note this — it does not block test execution, but the test file must document the actual code path, not an assumed one.

**Field lookup by config (P6):**

```bash
playwright-cli run-code "async page => {
  return await page.evaluate(() =>
    Object.values(VV.Form.VV.FormPartition.fieldMaster)
      .filter(f => f.fieldType === 13
        && f.enableTime === <enableTime from Phase 1>
        && f.ignoreTimezone === <ignoreTimezone from Phase 1>
        && f.useLegacy === <useLegacy from Phase 1>
        && f.enableInitialValue === <enableInitialValue from Phase 1>)
      .map(f => f.name)
  );
}"
```

Substitute the actual boolean values from Phase 1. Record the returned field name(s). Use the first result as `<FIELD_NAME>` for the rest of Phase 2. If no field matches, stop and report — the test form does not support this config.

### 2.2 — Execute test scenario

The scenario type comes from the category section identified in Phase 1:

**Calendar popup scenario (Cat 1):**

```bash
# Snapshot to find the calendar icon next to the target field
playwright-cli snapshot

# Click the calendar icon (identify by ref from snapshot)
playwright-cli click e{calendar_icon}

# Wait for the popup to appear
playwright-cli run-code "async page => {
  await page.waitForSelector('.datepicker-popup, .uib-datepicker-popup', { timeout: 5000 });
  return 'popup visible';
}"

# Snapshot the popup to find navigation and day elements
playwright-cli snapshot
```

- Navigate to the target month using the prev/next arrows (click `e{N}` refs from snapshot)
- Click the target day cell
- The popup auto-advances to the Time tab — snapshot again to verify the time header before clicking Set
- Click the Set button

> If the Set button is not visible in the snapshot, scroll the page (not the modal) using `playwright-cli mousewheel 0 200` to bring it into view. Do not scroll inside the time picker columns — that changes the selected time.

**Typed input scenario (Cat 2):**

```bash
playwright-cli click e{field_input}
playwright-cli type "03"
playwright-cli type "15"
playwright-cli type "2026"
playwright-cli press Tab
```

Type the date segment by segment (month, day, year) using the format `MM/dd/yyyy`. Press Tab to confirm.

**SetFieldValue / round-trip scenario (Cat 7, 9, 10):**

```bash
playwright-cli run-code "async page => {
  return await page.evaluate(() => {
    VV.Form.SetFieldValue('<FIELD_NAME>', '<value>');
    return 'SetFieldValue called';
  });
}"
```

**GetFieldValue scenario (Cat 8):**

Set a known value first if needed, then capture the return:

```bash
playwright-cli run-code "async page => {
  return await page.evaluate(() => VV.Form.GetFieldValue('<FIELD_NAME>'));
}"
```

**Form load / server reload scenario (Cat 3, 5, 6):**

> **Preferred approach for Cat 3:** Use pre-saved records from `SAVED_RECORDS` in `testing/fixtures/vv-config.js` rather than saving a fresh form during the command. Fresh saves via Playwright CLI are unreliable — the VV redirect behavior varies and may not add a DataID to the URL. If a matching saved record doesn't exist, save one manually in the browser first and add its DataID URL to `SAVED_RECORDS`.

Navigate to the saved record URL if applicable, or observe the field's initial state on the template form:

```bash
playwright-cli goto "<saved record URL>"
playwright-cli run-code "async page => {
  await page.waitForFunction(
    () => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition && VV.Form.VV.FormPartition.fieldMaster,
    { timeout: 30000 }
  );
  return await page.title();
}"
```

### 2.3 — Capture outputs

After the action, capture all outputs in a single call:

```bash
playwright-cli run-code "async page => {
  return await page.evaluate(() => ({
    raw: VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>'),
    api: VV.Form.GetFieldValue('<FIELD_NAME>'),
    isoRef: new Date(<year>, <month-0-indexed>, <day>, 0, 0, 0).toISOString()
  }));
}"
```

Take a screenshot to capture the display value:

```bash
playwright-cli screenshot --filename=testing/config/screenshots/tc-{category-id}.png
```

### 2.4 — Compare and record

Compare captured values against the Expected column from Phase 1. Note any discrepancy — it means the live system differs from predicted/intended behavior. Observed values go into the run file (Phase 5A) and the matrix Actual column. The TC file's Expected column always reflects **correct/intended** behavior regardless of what Phase 2 observed.

---

## Phase 3 — Generate the test case file

**Before generating:** Check if `test-cases/tc-{id}.md` already exists. If it does, **skip Phase 3 entirely** — TC specs are immutable (see Constraints). Proceed directly to Phase 3B (test-data.js entry). Phase 5A (run file) and 5B (summary update) still run normally for the new execution.

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
- **API/developer behavior** — what GetFieldValue or SetFieldValue does. Include bug reference if applicable: `GetFieldValue appends fake Z (FORM-BUG-5)`, `no drift (FORM-BUG-2 absent)`.

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

> **No `Test Method` row.** TC specs are manual test procedures for Chrome + DevTools. Playwright is used internally by this command to verify values (Phase 2) but is not referenced in the generated TC spec.

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

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console, after form loads):

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
- `GetFieldValue()` row: Expected Result is the raw stored value with no added transformation. If FORM-BUG-5 is active (enableTime=true, ignoreTimezone=true, useLegacy=false), the observed value will differ — document the buggy observed value as FAIL-N in the Fail Conditions section, not here.
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
- Any pre-existing state issues (round-trip drift → FAIL pattern if FORM-BUG-5 is relevant)
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

## Phase 3B — Append test case to test-data.js

Instead of generating individual spec files, append a test case entry to `testing/fixtures/test-data.js`. The parameterized category spec files (`testing/specs/date-handling/cat-*.spec.js`) automatically pick up new entries.

**Output file:** `testing/fixtures/test-data.js`

Read the file first, then append a new entry to the `TEST_DATA` array (before the closing `];`).

**Entry template:**

```javascript
{
    id: '{category-id}',           // e.g., '1-A-IST'
    category: {N},                 // Category number (1-13)
    categoryName: '{name}',        // e.g., 'Calendar Popup', 'Typed Input'
    config: '{X}',                 // Config letter (A-H)
    tz: '{TZ}',                    // Playwright project name: 'BRT', 'IST', or 'UTC0'
    tzOffset: '{GMT±HHMM}',        // e.g., 'GMT-0300', 'GMT+0530'
    action: '{action}',            // 'popup', 'typed', 'setFieldValue', 'getFieldValue', 'reload'
    inputDate: { year: {Y}, month: {M}, day: {D} },  // 1-indexed month
    inputDateStr: '{MM/dd/yyyy}',  // For typed input tests
    expectedRaw: '{raw value}',    // Expected getValueObjectValue() return
    expectedApi: '{api value}',    // Expected GetFieldValue() return
    bugs: [{bug refs}],            // e.g., ['FORM-BUG-5', 'FORM-BUG-7'] or []
    notes: '{why this test exists and what it proves}',
    tcRef: 'tasks/date-handling/forms-calendar/test-cases/tc-{id}.md',
    savedRecord: '{record key}',   // (Cat 3 only) Key into SAVED_RECORDS in vv-config.js
    saveTz: '{TZ}',                // (Cat 3 cross-TZ only) TZ the record was saved in
},
```

**Rules:**

- Expected values come from Phase 1 (correct/intended behavior), same as the TC markdown spec
- If an entry with the same `id` already exists, do NOT duplicate — report that it exists and skip
- If the category spec file doesn't exist yet (e.g., `cat-2-typed-input.spec.js`), create it following the pattern in `testing/specs/date-handling/cat-1-calendar-popup.spec.js`
- Add a category section comment (with `// ═══...`) if this is the first entry for a new category
- Check that `testing/fixtures/test-data.js` exists; if not, stop and report

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

| Parameter   | Value                                                |
| ----------- | ---------------------------------------------------- |
| Date        | {YYYY-MM-DD}                                         |
| Tester TZ   | {IANA name} — UTC±X ({short})                        |
| Code path   | V{1 or 2} (`useUpdatedCalendarValueLogic = {value}`) |
| Platform    | VisualVault FormViewer, Build {N}                    |
| Test Method | Playwright CLI (`timezoneId: {IANA name}`)           |

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

{One paragraph: what the run history implies. Examples: "FORM-BUG-7 confirmed in IST. Awaiting fix verification." / "Passes consistently — no bug in UTC+0 control." / "Run 2 (PASS) confirms FORM-BUG-7 fix works for Config A IST."}

## Next Action

{One line: what happens next. E.g., "Re-run after FORM-BUG-7 fix deployed." / "No further action — closed PASS." / "Run 1-F-IST (sibling) next."}
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

## Session cleanup

Always close the Playwright browser at the end of the command, regardless of success or failure:

```bash
playwright-cli close
```

This prevents orphan browser processes. In **batch mode**, close the browser once per TZ group (after all IDs in that group are processed), not after each individual test. In **skip-verify mode**, no browser is opened — skip this step.

---

## Constraints — enforced in every generated file

- **No relative dates.** Every timestamp carries an explicit UTC offset.
- **No field names in prose.** Fields are described by their config properties. Console snippets use `<FIELD_NAME>` as a placeholder resolved via P6.
- **All four OS timezone variants** in P1, every time — the TC spec is a manual procedure and must include OS-level timezone setup for all platforms.
- **TC spec files must not reference Playwright.** No mentions of `playwright-cli`, `timezoneId`, `--config`, browser engine matrix, or automation tooling. The TC spec is written for a human tester using Chrome + DevTools console. Playwright details belong only in run files (Phase 5A) and `test-data.js` entries (Phase 3B).
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
- **Screenshots go to `testing/config/screenshots/`** — never committed to git.
- **Auth state files (`testing/config/auth-state*.json`) are never committed** — they contain session cookies.
