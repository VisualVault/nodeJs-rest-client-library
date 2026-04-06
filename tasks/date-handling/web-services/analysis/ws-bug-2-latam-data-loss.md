# WS-BUG-2: Silent Data Loss for DD/MM/YYYY Formats

## Classification

| Field                  | Value                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**           | HIGH                                                                                                                                  |
| **Evidence**           | `[LIVE]` — Confirmed via WS-5 format tolerance tests (5 FAIL slots)                                                                   |
| **Component**          | VV Server — date parser                                                                                                               |
| **Code Path**          | `postForms()` / `postFormRevision()` → server date parser → `null`                                                                    |
| **Affected Configs**   | All (A–H) — server parser is config-agnostic (CB-6)                                                                                   |
| **Affected TZs**       | N/A — server-side defect, timezone irrelevant                                                                                         |
| **Affected Scenarios** | Any script sending DD/MM/YYYY formatted dates to the API                                                                              |
| **Related Bugs**       | WS-BUG-3 (ambiguous dates where day ≤ 12 — same parser, different outcome). WS-BUG-5 (other silent-null formats: compact ISO, epoch). |

---

## Summary

The VV server's date parser does not recognize day-first date formats used in Latin America, Europe, and most of the non-US world. When a DD/MM/YYYY string is sent via `postForms()` or `postFormRevision()`, the server:

1. **Accepts the request** — returns HTTP 200, creates the record successfully
2. **Stores `null`** for the date field — the value is silently discarded
3. **Returns no error** — no validation message, no warning in the response body

The record is created, all non-date fields are saved correctly, but the date field is empty. The data loss is only discovered when someone opens the record and finds the date missing. There is no way to recover the intended value.

This affects all three common DD/MM separator variants: slashes (`15/03/2026`), dashes (`15-03-2026`), and dots (`15.03.2026`). All produce the same silent null. The behavior is consistent across both date-only (Config A) and DateTime (Config C) fields — field configuration flags have no effect on the server parser (CB-6).

---

## Who Is Affected

### Primary: Latin American and European developers

Any developer who writes scripts using day-first date conventions. This is the default format in:

- **Latin America**: Argentina (`dd/mm/yyyy`), Brazil (`dd/mm/yyyy`), Chile, Colombia, Peru, etc.
- **Europe**: UK (`dd/mm/yyyy`), Germany (`dd.mm.yyyy`), France (`dd/mm/yyyy`), Spain, Italy, etc.
- **Other**: Australia, India (mixed), most of Africa and Asia

### Specific code patterns that trigger this bug

```javascript
// DANGEROUS: locale-formatted dates in LATAM locales
new Date().toLocaleDateString('es-AR'); // → "15/3/2026" (DD/MM) → null
new Date().toLocaleDateString('pt-BR'); // → "15/03/2026" (DD/MM) → null
new Date().toLocaleDateString('en-GB'); // → "15/03/2026" (DD/MM) → null
new Date().toLocaleDateString('de-DE'); // → "15.3.2026" (DD.MM) → null

// DANGEROUS: hardcoded DD/MM strings from external data
const importedDate = csvRow.date; // "15/03/2026" from EU source → null
const userInput = formField.value; // "15-03-2026" typed by BR user → null
```

### Not affected

- US developers using MM/DD/YYYY (this is what the parser expects)
- Any developer using ISO 8601 (`YYYY-MM-DD`) — always safe
- Dates where the day value is ≤ 12 — these are parsed as MM/DD instead of failing (see WS-BUG-3, which is a different but related problem)

---

## Root Cause

The VV server's date parser uses **US-centric format detection**. It attempts to interpret the first numeric component of a date string as the **month**. When that component exceeds 12 (a valid day but not a valid month), the parser cannot find a valid interpretation and fails. Instead of returning an error, it silently stores `null`.

### Why the parser fails

```
Input:    "15/03/2026"
Parser:   Tries MM/DD/YYYY → month = 15 → invalid (months are 1-12)
          No fallback to DD/MM/YYYY interpretation
          No error returned
Result:   null stored, HTTP 200 returned
```

### Why it's silent

The API response for a successful record creation with a null date field is indistinguishable from a response where the date was intentionally left empty. The `meta.status` is 200, `data` contains the created record, and the null date field looks like any other unset field.

