# WEBSERVICE-BUG-3: Ambiguous Dates Silently Stored With Month and Day Swapped

## What Happens

When a developer script sends a date like `"05/03/2026"` to the VisualVault REST API, intending **March 5** (DD/MM, the convention in Latin America and Europe), the server silently stores **May 3** (reading it as MM/DD, the US convention). No error is returned. No warning is logged. The record looks complete, the date looks valid — it is the wrong date.

This is the companion to [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md), which covers the same DD/MM input problem for days 13–31. Together they describe the full range of outcomes when a non-US date format is sent to the API:

| Day in the Date | DD/MM Input Example | What the Server Does                       | Which Bug        |
| :-------------: | ------------------- | ------------------------------------------ | ---------------- |
|      13–31      | `"15/03/2026"`      | Cannot parse (month=15 invalid) → **null** | WEBSERVICE-BUG-2 |
|      1–12       | `"05/03/2026"`      | Parses as MM/DD → **wrong date** (May 3)   | WEBSERVICE-BUG-3 |

Unlike WEBSERVICE-BUG-2 (where a null field is visibly wrong and detectable during QA), a plausible-but-incorrect date can go undetected indefinitely — the record looks complete, the date looks valid, and only someone who knows the original intended value can spot the error.

---

## When This Applies

Three conditions must all be true for this bug to produce the wrong date:

### 1. The date is in a day-first numeric format with a day value between 1 and 12

The input must be an all-numeric date string where the first component is intended as the day (DD/MM convention), and the day value is between 1 and 12. When the day is 13 or higher, the parser fails entirely and stores null instead — that is [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md).

The day value ≤ 12 makes the input numerically ambiguous: `"05/03/2026"` could be May 3 (MM/DD) or March 5 (DD/MM). The server always chooses MM/DD.

All three common separator variants are affected: slashes (`"05/03/2026"`), dashes (`"05-03-2026"`), and dots (`"05.03.2026"`).

Day-first dates with a spelled-out month name (e.g., `"5 March 2026"`, `"05-Mar-2026"`) are **not affected** — the parser recognizes the month name and handles these correctly.

### 2. The month and day values are different

When month and day are the same (e.g., `"06/06/2026"` for June 6), the swap produces the same date regardless of interpretation — the bug exists but has no visible effect. For all other day ≤ 12 dates, the stored date is wrong.

This means roughly **40% of all dates** in a typical dataset are vulnerable to month/day swap (12 out of ~30.4 average days per month), with a subset of those (same month and day) being coincidentally correct.

### 3. The date is sent through the REST API

The server's date parser runs on all dates submitted through `postForms()` or `postFormRevision()` in the VV REST API. The field's calendar configuration (`enableTime`, `ignoreTimezone`, `useLegacy`) has no effect on the parser — all field types produce the same results.

Dates entered through the Forms UI are not affected — the UI uses its own date picker and formatting.

---

## Severity: MEDIUM

The server is doing what it was designed to do — interpreting all-numeric dates as MM/DD (US convention). The problem is that this behavior is undocumented and silently produces incorrect results for the majority of the world's date conventions.

The stored date is always a valid calendar date, making it harder to detect than the null result of WEBSERVICE-BUG-2. Reports, dashboards, and queries all use the wrong date without any indication of error. Detection requires comparing stored data against the original source, field by field.

The scope is narrower than WEBSERVICE-BUG-2 because only days 1–12 are affected, and the workaround (ISO 8601 format) is straightforward.

---

## How to Reproduce

### Via the Test Harness

```bash
# Create a record with an ambiguous DD/MM date
node tools/runners/run-ws-test.js \
  --action WS-1 --configs A --input-date "05/03/2026"

# Read back the stored value
node tools/runners/run-ws-test.js \
  --action WS-2 --configs A --record-id <record-name>
# → datafield7 = "2026-05-03T00:00:00Z"  (May 3, not March 5)
```

### Via the VV Node.js SDK

```javascript
// Send an ambiguous DD/MM date
const data = { Field7: '05/03/2026' }; // Intending March 5 (DD/MM)
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.data.datafield7);
// → "2026-05-03T00:00:00Z"  (May 3 — month and day swapped)
```

- **Expected**: `"2026-03-05T00:00:00Z"` (March 5 — the intended date)
- **Actual**: `"2026-05-03T00:00:00Z"` (May 3 — month and day swapped)

### Automated

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## The Problem in Detail

### Why the Swap Happens

The VV server's date parser always interprets the first numeric component of a date string as the **month** and the second as the **day** — following the US MM/DD/YYYY convention. There is no locale awareness, no format detection, and no disambiguation logic.

