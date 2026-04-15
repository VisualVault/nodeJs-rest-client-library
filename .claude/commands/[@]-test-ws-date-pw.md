# Run WS Date-Handling Test

Executes a web services date-handling test case, captures the API response, generates all artifacts (TC spec, run file, summary), and updates the matrix. Supports two execution modes: direct Node.js runner (primary) and browser form button (for WS-4 or production-path validation).

## Usage

```
/test-ws-date-pw <test-id> [test-id-2 ...] [--mode script|browser] [--debug] [--skip-verify]
```

**Single test:** `/test-ws-date-pw ws-1-A-BRT`

**Batch mode:** `/test-ws-date-pw ws-1-A-BRT ws-1-C-BRT ws-1-D-BRT` — processes multiple IDs sequentially. Groups by TZ for script mode (minimizes server restarts).

**Browser mode:** `/test-ws-date-pw ws-4-A-IST --mode browser` — uses Chrome MCP or Playwright to click the form button and verify Forms display. Required for WS-4 (API→Forms cross-layer).

**Debug mode:** `/test-ws-date-pw ws-2-A-BRT --debug` — passes Debug=true to the harness, includes raw API response in output.

**Skip-verify mode:** `/test-ws-date-pw ws-1-A-BRT --skip-verify` — skips execution. Generates artifacts from existing data in the matrix (for backfilling run/summary files from manual test results).

---

## Test ID Format

`ws-{category}-{config}-{tz-or-variant}`

Examples:

- `ws-1-A-BRT` — WS-1, Config A, from BRT server
- `ws-2-D-IST` — WS-2, Config D, IST-saved record
- `ws-5-A-US` — WS-5, Config A, US date format
- `ws-7-A-change` — WS-7, Config A, change scenario
- `ws-8-C-eq` — WS-8, Config C, exact match query

---

## Phase 0 — Environment Safety Check

Before doing anything else, verify the active environment allows write operations.

1. Read `.env.json` config by running: `node -e "const c = require('./testing/fixtures/env-config').loadConfig(); console.log(JSON.stringify({instance: c.instance, readOnly: c.readOnly, writePolicy: c.writePolicy}, null, 2))"`
2. Print the environment banner:
    - **Unrestricted** (no writePolicy or mode=unrestricted): `Environment: {instance} (unrestricted)` — proceed normally
    - **Allowlist** (mode=allowlist): `⚠ RESTRICTED: {instance} — writes only to: {form/WS names from allowlist}`. Verify the DateTestWSHarness (or the target WS) is in `writePolicy.webServices`. If not listed, STOP and warn: "The target web service is not in the writePolicy allowlist for this environment."
    - **Blocked** (readOnly=true, no writePolicy or mode=blocked): `⛔ BLOCKED: {instance} — no writes allowed. STOP.` Do not proceed. Inform the user this environment does not allow write operations.
3. Record the environment instance and write policy mode — include these in all generated artifacts (Phase 3 Environment table, Phase 4 run file header).

---

## Phase 1 — Load source material

Read the following files before doing anything else:

1. `research/date-handling/web-services/matrix.md` — find the row matching the test ID. Extract:
    - The category (WS-1 through WS-9) and its description
    - The Config column (A–H) — maps to field flags via FIELD_MAP
    - The TZ or variant column
    - The input value(s) for the test
    - The Expected column
    - The Status (PASS/FAIL/PENDING) and any existing Actual value

2. `research/date-handling/web-services/matrix.md` — **Field Configurations table** (top of file). Map the Config letter to: `enableTime`, `ignoreTimezone`, `useLegacy`, and the Test Field name.

3. `research/date-handling/web-services/analysis/overview.md` — identify which hypotheses (H-1 through H-12) apply to this test category. Note the hypothesis, its rationale, and what the expected outcome would be if confirmed or refuted.

4. `research/date-handling/web-services/README.md` — reference for runner usage, credential setup, and TZ simulation.

5. `scripts/server-scripts/webservice-test-harness.js` — check that the action handler for this category is implemented (not a stub). If stubbed, stop and report: "Action handler for WS-{N} is not yet implemented."

Do not proceed to Phase 2 until all required files are read and the action handler is confirmed implemented.

---

## Phase 2 — Execute the test

### Determine execution parameters

From the matrix row, derive the `run-ws-test.js` arguments:

| Matrix Column   | Runner Argument                                  | Example                        |
| --------------- | ------------------------------------------------ | ------------------------------ |
| Category (WS-N) | `--action WS-N`                                  | `--action WS-1`                |
| Config          | `--configs {letter}`                             | `--configs A`                  |
| TZ              | `TZ=` env var prefix                             | `TZ=America/Sao_Paulo` for BRT |
| Input Sent      | `--input-date` or `--record-id`                  | `--input-date 2026-03-15`      |
| Debug flag      | `--debug` (if command was called with `--debug`) | `--debug`                      |

**TZ mapping for script mode:**

| TZ segment | `TZ=` env var                              |
| ---------- | ------------------------------------------ |
| BRT        | `TZ=America/Sao_Paulo` (or omit — default) |
| IST        | `TZ=Asia/Calcutta`                         |
| UTC / UTC0 | `TZ=UTC`                                   |