### Contrast: the parser IS flexible

The VV server successfully parses 20+ date formats (CB-14). It handles ISO, US, year-first with slashes/dots, English month names, abbreviated months, DB storage format, datetime with offsets, and milliseconds. The parser's format vocabulary is broad — DD/MM is a specific blind spot, not a general parsing limitation.

| Format             | Example                   |   Accepted?   | Notes                           |
| ------------------ | ------------------------- | :-----------: | ------------------------------- |
| ISO 8601           | `"2026-03-15"`            |      Yes      | Baseline                        |
| US                 | `"03/15/2026"`            |      Yes      | Parser's native format          |
| US with dashes     | `"03-15-2026"`            |      Yes      | Also accepted                   |
| Year-first slashes | `"2026/03/15"`            |      Yes      | Flexible                        |
| Year-first dots    | `"2026.03.15"`            |      Yes      | Flexible                        |
| English month      | `"March 15, 2026"`        |      Yes      | Word format                     |
| European word      | `"15 March 2026"`         |      Yes      | Day-first WITH month name works |
| Abbreviated        | `"15-Mar-2026"`           |      Yes      | Also works                      |
| DB format          | `"3/15/2026 12:00:00 AM"` |      Yes      | VV internal format              |
| **DD/MM slashes**  | **`"15/03/2026"`**        | **No → null** | **Silent data loss**            |
| **DD/MM dashes**   | **`"15-03-2026"`**        | **No → null** | **Silent data loss**            |
| **DD/MM dots**     | **`"15.03.2026"`**        | **No → null** | **Silent data loss**            |

Note: `"15 March 2026"` (European word format with spelled-out month) **is accepted** — the parser can handle day-first when the month is a word. The failure is specific to all-numeric DD/MM formats.

---

## Expected vs Actual Behavior

### DD/MM/YYYY Formats (day > 12) — Silent Data Loss

| Slot          | Config | Input          | Expected Stored          | Actual Stored | HTTP Status | Error Returned |
| ------------- | :----: | -------------- | ------------------------ | :-----------: | :---------: | :------------: |
| ws-5-A-LATAM1 |   A    | `"15/03/2026"` | `"2026-03-15T00:00:00Z"` |  **`null`**   |     200     |      None      |
| ws-5-A-LATAM2 |   A    | `"15-03-2026"` | `"2026-03-15T00:00:00Z"` |  **`null`**   |     200     |      None      |
| ws-5-A-LATAM3 |   A    | `"15.03.2026"` | `"2026-03-15T00:00:00Z"` |  **`null`**   |     200     |      None      |
| ws-5-C-LATAM1 |   C    | `"15/03/2026"` | `"2026-03-15T00:00:00Z"` |  **`null`**   |     200     |      None      |
| ws-5-C-LATAM2 |   C    | `"15-03-2026"` | `"2026-03-15T00:00:00Z"` |  **`null`**   |     200     |      None      |

### DD/MM/YYYY Formats (day ≤ 12) — Wrong Date (see WS-BUG-3)

| Slot         | Config | Input (intended DD/MM)   | Expected Stored          |      Actual Stored       | Interpretation |
| ------------ | :----: | ------------------------ | ------------------------ | :----------------------: | -------------- |
| ws-5-A-AMBIG |   A    | `"05/03/2026"` (March 5) | `"2026-03-05T00:00:00Z"` | `"2026-05-03T00:00:00Z"` | May 3 (MM/DD)  |

When the day is ≤ 12, the parser succeeds but interprets the value as MM/DD — storing the wrong date silently. This is catalogued separately as WS-BUG-3.

---

## Steps to Reproduce

### Via Direct Runner

```bash
# 1. Create a record with DD/MM/YYYY format
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-5 --configs A --input-formats LATAM

# 2. Observe in the output:
#    - Record created successfully (HTTP 200)
#    - Field7 stored value: null

# 3. Alternatively, manual single-field test:
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-1 --configs A --input-date "15/03/2026"
# Then read back:
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-2 --configs A --record-id <record-name>
# → datafield7 = null
```

### Via API directly

```javascript
// Create record with DD/MM/YYYY date
const data = { Field7: '15/03/2026' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.meta.status); // → 200 (success!)
console.log(result.data.datafield7); // → null (date silently lost)
```