```
Input:    "05/03/2026"
Parser:   First component: 5  → interprets as month (May)
          Second component: 3 → interprets as day (3rd)
          → May 3, 2026
Result:   "2026-05-03T00:00:00Z" stored — no error, wrong date
```

The key difference from [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md): when the day is ≤ 12, the first component is a valid month number, so the parser succeeds — but with month and day swapped.

### How Far Off the Stored Date Is

The swap produces a date that is `|month - day|` months away from the intended date:

| Input (DD/MM Intent) | Developer Intended | Server Stored | How Far Off                                     |
| -------------------- | :----------------: | :-----------: | ----------------------------------------------- |
| `"05/03/2026"`       |      March 5       |     May 3     | +2 months                                       |
| `"01/06/2026"`       |       June 1       |   January 6   | -5 months                                       |
| `"07/01/2026"`       |     January 7      |    July 1     | +6 months                                       |
| `"12/11/2026"`       |    November 12     |  December 11  | +1 month                                        |
| `"10/03/2026"`       |      March 10      |   October 3   | +7 months                                       |
| `"06/06/2026"`       |       June 6       |    June 6     | 0 (coincidence — same date because month = day) |

### The Boundary With WEBSERVICE-BUG-2

The transition from wrong-date (this bug) to null (WEBSERVICE-BUG-2) happens at day 13:

| Input (DD/MM Intent)      | Day Value | What the Parser Does                | Result             |
| ------------------------- | :-------: | ----------------------------------- | ------------------ |
| `"12/03/2026"` (March 12) |    12     | Reads as month=12 (December), day=3 | December 3 (wrong) |
| `"13/03/2026"` (March 13) |    13     | Reads as month=13 → invalid         | null (data lost)   |

### What This Means for a Bulk Import

A script processing a full month of DD/MM dates would:

- **Days 1–12**: Store the wrong date (month and day swapped) — ~40% of records
- **Days 13–31**: Store null (data lost entirely) — ~60% of records
- Neither case produces an error

### Relationship to WEBSERVICE-BUG-2

WEBSERVICE-BUG-2 and WEBSERVICE-BUG-3 are **two manifestations of the same parser limitation** — the assumption that the first numeric component is always the month:

- WEBSERVICE-BUG-2: When the day is > 12, the assumption fails and the value is discarded (data loss)
- WEBSERVICE-BUG-3: When the day is ≤ 12, the assumption succeeds with the wrong interpretation (data corruption)

They are documented separately because their symptoms, detection methods, and fix strategies differ. WEBSERVICE-BUG-2 (null) is detectable by checking for empty fields; WEBSERVICE-BUG-3 (wrong date) can only be detected by comparing against the intended input. The proposed fix addresses both simultaneously — see the companion document.

---

## Verification

Verified via the test harness (`run-ws-test.js`) on the demo environment at `vvdemo.visualvault.com`. A record was created with the input `"05/03/2026"` (intended as March 5 in DD/MM convention). The API returned HTTP 200 and stored `"2026-05-03T00:00:00Z"` (May 3) — confirming month and day were swapped. Direct database inspection of DateTest-001660 confirmed `2026-05-03 00:00:00.000` in the SQL Server `datetime` column.

The wrong date is fully queryable — an OData filter for "all records in March 2026" would miss this record, and a filter for May 2026 would incorrectly include it.

**Limitations**: Only one ambiguous date value was tested (`"05/03/2026"`). The behavior is inferred to apply to all day ≤ 12 inputs based on the parser's consistent first-component-as-month interpretation confirmed across all format tolerance tests. The server-side parser code is .NET and not available in this repository. Testing was performed on the demo environment only.

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The VV REST API's server-side date parser unconditionally interprets the first numeric component of an all-numeric date string as the month. There is no locale awareness, no format detection heuristic, and no disambiguation logic. When the day value is ≤ 12, the input is numerically valid as MM/DD, so the parser produces a result — but with month and day swapped relative to the DD/MM intent.

**File locations**: The parser is server-side .NET code, not available in this repository. The parser's behavior was characterized entirely through input/output testing. The specific .NET method or class has not been identified.

This is the same parser and same root cause as [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md). The difference is only in the outcome: day > 12 produces null (BUG-2), day ≤ 12 produces a wrong date (BUG-3).

---

## Workarounds and Fix Recommendations

See [ws-bug-3-fix-recommendations.md](ws-bug-3-fix-recommendations.md) for workarounds, proposed fix options, and impact assessment.
