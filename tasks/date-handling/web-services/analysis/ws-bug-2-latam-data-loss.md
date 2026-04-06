# WEBSERVICE-BUG-2: Dates in DD/MM/YYYY Format Are Silently Discarded by the API

## What Happens

When a developer script sends a date in day-first format (DD/MM/YYYY) to the VisualVault REST API — for example `"15/03/2026"` for March 15, 2026 — the API:

1. **Accepts the request** — returns HTTP 200, creates the record successfully
2. **Silently discards the date** — stores `null` instead of the date value
3. **Returns no error** — no validation message, no warning in the response body

The record is created, all non-date fields are saved correctly, but the date field is **empty**. The data loss is only discovered when someone opens the record and finds the date missing. There is no way to recover the intended value — it was discarded during parsing before anything was stored.

This affects all three common DD/MM separator variants:

- Slashes: `"15/03/2026"` → null
- Dashes: `"15-03-2026"` → null
- Dots: `"15.03.2026"` → null

The VV server's date parser is US-centric — it expects the month to come first (MM/DD/YYYY). When it encounters `"15/03/2026"`, it tries to read `15` as the month, fails (months only go up to 12), and gives up silently.

**When the day is 12 or lower** (e.g., `"05/03/2026"` for March 5), the parser doesn't fail — it **misinterprets** the date as May 3 (reading it as MM/DD). This is a different but related problem documented in [WEBSERVICE-BUG-3](ws-bug-3-ambiguous-dates.md). Together, these two bugs mean that a script sending DD/MM dates will silently lose data for days 13–31 and silently store wrong dates for days 1–12.

---

## Severity: HIGH

Complete, irrecoverable data loss with no error or warning. Affects any script sending dates in the format used by most of the non-US world.

---

## Who Is Affected

### Any developer using day-first date formats

This is the default date format in:

- **Latin America**: Argentina (`dd/mm/yyyy`), Brazil (`dd/mm/yyyy`), Chile, Colombia, Peru, Mexico, etc.
- **Europe**: UK (`dd/mm/yyyy`), Germany (`dd.mm.yyyy`), France (`dd/mm/yyyy`), Spain, Italy, etc.
- **Other**: Australia, India (mixed), most of Africa and Asia

### Common code patterns that trigger this bug

```javascript
// DANGEROUS: locale-formatted dates in non-US locales
new Date().toLocaleDateString('es-AR'); // → "15/3/2026"  → null (data lost)
new Date().toLocaleDateString('pt-BR'); // → "15/03/2026" → null (data lost)
new Date().toLocaleDateString('en-GB'); // → "15/03/2026" → null (data lost)
new Date().toLocaleDateString('de-DE'); // → "15.3.2026"  → null (data lost)

// DANGEROUS: dates from external data sources
const importedDate = csvRow.date; // "15/03/2026" from EU source → null
const userInput = formField.value; // "15-03-2026" typed by BR user → null
```

### Who is not affected

- Developers using US format (MM/DD/YYYY) — this is what the parser expects
- Developers using ISO 8601 (`YYYY-MM-DD`) — always safe
- Dates where the day value is ≤ 12 — these are parsed (incorrectly) as MM/DD instead of failing (see [WEBSERVICE-BUG-3](ws-bug-3-ambiguous-dates.md))

---

## Background

### The VV REST API Date Parser

When a developer script creates or updates a form record through the VV REST API (using `postForms()` or `postFormRevision()` in the Node.js SDK), the server receives the field values as strings and parses them into SQL Server `datetime` values for storage.

The server's date parser is surprisingly flexible — it successfully handles over 20 different date formats, including ISO 8601, US format, year-first with various separators, English month names, abbreviated months, and the VV internal database format. The parser's vocabulary is broad. DD/MM is a specific blind spot, not a general parsing limitation.

The field's calendar configuration (whether it includes time, whether timezone is ignored, whether legacy mode is on) has **no effect** on the server parser. The parser operates the same way for all calendar field types.

### What the Parser Accepts and What It Doesn't

| Format             | Example                   |   Accepted?   | Notes                           |
| ------------------ | ------------------------- | :-----------: | ------------------------------- |
| ISO 8601           | `"2026-03-15"`            |      Yes      | Always safe — recommended       |
| US (MM/DD/YYYY)    | `"03/15/2026"`            |      Yes      | Parser's native format          |
| US with dashes     | `"03-15-2026"`            |      Yes      | Also accepted                   |
| Year-first slashes | `"2026/03/15"`            |      Yes      | Flexible                        |
| Year-first dots    | `"2026.03.15"`            |      Yes      | Flexible                        |
| English month      | `"March 15, 2026"`        |      Yes      | Word format                     |
| European word      | `"15 March 2026"`         |      Yes      | Day-first with month name works |
| Abbreviated        | `"15-Mar-2026"`           |      Yes      | Also works                      |
| VV database format | `"3/15/2026 12:00:00 AM"` |      Yes      | Internal format                 |
| **DD/MM slashes**  | **`"15/03/2026"`**        | **No → null** | **Silent data loss**            |
| **DD/MM dashes**   | **`"15-03-2026"`**        | **No → null** | **Silent data loss**            |
| **DD/MM dots**     | **`"15.03.2026"`**        | **No → null** | **Silent data loss**            |