---

## Test Evidence

### WS-5: Input Format Tolerance (5 FAIL slots)

Run: [`ws-5-batch-run-1.md`](../runs/ws-5-batch-run-1.md) — 2026-04-02, BRT

| Slot          | Config |   Format   | Input          | Stored | Status |
| ------------- | :----: | :--------: | -------------- | :----: | :----: |
| ws-5-A-LATAM1 |   A    | DD/MM/YYYY | `"15/03/2026"` | `null` |  FAIL  |
| ws-5-A-LATAM2 |   A    | DD-MM-YYYY | `"15-03-2026"` | `null` |  FAIL  |
| ws-5-A-LATAM3 |   A    | DD.MM.YYYY | `"15.03.2026"` | `null` |  FAIL  |
| ws-5-C-LATAM1 |   C    | DD/MM/YYYY | `"15/03/2026"` | `null` |  FAIL  |
| ws-5-C-LATAM2 |   C    | DD-MM-YYYY | `"15-03-2026"` | `null` |  FAIL  |

All 5 tests: HTTP 200 returned, record created, date field stored as `null`.

### Confirmed Behaviors

| CB    | Description                                                                                       | Source     |
| ----- | ------------------------------------------------------------------------------------------------- | ---------- |
| CB-14 | Server accepts ISO, US, DB, YYYY/DD, YYYY.DD, English/abbreviated month formats                   | WS-5       |
| CB-15 | DD/MM/YYYY formats silently stored as `null` — no error, complete data loss                       | WS-5       |
| CB-6  | Field config flags have no effect on API behavior — both Config A and C produce identical results | WS-1, WS-5 |

### Related: WS-9 Script Patterns

WS-9 testing (CB-25, CB-27) demonstrated that common JavaScript patterns naturally produce locale-dependent date strings:

- `new Date("03/15/2026")` parses as local midnight — TZ-dependent (CB-25)
- `toLocaleDateString('en-US')` in BRT returns wrong day for UTC-midnight dates (CB-27)
- A developer using `toLocaleDateString('es-AR')` would get `"15/3/2026"` — which hits this exact bug

---

## Impact Analysis

### Data Integrity: Complete, Irrecoverable Loss

The date value is not stored anywhere. The API response does not echo back the input value. There is no audit trail of what was sent. The original value is lost at the server parsing step — before any storage occurs. There is no recovery path.

### Detection Difficulty: Very Hard

- The API returns success (HTTP 200)
- The record is created with all non-date fields intact
- The null date field is indistinguishable from an intentionally empty field
- Discovery only happens when a user opens the record and notices the missing date
- For bulk imports, this could affect thousands of records before detection

### Scale: Proportional to Non-US Developer Base

Every VV customer with LATAM or European developers writing scripts is potentially affected. The risk is highest for:

1. **Data migration scripts** importing CSV data with DD/MM dates from external systems
2. **Automated workflows** that compute dates using locale-dependent JavaScript APIs
3. **Integration scripts** receiving dates from European/LATAM source systems

### Interaction with WS-BUG-3

When the day value is ≤ 12 (e.g., March 5 written as `"05/03/2026"`), the parser does not fail — it **misinterprets** as May 3. This means:

- Days 13–31: complete data loss (null) — **this bug**
- Days 1–12: wrong data stored silently — **WS-BUG-3**
- Neither case produces an error

A script processing a full month of DD/MM dates would silently lose dates for days 13–31 and silently store wrong dates for days 1–12.

---

## Workarounds

### Always use ISO 8601 format

The only reliable workaround is to always format dates as `YYYY-MM-DD` before sending to the API. This format is unambiguous and always accepted.

```javascript
// SAFE: ISO 8601 — always works
const date = new Date(2026, 2, 15); // March 15, 2026
const isoDate = date.toISOString().split('T')[0]; // "2026-03-15"
const data = { Field7: isoDate };

// SAFE: explicit UTC construction
const utcDate = new Date(Date.UTC(2026, 2, 15));
const safe = utcDate.toISOString().split('T')[0]; // "2026-03-15"

// SAFE: manual formatting
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, '0');
const d = String(date.getDate()).padStart(2, '0');
const manual = `${y}-${m}-${d}`; // "2026-03-15"
```

