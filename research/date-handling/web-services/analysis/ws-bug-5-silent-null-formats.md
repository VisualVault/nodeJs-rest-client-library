# WEBSERVICE-BUG-5: Compact ISO and Epoch Timestamp Formats Are Silently Discarded by the API

## What Happens

Several technically valid or widely used date representations are silently accepted by the VisualVault REST API (HTTP 200, record created) but stored as `null` for the date field. The API returns success, the record is created with all non-date fields intact, and the date field is empty. No error, no warning. The data loss is only discovered when someone opens the record and finds the date missing.

The affected formats:

| Format                      | Example           | Where It Is Used                                                      |
| --------------------------- | ----------------- | --------------------------------------------------------------------- |
| Compact ISO 8601            | `"20260315"`      | Machine-generated IDs, log timestamps, healthcare (HL7), banking APIs |
| Inverted ISO                | `"2026-15-03"`    | Malformed input, copy-paste errors                                    |
| Epoch milliseconds (number) | `1773532800000`   | JavaScript `Date.getTime()`, Unix systems, message queues             |
| Epoch milliseconds (string) | `"1773532800000"` | JSON serialization of epoch values                                    |

---

## When This Applies

Two conditions must be true for this bug to cause data loss:

### 1. The date value is in one of the four affected formats

The VV REST API's date parser handles over 20 date formats (see the full accepted-format table in [WEBSERVICE-BUG-2 — Background](ws-bug-2-latam-data-loss.md#background)). The four formats listed above fall outside that vocabulary. Adding separators to compact ISO (`"2026-03-15"` instead of `"20260315"`) or converting epoch to an ISO string before sending resolves the issue.

### 2. The date is sent through the REST API

The server's date parser runs on all dates submitted through `postForms()` or `postFormRevision()` in the VV REST API. The field's calendar configuration (`enableTime`, `ignoreTimezone`, `useLegacy`) has no effect on the parser — all field types produce the same result for these formats.

Dates entered through the Forms UI are not affected — the UI uses its own date picker and formatting.

---

## Severity: LOW

These formats are uncommon in typical VV production scripts. Most VV scripts use ISO 8601 strings (`"YYYY-MM-DD"`) or US format (`"MM/DD/YYYY"`), both of which work correctly. The risk is highest for integration scripts bridging between VV and timestamp-based systems (databases, message queues, IoT platforms) where epoch is the natural format, and for data migration from systems that use compact ISO (`YYYYMMDD`) as a date identifier (HL7 healthcare messages, some European banking APIs).

The failure pattern is the same silent null as [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) — complete data loss with no error indication — but the affected population is much smaller.

---

## How to Reproduce

### Compact ISO

```javascript
const data = { Field7: '20260315' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.meta.status); // → 200 (success)
console.log(result.data.datafield7); // → null (date lost)
```

### Epoch Timestamp

```javascript
const data = { Field5: 1773532800000 }; // number
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.data.datafield5); // → null (date lost)
```

### Contrast: Adding Separators Fixes Compact ISO

```javascript
const data = { Field7: '2026-03-15' }; // ISO with separators
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.data.datafield7); // → "2026-03-15T00:00:00Z" (stored correctly)
```

- **Expected**: All four formats store March 15, 2026
- **Actual**: All four formats store null; only ISO with separators works

### Automated

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## The Problem in Detail

### Why Each Format Fails

The VV server's date parser does not recognize these four representations:

| Format                     | Why the Parser Fails                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `"20260315"` (compact ISO) | No separators — parser does not recognize an 8-digit string as a date |
| `"2026-15-03"` (inverted)  | Month position has value 15 — invalid month, fails silently           |
| `1773532800000` (number)   | Not a string — the parser expects string input                        |
| `"1773532800000"` (string) | 13-digit numeric string — parser does not recognize epoch format      |

### The Common Thread With WEBSERVICE-BUG-2

All four cases share the same failure pattern as [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md): the parser receives a value it cannot match to any known format, stores null, and returns HTTP 200. The difference is only which formats trigger it — WEBSERVICE-BUG-2 covers DD/MM dates (high impact, large affected population), this bug covers less common formats (lower impact).

### Formats That Work for Comparison

| Format              | Example                 | Status | Notes                                    |
| ------------------- | ----------------------- | :----: | ---------------------------------------- |
| ISO with separators | `"2026-03-15"`          | Works  | Adding dashes to compact ISO resolves it |
| ISO datetime        | `"2026-03-15T14:30:00"` | Works  | Full ISO always works                    |
| US format           | `"03/15/2026"`          | Works  | Parser's native format                   |
| English month       | `"March 15, 2026"`      | Works  | Word-based dates work                    |

The parser is flexible for well-known formats — compact ISO and epoch are specific gaps in its format vocabulary.

---

## Verification

Verified via the test harness (`run-ws-test.js`) on the demo environment at `vvdemo.visualvault.com`. 4 format tolerance tests confirmed that all four formats (compact ISO, inverted ISO, epoch as number, epoch as string) result in null — HTTP 200 returned in all cases with the date field stored as null. Both date-only and date+time field types produce the same result, confirming the field's calendar configuration has no effect on the parser. Epoch tests were independently confirmed in a separate test run.

Direct database inspection of DateTest-001704 (compact ISO), DateTest-001706 (epoch number), and DateTest-001708 (compact ISO re-test) confirmed NULL across all datetime columns — records exist with document IDs and non-date fields intact, but all date columns are empty.

**Limitations**: Testing was performed on the demo environment only. The server-side parser code is .NET and not available in this repository — parser behavior was characterized through input/output testing. Other epoch representations (seconds instead of milliseconds, negative values, epoch 0) were not tested.

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The VV REST API's server-side date parser does not include compact ISO 8601 (`YYYYMMDD`), inverted ISO (`YYYY-DD-MM`), or epoch timestamps (numeric or string) in its format vocabulary. When the parser encounters a value that does not match any recognized format, it returns null without generating an error. The calling code stores the null value and returns HTTP 200 to the client.

**File locations**: The parser is server-side .NET code, not available in this repository. The parser's format vocabulary was characterized entirely through input/output testing — submitting various formats via `postForms()` and inspecting database values. The specific .NET method or class has not been identified.

This is the same silent-null mechanism as [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) and [WEBSERVICE-BUG-3](ws-bug-3-ambiguous-dates.md) — all three bugs stem from the parser's lack of error reporting when it encounters an unrecognized format.

---

## Workarounds and Fix Recommendations

See [ws-bug-5-fix-recommendations.md](ws-bug-5-fix-recommendations.md) for workarounds, proposed fix, and impact assessment.