**Category-specific parameter mapping:**

| Category | Required args                                                                              | How to derive                           |
| -------- | ------------------------------------------------------------------------------------------ | --------------------------------------- |
| WS-1     | `--action WS-1 --configs {C} --input-date {date}`                                          | date from matrix Input Sent column      |
| WS-2     | `--action WS-2 --configs {C} --record-id {name}`                                           | record from matrix Record Source column |
| WS-3     | `--action WS-3 --configs {C} --input-date {date}`                                          | date from matrix Input column           |
| WS-4     | `--action WS-1 --configs {C} --input-date {date}` (create via API, then verify in browser) | two-step: script creates, browser reads |
| WS-5     | `--action WS-5 --configs {C} --input-date {date}`                                          | date from matrix Input Sent column      |
| WS-6     | `--action WS-6 --configs {C}`                                                              | input type from matrix Input column     |
| WS-7     | `--action WS-7 --configs {C}`                                                              | scenario from matrix Scenario column    |
| WS-8     | `--action WS-8 --configs {C}`                                                              | query from matrix Query column          |
| WS-9     | `--action WS-9 --configs {C}`                                                              | pattern from matrix Pattern column      |

### Script mode (default)

Run the harness via Node.js:

```bash
TZ={tz} node tools/runners/run-ws-test.js \
  --action {action} --configs {config} \
  --input-date {date} --record-id {record} \
  [--debug]
```

Capture the full JSON output. Parse `output.data.results` to extract per-config results.

### Browser mode (--mode browser or WS-4)

1. Call `tabs_context_mcp` to get current tab state. Create a new tab.
2. Navigate to the DateTest form (or WS test form with control fields).
3. Wait for form to load.
4. Set test parameters via `javascript_tool`:
    ```javascript
    VV.Form.SetFieldValue('WSAction', '{action}');
    VV.Form.SetFieldValue('WSConfigs', '{config}');
    VV.Form.SetFieldValue('WSRecordID', '{record}');
    VV.Form.SetFieldValue('WSInputDate', '{date}');
    VV.Form.SetFieldValue('Debug', '{true/false}');
    ```
5. Click the harness button.
6. Wait for response (poll `WSResult` field until non-empty).
7. Read `VV.Form.GetFieldValue('WSResult')` and parse JSON.

**For WS-4 (API→Forms cross-layer):** After the script creates the record (step 5), navigate to the created record's DataID URL. Then verify:

- Display value in the form field (take screenshot)
- `VV.Form.GetFieldValue('{fieldName}')` return value
- `VV.Form.VV.FormPartition.getValueObjectValue('{fieldName}')` raw value

### Record the execution output

Store the complete JSON response for use in Phases 3–5. Key fields to extract:

- `output.status` — Success/Warning/Error
- `output.data.results[0].stored` or `.apiReturn` — the actual value
- `output.data.results[0].match` — boolean comparison (WS-1)
- `output.data.serverTimezone` — confirms server TZ
- `output.data.parameters` — echoed input params
- `output.data.rawRecord` — full API record (if debug mode)

---

## Phase 3 — Generate the test case spec file

**Only create if the file does not exist.** TC specs are immutable after creation. If the file exists, skip to Phase 4.

**Filename:** `tc-{test-id}.md`
**Path:** `research/date-handling/web-services/test-cases/`

```markdown
# TC-{TEST-ID} — Config {X}, {Category Name}, {TZ/Variant}: {behavioral finding}

## Environment

| Parameter       | Value                                             |
| --------------- | ------------------------------------------------- |
| Execution Mode  | Script (`run-ws-test.js`) / Browser (form button) |
| Server Timezone | `{IANA name}` — UTC±X                             |
| Platform        | VisualVault REST API via nodeV2 client library    |
| VV Environment  | `{instance}` — `{customerAlias}/{databaseAlias}`  |

## Test Parameters

| Parameter    | Value                                                       |
| ------------ | ----------------------------------------------------------- |
| Action       | `{WS-N}`                                                    |
| Config       | `{letter}` — enableTime={}, ignoreTimezone={}, useLegacy={} |
| Target Field | `{DataFieldN}`                                              |
| Input        | `{value sent or record read}`                               |

## Test Steps

| #   | Action                              | Expected Result        | ✓   |
| --- | ----------------------------------- | ---------------------- | --- |
| 1   | Authenticate with VV                | Token acquired         | ☐   |
| 2   | {Category-specific action}          | {Expected from matrix} | ☐   |
| 3   | Verify serverTimezone in response   | `{expected TZ}`        | ☐   |
| 4   | Compare stored/returned vs expected | `{expected value}`     | ☐   |

## Fail Conditions

{One entry per hypothesis that could be refuted. Format:}

**FAIL-1 ({description}):**
Observed: `{value}` instead of expected `{value}`

- Interpretation: {what this means for the hypothesis}

## Related

| Reference  | Location                       |
| ---------- | ------------------------------ |
| Matrix row | `matrix.md` — row `{test-id}`  |
| Hypothesis | `analysis.md` — H-{N}          |
| Run file   | `runs/tc-{test-id}-run-{N}.md` |
| Summary    | `summaries/tc-{test-id}.md`    |
```