### For external data with DD/MM format: convert before sending

```javascript
// Convert DD/MM/YYYY to ISO before API call
function ddmmToIso(ddmm) {
    const parts = ddmm.split(/[\/\-\.]/);
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

ddmmToIso('15/03/2026'); // → "2026-03-15"
ddmmToIso('15-03-2026'); // → "2026-03-15"
ddmmToIso('15.03.2026'); // → "2026-03-15"
```

### Never use `toLocaleDateString()` for API input

```javascript
// DANGEROUS — output format depends on locale
date.toLocaleDateString('es-AR'); // "15/3/2026" → null (WS-BUG-2)
date.toLocaleDateString('en-US'); // "3/15/2026" → works (US format)
date.toLocaleDateString('pt-BR'); // "15/03/2026" → null (WS-BUG-2)

// SAFE — always use toISOString() for API input
date.toISOString().split('T')[0]; // "2026-03-15" → always works
```

---

## Proposed Fix

### Option A: Return validation error for unparseable dates (minimum fix)

The server should return an error (HTTP 400 or a validation message in the response body) when a date string cannot be parsed, instead of silently storing `null`.

```
Current:  POST { Field7: "15/03/2026" } → 200 OK, Field7 = null
Fixed:    POST { Field7: "15/03/2026" } → 400 Bad Request
          { "error": "Invalid date format for Field7: '15/03/2026'.
            Use ISO 8601 (YYYY-MM-DD) or MM/DD/YYYY." }
```

**Pros**: Prevents silent data loss. Scripts fail fast — developers discover the issue immediately.
**Cons**: Does not enable DD/MM input. LATAM developers must still convert to ISO/US format.

### Option B: Add DD/MM/YYYY parser support

Extend the server's date parser to recognize day-first formats. This requires disambiguation logic:

- If first component > 12: must be DD/MM (unambiguous) — parse as day-first
- If first component ≤ 12: ambiguous — requires a tiebreaker (see WS-BUG-3)

Possible tiebreakers for ambiguous dates:

- Default to MM/DD (current behavior, US-centric)
- Accept a locale hint header (e.g., `X-Date-Format: DD/MM`)
- Accept only ISO 8601 for ambiguous cases

**Pros**: LATAM developers can use their natural format. Unambiguous cases (day > 12) are safe.
**Cons**: Ambiguous cases (day ≤ 12) still need a policy decision. Adds parser complexity.

### Option C: Both — validation + extended support (recommended)

1. Add DD/MM/YYYY support for unambiguous cases (day > 12)
2. Return a validation error for ambiguous all-numeric dates where the intent cannot be determined
3. Always accept ISO 8601 and US format without restriction
4. Optionally support a locale hint header for ambiguous cases

```
"15/03/2026" → parsed as March 15 (day > 12, unambiguous DD/MM)
"05/03/2026" → 400 error: "Ambiguous date. Use ISO 8601 (YYYY-MM-DD)."
"2026-03-15" → parsed as March 15 (ISO 8601, always unambiguous)
"03/15/2026" → parsed as March 15 (MM/DD, current behavior preserved)
```

---

## Fix Impact Assessment

### What Changes If Fixed

- Scripts sending DD/MM dates with day > 12 either work (Option B/C) or fail fast (Option A/C) — no more silent data loss
- Existing records are unaffected — the null values are already stored and cannot be recovered
- API documentation should be updated to list supported date formats

### Backwards Compatibility Risk

**LOW**: There is no existing correct data to break. DD/MM dates are currently silently stored as `null`. Any fix either makes them work or makes them fail explicitly — both are improvements over silent data loss.

The only risk is scripts that have inadvertently adapted to the null behavior (e.g., checking for null dates and having a fallback). These scripts would see different behavior after the fix, but the original intent was clearly to store a date, not null.

### Regression Risk

**LOW**: The date parser change is isolated to the server's input normalization. No other date processing is affected. The 20+ currently-accepted formats should be regression-tested to ensure they still work.

### Testing Recommendation

Re-run the full WS-5 test matrix (33 slots) after the fix to verify:

- All previously accepted formats still work identically
- DD/MM formats now either store correctly or return an error
- Ambiguous dates have clear, documented behavior
