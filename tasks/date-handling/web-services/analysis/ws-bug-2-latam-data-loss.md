# WEBSERVICE-BUG-2: Dates in DD/MM/YYYY Format Are Silently Discarded by the API

## What Happens

When a developer script sends a date in day-first format (DD/MM/YYYY) to the VisualVault REST API — for example `"15/03/2026"` for March 15, 2026 — the API accepts the request (returns HTTP 200), creates the record, but silently discards the date value. The database stores `null` instead of the date. No error or warning is returned.

The record is created, all non-date fields are saved correctly, but the date field is empty. The data loss is only discovered when someone opens the record and finds the date missing. The original value cannot be recovered — it was discarded during parsing before anything was stored.

This affects all three common DD/MM separator variants: slashes (`"15/03/2026"`), dashes (`"15-03-2026"`), and dots (`"15.03.2026"`) — all result in null.

When the day value is 12 or lower (e.g., `"05/03/2026"` for March 5), the API does not fail — it silently misinterprets the date as May 3 by reading the day as the month. This related problem is documented in [WEBSERVICE-BUG-3](ws-bug-3-ambiguous-dates.md).

---

## When This Applies

Three conditions must all be true for this bug to cause data loss:

### 1. The date is in a day-first numeric format

The input must be an all-numeric date string with the day component first, using any common separator:

| Format     | Example        | Result |
| ---------- | -------------- | ------ |
| DD/MM/YYYY | `"15/03/2026"` | null   |
| DD-MM-YYYY | `"15-03-2026"` | null   |
| DD.MM.YYYY | `"15.03.2026"` | null   |

Day-first dates with a spelled-out month name (e.g., `"15 March 2026"`, `"15-Mar-2026"`) are **not affected** — the server parser recognizes the month name and handles these correctly.

This is the default date format in Latin America (Argentina, Brazil, Chile, Colombia, Peru, Mexico), Europe (UK, Germany, France, Spain, Italy), Australia, India, and most of Africa and Asia.

### 2. The day value is greater than 12

When the day is between 1 and 12, the input is numerically ambiguous — `"05/03/2026"` could be May 3 (MM/DD) or March 5 (DD/MM). The server always interprets it as MM/DD, storing the wrong date without error. This is a distinct defect documented in [WEBSERVICE-BUG-3](ws-bug-3-ambiguous-dates.md).

When the day is 13 or higher, the server attempts to read it as a month number, fails (months only go to 12), and discards the value. This is the data loss described in this document.

Together, a script processing a full month of DD/MM dates will silently lose roughly 60% of records (days 13–31) and silently store incorrect dates for the remaining 40% (days 1–12).

### 3. The date is sent through the REST API

The server's date parser runs on all dates submitted through `postForms()` or `postFormRevision()` in the VV REST API. The field's calendar configuration (`enableTime`, `ignoreTimezone`, `useLegacy`) has no effect on the parser — all field types are affected equally.

Dates entered through the Forms UI are not affected — the UI uses its own date picker and formatting.

---

## Severity: HIGH

Complete, irrecoverable data loss with no error or warning. The API returns HTTP 200 and the record is created with all non-date fields intact, making the null date field indistinguishable from an intentionally empty field. Discovery only happens when someone opens the record and notices the missing date. For bulk imports, this could affect thousands of records before detection.

Affects any developer script sending dates in the format used by most of the non-US world. The risk is highest for data migration scripts importing CSV data from external systems, automated workflows using locale-dependent JavaScript APIs like `toLocaleDateString()`, and integration scripts receiving dates from Latin American or European source systems.

---

## How to Reproduce

### Via the Test Harness

```bash
# Create a record with DD/MM format
node tools/runners/run-ws-test.js \
  --action WS-1 --configs A --input-date "15/03/2026"

# Read back — date is null
node tools/runners/run-ws-test.js \
  --action WS-2 --configs A --record-id <record-name>
# → datafield7 = null
```

### Via the VV Node.js SDK

```javascript
// Create a record with a DD/MM date
const data = { Field7: '15/03/2026' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.meta.status); // → 200 (success)
console.log(result.data.datafield7); // → null (date silently discarded)
```

### Contrast with ISO Format (Same Date, Same Field)

```javascript
// ISO format — works correctly
const data = { Field7: '2026-03-15' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.data.datafield7); // → "2026-03-15T00:00:00Z" (stored correctly)
```

- **Expected**: Both formats store March 15, 2026
- **Actual**: DD/MM format stores null; ISO format stores the correct date

### Automated

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Background

### The VV REST API Date Parser