Note: `"15 March 2026"` (European word format with spelled-out month) **is accepted** — the parser can handle day-first when the month is a word. The failure is specific to all-numeric DD/MM formats where the parser assumes month-first.

---

## The Problem in Detail

### Why the Parser Fails

The parser attempts to interpret the first numeric component as the month:

```
Input:    "15/03/2026"
Parser:   Reads first component: 15
          Tries to interpret as month → invalid (months are 1-12)
          No fallback to DD/MM interpretation
          No error generated
Result:   null stored in database, HTTP 200 returned to caller
```

### Why It's Silent

The API response for a record created with a null date field is **indistinguishable** from a response where the date was intentionally left empty. The response status is 200 (success), the data object contains the created record, and the null date field looks like any other unset field. There is no validation error, no warning, no indication that anything went wrong.

### The Two Failure Modes for DD/MM Dates

A script processing a full month of dates in DD/MM format experiences two different silent failures:

| Day Range | Input Example (March) | What the Parser Does            | Result                              |
| --------- | --------------------- | ------------------------------- | ----------------------------------- |
| 13–31     | `"15/03/2026"`        | Tries month=15, fails           | **null** — data lost entirely       |
| 1–12      | `"05/03/2026"`        | Reads as month=5, day=3 (May 3) | **Wrong date** — May 3, not March 5 |

Neither case produces an error. A bulk import of DD/MM dates would silently lose roughly 60% of records (days 13–31) and silently corrupt the remaining 40% (days 1–12).

---

## Steps to Reproduce

### Via the VV Node.js SDK

```javascript
// Create a record with a DD/MM date
const data = { Field7: '15/03/2026' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.meta.status); // → 200 (success!)
console.log(result.data.datafield7); // → null (date silently lost)
```

### Via the Test Harness

```bash
# Create a record with DD/MM format
node testing/scripts/run-ws-test.js \
  --action WS-1 --configs A --input-date "15/03/2026"

# Read back — date is null
node testing/scripts/run-ws-test.js \
  --action WS-2 --configs A --record-id <record-name>
# → datafield7 = null
```

### Contrast with ISO Format (Same Date, Same Field)

```javascript
// ISO format — works correctly
const data = { Field7: '2026-03-15' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.data.datafield7); // → "2026-03-15T00:00:00Z" (stored correctly)
```

---

## Workarounds

### Always Use ISO 8601 Format for API Input

The only reliable workaround is to format all dates as `YYYY-MM-DD` before sending to the API. This format is unambiguous and always accepted.

```javascript
// SAFE: ISO 8601 — always works
const date = new Date(2026, 2, 15); // March 15, 2026
const isoDate = date.toISOString().split('T')[0]; // "2026-03-15"
const data = { Field7: isoDate };

// SAFE: explicit UTC construction (avoids timezone edge cases)
const utcDate = new Date(Date.UTC(2026, 2, 15));
const safe = utcDate.toISOString().split('T')[0]; // "2026-03-15"

// SAFE: manual formatting
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, '0');
const d = String(date.getDate()).padStart(2, '0');
const manual = `${y}-${m}-${d}`; // "2026-03-15"
```

### Convert External DD/MM Data Before Sending

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

### Never Use `toLocaleDateString()` for API Input

```javascript
// DANGEROUS — output format depends on the user's locale
date.toLocaleDateString('es-AR'); // "15/3/2026" → null (WEBSERVICE-BUG-2)
date.toLocaleDateString('pt-BR'); // "15/03/2026" → null (WEBSERVICE-BUG-2)
date.toLocaleDateString('en-US'); // "3/15/2026" → works (US format)

// SAFE — always use toISOString() for API input
date.toISOString().split('T')[0]; // "2026-03-15" → always works
```

---

## Test Evidence

### Format Tolerance Tests (5 FAIL Slots)

Records created through the API with DD/MM dates, then read back to verify what was stored:

| Input Format | Input Value    | Field Type | HTTP Response | Stored Value | Status |
| ------------ | -------------- | ---------- | :-----------: | :----------: | :----: |
| DD/MM/YYYY   | `"15/03/2026"` | Date-only  |      200      |   **null**   |  FAIL  |
| DD-MM-YYYY   | `"15-03-2026"` | Date-only  |      200      |   **null**   |  FAIL  |
| DD.MM.YYYY   | `"15.03.2026"` | Date-only  |      200      |   **null**   |  FAIL  |
| DD/MM/YYYY   | `"15/03/2026"` | Date+time  |      200      |   **null**   |  FAIL  |
| DD-MM-YYYY   | `"15-03-2026"` | Date+time  |      200      |   **null**   |  FAIL  |