---

## Phase 4 — Generate the run file

**Path:** `projects/{customer}/testing/date-handling/web-services/runs/tc-{test-id}-run-{N}.md`

N is the next sequential integer (check for existing run files first). Run files are immutable.

````markdown
# TC-{ID} — Run {N} | {YYYY-MM-DD} | {TZ/variant} | {PASS / FAIL}

**Spec**: [tc-{id}.md](../test-cases/tc-{id}.md) | **Summary**: [summary](../summaries/tc-{id}.md)

## Environment

| Parameter              | Value                        |
| ---------------------- | ---------------------------- |
| Date                   | {YYYY-MM-DD}                 |
| Execution Mode         | Script / Browser             |
| Server TZ              | `{IANA name}` — `TZ={value}` |
| Harness serverTimezone | `{from response}`            |

## Parameters Sent

```json
{output.data.parameters from response}
```
````

## Results

| Config | Field        | Expected     | Actual     |    Match    |
| :----: | ------------ | ------------ | ---------- | :---------: |
|  {X}   | {DataFieldN} | `{expected}` | `{actual}` | {PASS/FAIL} |

## Raw Response

```json
{full output JSON, truncated if very large}
```

## Outcome

**{PASS / FAIL}** — {one-line interpretation referencing hypothesis H-N}

## Findings

- Whether result confirms or refutes hypothesis H-{N}
- Comparison with Forms behavior (if applicable)
- Any unexpected observations
- Recommended next action

````

---

## Phase 5 — Create or update the summary file

**Path:** `projects/{customer}/testing/date-handling/web-services/summaries/tc-{test-id}.md`

If first run: create. If re-run: append to Run History table + update status.

```markdown
# TC-{ID} — Summary

**Spec**: [tc-{id}.md](../test-cases/tc-{id}.md)
**Current status**: {PASS / FAIL} — last run {YYYY-MM-DD} ({TZ/variant})
**Hypothesis**: H-{N} — {short description}

## Run History

| Run | Date | TZ/Variant | Outcome | File |
|-----|------|------------|---------|------|
| 1 | {YYYY-MM-DD} | {TZ} | {PASS/FAIL} | [run-1](../runs/tc-{id}-run-1.md) |

## Current Interpretation

{One paragraph: what the result means for the hypothesis and the broader investigation.}

## Next Action

{One line: what to test next or "No further action — confirmed."}
````

---

## Phase 6 — Update the matrix

Update `research/date-handling/web-services/matrix.md`:

**1. The test row:**

- **Actual** column: fill with observed value
- **Status** column: `PASS` or `FAIL`
- **Bugs** column: reference if applicable

**2. The Coverage Summary table:**

- Update PASS/FAIL/PENDING counts for the category

---

## Batch Mode

When multiple test IDs are provided:

1. Parse all IDs. Group by TZ (for script mode — avoids server restarts).
2. For each TZ group: set `TZ=` env var once, run all tests in that group sequentially.
3. Generate artifacts for each test individually.
4. Report summary table at the end:

```
| ID | Config | Status | Key Finding |
|----|--------|--------|-------------|
```

---

## Constraints

- **TC spec files are immutable** after creation. Never modify to add results.
- **Run files are immutable** after creation. Create new run file for re-runs.
- **Expected Results in TC specs reflect correct/intended behavior**, not buggy output.
- **Matrix Actual column gets the observed value** — even if it differs from Expected.
- **All JSON output is preserved** in run files as the primary evidence.
- **TZ is always explicit** — never assume. Verify via `serverTimezone` in response.
- **Debug mode raw data** goes in run files only, not in TC specs or summaries.
- **Cross-reference Forms results** for WS-2: compare API return against known `getValueObjectValue()` values from `forms-calendar/results.md`.
- **Respect write-policy.** This command invokes web services that create/modify form records. The `run-ws-test.js` runner enforces `writePolicy` from `.env.json` at runtime, but always run Phase 0 to verify the environment is appropriate BEFORE executing. Never skip the environment check.

## Artifact Sharing

This command produces both shared and personal artifacts. See CLAUDE.md § "Repository Architecture & Sharing Model" for principles.

| Artifact          | Path                                                                | Shared? | Reason                         |
| ----------------- | ------------------------------------------------------------------- | ------- | ------------------------------ |
| TC spec           | `research/date-handling/web-services/test-cases/`                   | Yes     | Reproducible specification     |
| Matrix update     | `research/date-handling/web-services/matrix.md`                     | Yes     | Methodology + coverage tracker |
| Run file          | `projects/{customer}/testing/date-handling/web-services/runs/`      | **No**  | Env-specific execution record  |
| Summary           | `projects/{customer}/testing/date-handling/web-services/summaries/` | **No**  | Personal tracking state        |
| Results.md append | `projects/{customer}/testing/date-handling/web-services/results.md` | **No**  | Raw session evidence           |

When committing after a test run, stage shared and personal artifacts separately. Personal artifacts should only be pushed to your private remote.