When a developer script creates or updates a form record through the VV REST API (using `postForms()` or `postFormRevision()` in the Node.js SDK), the server receives the field values as strings and parses them into SQL Server `datetime` values for storage.

The server's date parser handles over 20 different date formats, including ISO 8601, US format, year-first with various separators, English month names, abbreviated months, and the VV internal database format. DD/MM is a specific gap in the parser, not a general parsing limitation.

### What the Parser Accepts and What It Does Not

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

`"15 March 2026"` (European word format with spelled-out month) **is accepted** — the parser handles day-first when the month is a word. The failure is specific to all-numeric DD/MM formats where the parser assumes month-first.

---

## The Problem in Detail

### Why the Parser Discards the Value

The parser attempts to interpret the first numeric component as the month:

```
Input:    "15/03/2026"
Parser:   Reads first component: 15
          Tries to interpret as month → invalid (months are 1-12)
          No fallback to DD/MM interpretation
          No error generated
Result:   null stored in database, HTTP 200 returned to caller
```

### Why the Failure Is Silent

The API response for a record created with a null date field is indistinguishable from a response where the date was intentionally left empty. The response status is 200 (success), the data object contains the created record, and the null date field looks like any other unset field. There is no validation error, no warning, no indication that the input was rejected.

### The Two Failure Modes for DD/MM Dates

A script processing a full month of dates in DD/MM format experiences two different silent failures depending on the day value:

| Day Range | Input Example (March) | What the Parser Does            | Result                              |
| --------- | --------------------- | ------------------------------- | ----------------------------------- |
| 13–31     | `"15/03/2026"`        | Tries month=15, fails           | **null** — data lost entirely       |
| 1–12      | `"05/03/2026"`        | Reads as month=5, day=3 (May 3) | **Wrong date** — May 3, not March 5 |

Neither case produces an error. The day 1–12 misinterpretation is documented separately in [WEBSERVICE-BUG-3](ws-bug-3-ambiguous-dates.md) because its root cause is different (ambiguous input interpreted with a US-centric assumption, not a parse failure).

### Relationship to WEBSERVICE-BUG-3

WEBSERVICE-BUG-2 and WEBSERVICE-BUG-3 are **two manifestations of the same parser limitation** — the assumption that the first numeric component is the month:

- WEBSERVICE-BUG-2: When the day is > 12, the assumption fails and the value is discarded (data loss)
- WEBSERVICE-BUG-3: When the day is ≤ 12, the assumption succeeds with the wrong interpretation (data corruption)

They are documented separately because their symptoms, detection methods, and fix strategies differ. WEBSERVICE-BUG-2 (null) is detectable by checking for empty fields; WEBSERVICE-BUG-3 (wrong date) can only be detected by comparing against the intended input.

---

## Verification

Verified via the test harness (`run-ws-test.js`) on the demo environment at `vvdemo.visualvault.com`. 5 format tolerance tests confirmed that all three DD/MM separator variants (slashes, dashes, dots) result in null for both date-only and date+time field types — HTTP 200 returned in all cases with the date field stored as null. Direct database inspection of DateTest-001656 confirmed NULL across all datetime columns, while a control record (DateTest-001661) created with the same date in ISO format stored `2026-03-15 00:00:00.000` correctly.

Additionally, testing of common JavaScript date formatting patterns confirmed that locale-dependent APIs (`toLocaleDateString()` with non-US locales) naturally produce the DD/MM formats that trigger this bug, meaning developers in non-US locales using standard JavaScript APIs without explicit format control are especially likely to encounter it.

**Limitations**: Testing was performed on the demo environment only. The server-side parser code is .NET and not available in this repository — the parser behavior was characterized through input/output testing, not code inspection. Other environments have not been verified.

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The server-side date parser in the VV REST API assumes the first numeric component of a date string is the month. When a DD/MM date is submitted with a day value > 12, the parser cannot interpret the first component as a valid month and discards the entire value, storing null. No validation error is returned to the caller.

**File locations**: The parser is server-side .NET code, not available in this repository. The parser's behavior was characterized entirely through input/output testing — submitting various date formats via `postForms()` and inspecting the database values. The specific .NET method or class that performs the parsing has not been identified.

The parser correctly handles day-first formats when the month is spelled out (e.g., `"15 March 2026"`, `"15-Mar-2026"`), confirming the limitation is specific to all-numeric date strings where the position of day and month is ambiguous without locale context.

---

## Workarounds and Fix Recommendations

See [ws-bug-2-fix-recommendations.md](ws-bug-2-fix-recommendations.md) for workarounds, proposed fix options, and impact assessment.
