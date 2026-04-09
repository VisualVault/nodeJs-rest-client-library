# Create Dashboard Date-Handling Test Case

Generates a verified, deterministic test case file for a VisualVault Dashboard date display scenario. Uses Playwright for browser automation against the Telerik RadGrid dashboard.

## Architecture

Dashboards are **server-side rendered** (Telerik RadGrid / ASP.NET). Browser timezone has no effect on displayed values — the server formats dates from SQL and sends pre-rendered HTML. This means:

- No client-side `moment.js` or `calendarValueService` bugs (FORM-BUG-5, #6 not applicable)
- FORM-BUG-7 (wrong date stored) is visible — incorrect DB values surface directly in the grid
- Mixed timezone storage is visible — same intended date may show different time components

## Usage

```
/test-dash-date-pw <test-id> [test-id-2 ...] [--skip-verify]
```

**Single test:** `/test-dash-date-pw db-1-A`

**Batch mode:** `/test-dash-date-pw db-1-A db-1-B db-1-C db-1-D` — processes multiple IDs sequentially. No TZ grouping needed (server-rendered, TZ irrelevant).

**Skip-verify mode:** `/test-dash-date-pw --skip-verify db-2-A db-2-B` — skips Phases 0–2 (no browser session). Extracts values from existing run files or matrix rows. Use to backfill artifacts for TCs already verified.

The test ID identifies a row in `tasks/date-handling/dashboards/matrix.md` (e.g., `db-1-A`, `db-4-f7-asc`, `db-7-excel`).

---

## Batch Mode

When multiple test IDs are provided:

1. **Parse all IDs** from the arguments (space-separated). Filter out `--skip-verify` flag.
2. **Open one browser session** (Phase 0) — no TZ grouping needed.
3. **Process each ID** through Phases 1–5 sequentially.
4. **Report** a summary table at the end:

```
| ID          | Status | Artifacts Created               |
|-------------|--------|---------------------------------|
| db-1-A      | PASS   | TC spec + run + summary         |
| db-1-C      | FAIL   | TC spec + run + summary         |
| db-3-A      | FAIL   | TC spec + run + summary         |
```

---

## Skip-Verify Mode (`--skip-verify`)

When `--skip-verify` is present, the command **does not open a browser**. Instead:

### What it DOES:

- **Phase 1**: Read source material (matrix.md, analysis.md) — same as normal
- **Phase 3**: Generate TC spec if it doesn't exist — **only if the matrix row has Actual values filled in**. If no Actual values, STOP: "Cannot create TC spec without verified values. Run without --skip-verify first."
- **Phase 4**: Update matrix Evidence column to link to summary
- **Phase 5B**: Create/update summary — only if a run file already exists

### What it SKIPS:

- **Phase 0** (no browser session)
- **Phase 2** (no live verification)
- **Phase 5A** (no new run file)
- **Phase 5C** (no results.md entry)

### Value extraction priority:

1. **Run file** (most reliable — actual observed values): parse `Step Results` table
2. **Matrix row** (second choice): `Actual` column values
3. **TC spec** (last resort): `Expected Result` column

---

## Phase 0 — Playwright session setup

### 0.0 — Environment safety check

Read `.env.json` config by running: `node -e "const c = require('./testing/fixtures/env-config').loadConfig(); console.log(JSON.stringify({instance: c.instance, readOnly: c.readOnly, writePolicy: c.writePolicy, baseUrl: c.baseUrl, customerAlias: c.customerAlias, databaseAlias: c.databaseAlias}, null, 2))"`

Print environment banner:

- **Unrestricted**: `Environment: {instance} (unrestricted)` — proceed
- **Allowlist**: `⚠ RESTRICTED: {instance} — dashboard tests are read-only, proceeding.` — proceed (dashboard tests don't write)
- **Blocked**: `Environment: {instance} (blocked — read-only OK for dashboard tests)` — proceed (dashboard tests don't write)

Record the environment instance — include it in all generated artifacts. Use `baseUrl`, `customerAlias`, `databaseAlias` from config to construct the dashboard URL (do not hardcode `vvdemo/EmanuelJofre`).

### 0.1 — Read credentials

Read credentials from the root `.env.json` by loading `testing/fixtures/env-config.js` (`loadConfig()`) to get VV instance URL, username, password. If `.env.json` does not exist, stop and instruct the user to create it from `.env.example.json`.

### 0.2 — Launch browser

```javascript
const { chromium } = require('@playwright/test');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({
    storageState: 'testing/config/auth-state-pw.json',
    timezoneId: 'America/Sao_Paulo', // Irrelevant for display, but needed for consistency
});
const page = await context.newPage();
```

If `auth-state-pw.json` does not exist or is expired, run global-setup first:

```bash
npx playwright test --project BRT-chromium --grep "NEVER_MATCH" --global-setup testing/global-setup.js
```

Or run any single test to trigger global-setup.

### 0.3 — Navigate to dashboard

Use the `baseUrl`, `customerAlias`, and `databaseAlias` from the config loaded in 0.0 to construct the URL. Do NOT hardcode `vvdemo/EmanuelJofre/Main`.

```javascript
// config values from Phase 0.0
const dashboardUrl = `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25`;
await page.goto(dashboardUrl, {
    waitUntil: 'networkidle',
    timeout: 60000,
});
await page.waitForTimeout(3000); // RadGrid server render stabilization
```

> Note: The `ReportID` GUID may differ per customer environment. If the dashboard does not load, check the project's `test-assets.md` for the correct ReportID.

Verify the page loaded: check for `.rgMasterTable` selector. If not found, check if redirected to login page and re-authenticate.

### 0.4 — Confirm grid loaded

```javascript
const rowCount = await page.evaluate(
    () => document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').length
);
// Expected: 200 (page size) or total records if < 200
```

---

## Phase 1 — Load source material

Read the following files before doing anything else:

1. `tasks/date-handling/dashboards/matrix.md` — find the row matching the test ID. Extract:
    - The category (DB-1 through DB-8) and its description
    - The Config column (A–H) or variant — maps to field via the Field Configurations table
    - The Expected column
    - The Status (PASS/FAIL/PENDING) and any existing Actual value

2. `tasks/date-handling/dashboards/matrix.md` — **Field Configurations table** (top of file). Map Config letter to: `enableTime`, `ignoreTZ`, `useLegacy`, Test Field name, and Dashboard Format.

3. `tasks/date-handling/dashboards/analysis.md` — identify which bugs surface in the dashboard for this config. Note: only FORM-BUG-7 and mixed storage are relevant (FORM-BUG-5/#6 are client-side only).

4. `tasks/date-handling/CLAUDE.md` — reference for field configuration details, known bugs, and form URLs (needed for DB-6 cross-layer tests).

5. If the test references a known record (from WS or forms testing), check `tasks/date-handling/web-services/matrix.md` or `tasks/date-handling/forms-calendar/matrix.md` for the expected stored value.

Do not proceed to Phase 2 until all required files are read.

---

## Phase 2 — Playwright live verification

### Category-specific execution

Each category has a different verification approach:

---

### DB-1 — Display Format Verification

**Goal**: Verify the field shows the expected date format in the grid.

**Steps**:

1. Identify a record with a known value in the target field (from WS/forms results or exploration data)
2. Read the grid cell text:

```javascript
const value = await page.evaluate(
    ({ formId, fieldName }) => {
        const headerCells = [];
        document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
            const link = th.querySelector('a');
            headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
        });
        const colIdx = headerCells.indexOf(fieldName);
        if (colIdx === -1) return { error: `Column ${fieldName} not found` };

        let result = null;
        document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').forEach((tr) => {
            const cells = tr.querySelectorAll('td');
            let id = '';
            cells.forEach((td, j) => {
                if (headerCells[j] === 'Form ID') id = td.textContent.trim();
            });
            if (id === formId) {
                result = cells[colIdx]?.textContent.trim() || '(empty)';
            }
        });
        return result || { error: `Record ${formId} not found on current page` };
    },
    { formId: '<record>', fieldName: '<field>' }
);
```

3. Compare against expected format:
    - Date-only (A/B/E/F): matches `M/D/YYYY` pattern (no time component)
    - DateTime (C/D/G/H): matches `M/D/YYYY H:MM AM/PM` pattern

---

### DB-2 — Date Accuracy

**Goal**: Compare dashboard value against known stored value from WS tests.

**Steps**:

1. Identify a record with a known stored value (from WS matrix — a PASS row with known Actual)
2. Read the grid cell text for that record + field (same method as DB-1)
3. Compare: does the dashboard display match what WS stored?

---

### DB-3 — Wrong Date Detection

**Goal**: Verify FORM-BUG-7 / FORM-BUG-4 surface in the dashboard.

**Steps**:

1. Identify a record created from IST/UTC+ timezone with a known FORM-BUG-7 shifted date
2. Read the grid cell text
3. Confirm the dashboard shows the shifted date (e.g., `3/14/2026` instead of `3/15/2026`)
4. Record both the intended date and the displayed (shifted) date

---

### DB-4 — Column Sort

**Goal**: Verify chronological sort order when clicking column headers.

**Steps**:

1. Click the column header link (`.GridHeaderLink`) for the target field:

```javascript
await page.click(`a.GridHeaderLink:has-text("${fieldName}")`);
await page.waitForTimeout(3000); // Server postback + re-render
```

2. Capture the first 10 and last 5 values in that column
3. Verify ascending order (dates increase top to bottom)
4. Click again (descending), capture, verify reverse order
5. Note: empty cells may sort to top or bottom — document the behavior

---

### DB-5 — Search / SQL Filter

**Goal**: Test the SQL filter builder with date queries.

**Steps**:

1. Toggle search toolbar:

```javascript
await page.click('a[title="Toggle search toolbar display"]');
await page.waitForTimeout(1500);
```

2. Interact with the filter builder UI (Telerik RadFilter — `.ctrlFilter`, `.FilterButtonAddRemove`)
3. Build a date filter expression
4. Execute and capture the resulting record set
5. Verify expected records are included/excluded

> This category may require detailed snapshot-based exploration of the filter builder UI since the RadFilter has complex nested controls.

---

### DB-6 — Cross-Layer Comparison

**Goal**: Compare dashboard grid value vs form display for the same record.

**Steps**:

1. Read the grid cell value for the target record + field
2. Click the record row to open it (triggers `__doPostBack`):

```javascript
// Find and click the record link
await page.click(`a:has-text("${recordId}")`);
await page.waitForTimeout(5000); // Server postback + form load
```

3. Wait for the form to load (may open in a new window/modal or navigate):

```javascript
// If form opened in same page or modal, wait for VV.Form
await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition, {
    timeout: 30000,
});
```

4. Capture form values:

```javascript
const formValues = await page.evaluate(
    (fieldName) => ({
        raw: VV.Form.VV.FormPartition.getValueObjectValue(fieldName),
        api: VV.Form.GetFieldValue(fieldName),
        display: document.querySelector(`[aria-label="${fieldName}"]`)?.value || '(not found)',
    }),
    fieldName
);
```

5. Compare: dashboard grid cell vs form display vs form raw vs form API
6. Navigate back to dashboard for next test

---

### DB-7 — Export Verification

**Goal**: Verify exported dates match grid display.

**Steps**:

1. Click export button (e.g., `a[title="Export Form Data to Excel"]`)
2. Handle the download (Playwright download event)
3. Parse the downloaded file (xlsx/doc/xml)
4. Compare date values against grid display

> This may require `@playwright/test`'s download handling. If the export triggers a server postback and file download, use `page.waitForEvent('download')`.

---

### DB-8 — TZ Independence

**Goal**: Confirm BRT ≡ IST ≡ UTC0 for the entire page.

**Steps**:

1. Load the dashboard in 3 browser contexts (BRT, IST, UTC0)
2. Capture all date values for the first 10 records with data in each context
3. Compare all values across all 3 contexts
4. Report: all match (PASS) or list differences (FAIL)

Use the `--compare` flag in `explore-dashboard.js` as a reference:

```bash
node tools/audit/explore-dashboard.js --compare
```

---

## Phase 3 — Generate the test case file

**Before generating:** Check if `test-cases/tc-{id}.md` already exists. If it does, **skip Phase 3 entirely** — TC specs are immutable. Proceed to Phase 4.

**Filename:** `tc-{test-id}.md` (e.g., `tc-db-1-A.md`, `tc-db-4-f7-asc.md`)
**Output path:** `tasks/date-handling/dashboards/test-cases/`

---

### Section 1 — Title

```
# TC-{ID} — {Config/Variant}, {Category Name}: {finding}
```

Examples:

- `# TC-DB-1-A — Config A, Display Format: date-only shows M/D/YYYY without time`
- `# TC-DB-3-A — Config A, Wrong Date Detection: FORM-BUG-7 shows 3/14 instead of 3/15`
- `# TC-DB-4-F7-ASC — Field7, Column Sort Ascending: chronological order confirmed`
- `# TC-DB-6-C — Config C, Cross-Layer: dashboard 12:00 AM vs form 3:00 AM (BRT)`

---

### Section 2 — Environment Specs

| Parameter           | Value                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                            |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-...`                   |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                              |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                        |
| **Target Field**    | `{FieldName}` — Config {X} (`enableTime={}, ignoreTZ={}, useLegacy={}`) |
| **Expected Format** | `{M/D/YYYY or M/D/YYYY H:MM AM/PM}`                                     |

---

### Section 3 — Preconditions

P1 — Open the DateTest Dashboard in any browser (TZ does not matter):

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25
```

P2 — Verify the RadGrid is loaded: the page title should be "VisualVault: Form Data" and column headers (Form ID, Field1, ...) should be visible.

P3 — Set page size to 200 (if not already) to see most records on one page.

P4 — Identify the target record by Form ID in the grid. If the record is not on the current page, use pagination or search.

---

### Section 4 — Test Steps

Table columns: `#` | `Action` | `Test Data` | `Expected Result` | `✓`

Rules:

- Row 1 is always: `| 1 | Complete setup | See Preconditions P1–P4 | Dashboard loaded, target record visible | ☐ |`
- **Expected Results reflect correct/intended behavior** — not what a buggy system produces. If FORM-BUG-7 causes a wrong date, Expected shows the correct date; the FAIL condition documents the buggy value.
- For DB-1/2/3: Action = "Read grid cell", Test Data = record + field, Expected = exact date string
- For DB-4: Action = "Click column header", Expected = sort order description
- For DB-5: Action = "Build filter", Expected = matching record set
- For DB-6: Action includes grid read + record open + form value capture
- For DB-7: Action = "Export", Expected = file contains matching dates
- Every Expected Result is an exact string — no "approximately" or "contains"

---

### Section 5 — Fail Conditions

One entry per failure mode:

1. **FAIL-N (short description):**
2. The observed symptom — exact value or pattern
3. `- Interpretation:` root cause + what it means

For DB-3 tests (wrong date detection), the FAIL condition describes what happens when the bug is **absent** (i.e., the system shows the correct date — meaning FORM-BUG-7 was fixed). For all other categories, FAIL conditions describe incorrect behavior.

---

### Section 6 — Related

| Reference               | Location                                           |
| ----------------------- | -------------------------------------------------- |
| Matrix row              | `matrix.md` — row `{test-id}`                      |
| Run history             | `summaries/tc-{test-id}.md`                        |
| Bug analysis            | `analysis.md` § {section}                          |
| Cross-reference (Forms) | `../forms-calendar/matrix.md` — row `{related-id}` |
| Cross-reference (WS)    | `../web-services/matrix.md` — row `{related-id}`   |

---

## Phase 4 — Update the matrix

After writing the TC file, update `dashboards/matrix.md`:

**1. The category row:**

- **Actual** column: fill with the observed value from Phase 2
- **Status** column: set to `PASS` or `FAIL`
- **Run Date** column: today's date (YYYY-MM-DD)
- **Evidence** column: link to summary — `[summary](summaries/tc-{id}.md)`

**2. The Coverage Summary table:**

Update PASS/FAIL/PENDING counts for the affected category.

---

## Phase 5A — Generate the run file

Create `tasks/date-handling/dashboards/runs/tc-{id}-run-{N}.md` (or `db-{cat}-batch-run-{N}.md` for batch category runs).

**Run files are immutable after creation.**

```markdown
# TC-{ID} — Run {N} | {YYYY-MM-DD} | {PASS / FAIL-N}

**Spec**: [tc-{id}.md](../test-cases/tc-{id}.md) | **Summary**: [summary](../summaries/tc-{id}.md)

## Environment

| Parameter      | Value                                               |
| -------------- | --------------------------------------------------- |
| Date           | {YYYY-MM-DD}                                        |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-... |
| Grid Component | Telerik RadGrid (server-rendered)                   |
| Test Method    | Playwright headless Chrome                          |
| Page Size      | 200                                                 |
| Total Records  | {N}                                                 |

## Step Results

| Step # | Expected       | Actual       | Match           |
| ------ | -------------- | ------------ | --------------- |
| {N}    | `"{expected}"` | `"{actual}"` | PASS / **FAIL** |

## Outcome

**{PASS / FAIL-N}** — {one line summary}

## Findings

- Whether actual matched expected; if not, root cause
- Which bugs confirmed or ruled out (reference bug number)
- Cross-layer observations (if DB-6)
- Recommended next action
```

---

## Phase 5B — Create or update the summary file

**Path:** `tasks/date-handling/dashboards/summaries/tc-{id}.md`

If first run: create. If re-run: append to Run History table + update status.

```markdown
# TC-{ID} — Summary

**Spec**: [tc-{id}.md](../test-cases/tc-{id}.md)
**Current status**: {PASS / FAIL-N} — last run {YYYY-MM-DD}
**Bug surface**: {Bug #N, or "none — server renders stored value correctly"}

## Run History

| Run | Date         | Outcome         | File                              |
| --- | ------------ | --------------- | --------------------------------- |
| 1   | {YYYY-MM-DD} | {PASS / FAIL-N} | [run-1](../runs/tc-{id}-run-1.md) |

## Current Interpretation

{One paragraph: what the run history implies.}

## Next Action

{One line: what happens next.}
```

---

## Phase 5C — Update results.md session index

Append a one-line entry to the current session in `dashboards/results.md`:

```
- {YYYY-MM-DD} [TC-{id} Run {N}](runs/tc-{id}-run-N.md) — {PASS / FAIL-N} — {one-phrase description}
```

---

## Constraints

1. **Dashboard tests are read-only.** Do NOT click Save, Edit, or Delete buttons when navigating forms for DB-6 cross-layer comparison. Use `page.evaluate()` to read field values only. All form saves MUST go through `saveFormOnly()` from `testing/helpers/vv-form.js` — direct button clicks on Save are forbidden. See root `CLAUDE.md` § "Write Safety".
2. **TC spec immutability**: Once created, TC spec files are never modified. Create a new run file for re-runs.
3. **Run file immutability**: Never modify a run file — create a new one with incremented N.
4. **Expected = correct behavior**: TC spec Expected Results always show what the system _should_ do, not what a buggy system produces.
5. **No TZ suffix in IDs**: Dashboard tests don't use TZ suffixes (server-rendered, TZ irrelevant). Exception: DB-8 which tests TZ independence explicitly.
6. **Cross-reference existing data**: Before creating new records, check forms-calendar and web-services results for records with known stored values.
7. **Artifact paths**: All artifacts live under `tasks/date-handling/dashboards/` (test-cases/, runs/, summaries/).

## Artifact Sharing

This command produces both shared and personal artifacts. See CLAUDE.md § "Repository Architecture & Sharing Model" for principles.

| Artifact          | Path                                         | Shared? | Reason                         |
| ----------------- | -------------------------------------------- | ------- | ------------------------------ |
| TC spec           | `tasks/date-handling/dashboards/test-cases/` | Yes     | Reproducible specification     |
| Matrix update     | `tasks/date-handling/dashboards/matrix.md`   | Yes     | Methodology + coverage tracker |
| Run file          | `tasks/date-handling/dashboards/runs/`       | **No**  | Env-specific execution record  |
| Summary           | `tasks/date-handling/dashboards/summaries/`  | **No**  | Personal tracking state        |
| Results.md append | `tasks/date-handling/dashboards/results.md`  | **No**  | Raw session evidence           |

When committing after a test run, stage shared and personal artifacts separately. Personal artifacts should only be pushed to your private remote.