All 5 tests: HTTP 200 returned, record created, date field stored as null. Both date-only and date+time fields produce the same result — the field configuration has no effect on the server parser.

### Database Verification

Direct database inspection confirmed the data loss:

| Record          | Input                  |        Database Value         |        Status        |
| --------------- | ---------------------- | :---------------------------: | :------------------: |
| DateTest-001656 | `"15/03/2026"` (DD/MM) | NULL (all date columns empty) | Data loss confirmed  |
| DateTest-001661 | `"2026-03-15"` (ISO)   |   `2026-03-15 00:00:00.000`   | Contrast — ISO works |

The record exists in the database (has a document ID and all non-date fields), but every `datetime` column is NULL. The parser failed to produce a value and stored nothing.

### Related Finding: Locale-Dependent JavaScript Patterns

Testing of common JavaScript date formatting patterns confirmed that locale-dependent APIs naturally produce the formats that trigger this bug:

- `new Date("03/15/2026")` parses correctly in US locale but is timezone-dependent
- `toLocaleDateString('en-US')` in São Paulo returns the wrong day for UTC-midnight dates
- A developer using `toLocaleDateString('es-AR')` would get `"15/3/2026"` — which hits this exact bug

This means the bug is especially likely to be triggered by developers in non-US locales who use standard JavaScript date APIs without explicit format control.

---

## Impact Analysis

### Data Integrity: Complete, Irrecoverable Loss

The date value is not stored anywhere. The API response does not echo back the input value. There is no audit trail of what was sent. The original value is lost at the server parsing step — before any storage occurs. There is no recovery path.

### Detection Difficulty: Very Hard

- The API returns HTTP 200 (success)
- The record is created with all non-date fields intact
- The null date field is indistinguishable from an intentionally empty field
- Discovery only happens when someone opens the record and notices the missing date
- For bulk imports, this could affect thousands of records before detection

### Scale: Proportional to Non-US Developer Base

Every VV customer with Latin American or European developers writing scripts is potentially affected. The risk is highest for:

1. **Data migration scripts** importing CSV data with DD/MM dates from external systems
2. **Automated workflows** that compute dates using locale-dependent JavaScript APIs like `toLocaleDateString()`
3. **Integration scripts** receiving dates from European/Latin American source systems

---

## Proposed Fix

### Option A: Return a Validation Error for Unparseable Dates (Minimum Fix)

The server should return an error when a date string cannot be parsed, instead of silently storing null:

```
Current:  POST { Field7: "15/03/2026" } → 200 OK, Field7 = null
Fixed:    POST { Field7: "15/03/2026" } → 400 Bad Request
          { "error": "Invalid date format for Field7: '15/03/2026'.
            Use ISO 8601 (YYYY-MM-DD) or MM/DD/YYYY." }
```

Prevents silent data loss. Scripts fail immediately — developers discover the issue during development, not after deployment.

### Option B: Add DD/MM/YYYY Support to the Parser

Extend the server's date parser to recognize day-first formats:

- If first component > 12: must be DD/MM (unambiguous) — parse as day-first
- If first component ≤ 12: ambiguous — requires a tiebreaker policy (see [WEBSERVICE-BUG-3](ws-bug-3-ambiguous-dates.md))

Enables natural date formats for non-US developers, but ambiguous cases (day 1–12) still need a policy decision.

### Option C: Both — Validation + Extended Support (Recommended)

1. Add DD/MM support for unambiguous cases (day > 12)
2. Return a validation error for ambiguous all-numeric dates where the intent cannot be determined
3. Always accept ISO 8601 and US format without restriction
4. Optionally support a locale hint header for ambiguous cases

```
"15/03/2026" → parsed as March 15 (day > 12, unambiguous DD/MM)
"05/03/2026" → 400 error: "Ambiguous date format. Use ISO 8601 (YYYY-MM-DD)."
"2026-03-15" → parsed as March 15 (ISO 8601, always unambiguous)
"03/15/2026" → parsed as March 15 (MM/DD, current behavior preserved)
```

---

## Fix Impact Assessment

### What Changes If Fixed

- Scripts sending DD/MM dates with day > 12 either work correctly (Option B/C) or fail immediately with a clear error (Option A/C) — no more silent data loss
- Existing records are unaffected — null values already stored cannot be recovered
- API documentation should be updated to list supported date formats and recommended practices

### Backwards Compatibility Risk: LOW

There is no existing correct data to break. DD/MM dates are currently silently stored as null. Any fix either makes them work or makes them fail explicitly — both are improvements over silent data loss.

The only risk is scripts that have inadvertently adapted to the null behavior (e.g., checking for null dates and having a fallback). These scripts would see different behavior after the fix, but the original intent was clearly to store a date, not null.

### Regression Risk: LOW

The date parser change is isolated to the server's input normalization. The 20+ currently-accepted formats should be regression-tested to verify they still work identically. No other date processing is affected.
