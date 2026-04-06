# WS-BUG-5: Compact/Epoch Formats Silently Stored as Null

## Classification

| Field                  | Value                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Severity**           | LOW                                                                                                            |
| **Evidence**           | `[LIVE]` — Confirmed via WS-5 format tolerance tests + cat10-gaps-run-1 epoch tests                            |
| **Component**          | VV Server — date parser                                                                                        |
| **Code Path**          | `postForms()` / `postFormRevision()` → server date parser → `null`                                             |
| **Affected Configs**   | All (A–H) — server parser is config-agnostic (CB-6)                                                            |
| **Affected TZs**       | N/A — server-side defect, timezone irrelevant                                                                  |
| **Affected Scenarios** | Scripts using compact ISO, epoch timestamps, inverted ISO, or other non-standard formats                       |
| **Related Bugs**       | WS-BUG-2 (same silent-null pattern for DD/MM/YYYY formats — higher severity due to larger affected population) |

---

## Summary

Several technically valid or widely used date representations are silently accepted by the VV API (HTTP 200, record created) but stored as `null` for the date field. The pattern is identical to WS-BUG-2: the server parser does not recognize the format, fails silently, and stores nothing — with no error in the response.

The affected formats are:

| Format                      | Example                     | Use Case                                          |
| --------------------------- | --------------------------- | ------------------------------------------------- |
| Compact ISO 8601            | `"20260315"`                | Machine-generated IDs, log timestamps, some APIs  |
| Inverted ISO                | `"2026-15-03"` (YYYY-DD-MM) | Malformed input, copy-paste errors                |
| Epoch milliseconds (number) | `1773532800000`             | JavaScript `Date.getTime()`, Unix-derived systems |
| Epoch milliseconds (string) | `"1773532800000"`           | JSON serialization of epoch values                |

Severity is LOW because these formats are unlikely in typical VV production scripts. Most VV scripts use ISO 8601 strings or US-formatted dates, both of which are correctly handled. This bug primarily affects integrations with external systems that use epoch timestamps or compact ISO formats.

---

## Who Is Affected

### Epoch timestamp users

Scripts that compute dates using `Date.getTime()` or receive timestamps from Unix-derived systems, message queues, or databases that store dates as epoch milliseconds. Sending the raw numeric value to the VV API silently loses the date.

```javascript
// DANGEROUS: epoch timestamp from external system
const epochMs = 1773532800000; // = 2026-03-15T00:00:00.000Z
const data = { Field7: epochMs }; // number → null
// Also fails as string:
const data2 = { Field7: String(epochMs) }; // "1773532800000" → null
```

### Compact ISO users

Less common, but possible in systems that use `YYYYMMDD` as a compact date identifier (log files, some European banking APIs, HL7 healthcare messages).

### Not significantly affected

Typical VV developers — the standard VV scripting patterns use ISO 8601 strings (`"YYYY-MM-DD"`) or US format (`"MM/DD/YYYY"`), both of which work correctly. The affected formats are edge cases.

---

## Root Cause

The VV server's date parser has a finite format vocabulary. It recognizes ISO 8601 (with separators), US numeric formats, English month names, and several variants (CB-14 confirmed 20+ accepted formats). Formats outside this vocabulary fail silently — the parser returns null instead of an error, and the API layer does not validate or report the failure.

### Why each format fails

| Format                      | Why the Parser Fails                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `"20260315"` (compact ISO)  | No separators — parser doesn't recognize 8-digit string as a date                        |
| `"2026-15-03"` (YYYY-DD-MM) | Month position has value 15 — invalid month, fails silently (same as WS-BUG-2 mechanism) |
| `1773532800000` (number)    | Not a string — `JSON.stringify` sends the numeric value, parser expects a string         |
| `"1773532800000"` (string)  | 13-digit numeric string — parser doesn't recognize epoch format                          |

### The common thread

All four cases share the same failure pattern: the server parser receives a value it cannot match to any known date format, and instead of returning an error, it stores `null`. This is the same silent-null pattern as WS-BUG-2 — the difference is only which formats trigger it.

---

## Expected vs Actual Behavior

| Slot          | Config | Format         | Input             | Expected                 | Actual Stored | HTTP Status |
| ------------- | :----: | -------------- | ----------------- | ------------------------ | :-----------: | :---------: |
| ws-5-A-COMP   |   A    | Compact ISO    | `"20260315"`      | `"2026-03-15T00:00:00Z"` |  **`null`**   |     200     |
| ws-5-A-YRDM   |   A    | Inverted ISO   | `"2026-15-03"`    | Error or `null`          |  **`null`**   |     200     |
| ws-5-D-EPOCH  |   D    | Epoch (number) | `1773532800000`   | `"2026-03-15T00:00:00Z"` |  **`null`**   |     200     |
| ws-5-D-EPOCHS |   D    | Epoch (string) | `"1773532800000"` | `"2026-03-15T00:00:00Z"` |  **`null`**   |     200     |

### Contrast: accepted formats that DO work

| Format              | Example                 | Stored                   | Notes                                      |
| ------------------- | ----------------------- | ------------------------ | ------------------------------------------ |
| ISO with separators | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | Adding dashes to compact ISO makes it work |
| ISO datetime        | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | Full ISO always works                      |
| US format           | `"03/15/2026"`          | `"2026-03-15T00:00:00Z"` | Parser's native format                     |
| English month       | `"March 15, 2026"`      | `"2026-03-15T00:00:00Z"` | Word-based dates work                      |

---

## Steps to Reproduce

### Compact ISO

```bash
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-1 --configs A --input-date "20260315"
# Read back:
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-2 --configs A --record-id <record-name>
# → datafield7 = null
```

### Epoch timestamp

```javascript
const data = { Field5: 1773532800000 }; // number
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);
console.log(result.data.datafield5); // → null
```

---

## Test Evidence

### WS-5: Input Format Tolerance (4 FAIL slots)

Run: [`ws-5-batch-run-1.md`](../runs/ws-5-batch-run-1.md) — 2026-04-02, BRT

| Slot          | Format         | Input             | Stored | Status |
| ------------- | -------------- | ----------------- | :----: | :----: |
| ws-5-A-COMP   | Compact ISO    | `"20260315"`      | `null` |  FAIL  |
| ws-5-A-YRDM   | Inverted ISO   | `"2026-15-03"`    | `null` |  FAIL  |
| ws-5-D-EPOCH  | Epoch (number) | `1773532800000`   | `null` |  FAIL  |
| ws-5-D-EPOCHS | Epoch (string) | `"1773532800000"` | `null` |  FAIL  |

### cat10-gaps-run-1: Epoch confirmation

Run: [`cat10-gaps-run-1.md`](../runs/cat10-gaps-run-1.md) — 2026-04-02, BRT

Epoch tests (numeric and string) independently confirmed as silent null. Both variants accepted (record created), both stored null.

### Confirmed Behaviors

| CB    | Description                                                                                    | Source |
| ----- | ---------------------------------------------------------------------------------------------- | ------ |
| CB-17 | Compact ISO (`"20260315"`), epoch timestamps (number and string) silently stored as `null`     | WS-5   |
| CB-14 | Server accepts 20+ formats (ISO, US, DB, named months, etc.) — these 4 are specific exclusions | WS-5   |

---

## Impact Analysis

### Data Integrity: Same Pattern as WS-BUG-2

Complete silent data loss — the date field is stored as `null` with no error indication. The record is created successfully with all non-date fields intact.

### Detection Difficulty: Same as WS-BUG-2

Null date fields are indistinguishable from intentionally empty fields. Discovery only happens on manual inspection.

### Scale: Limited

Unlike WS-BUG-2 (which affects an entire region's date convention), these formats are uncommon in VV production scripts:

- **Compact ISO**: rarely used in web applications; more common in file naming and batch systems
- **Inverted ISO**: typically a malformed input, not an intentional format
- **Epoch timestamps**: common in JavaScript and Unix systems, but VV scripts typically use string dates. The risk is higher for integration scripts that bridge between VV and timestamp-based systems (databases, message queues, IoT platforms).

### Risk of epoch format in integrations

The epoch case is the most likely to occur in production. A script receiving a timestamp from a database (`SELECT EXTRACT(EPOCH FROM date_column) * 1000`), a message queue (Kafka, RabbitMQ), or a REST API that returns dates as milliseconds would naturally pass the numeric value to `postForms`. The silent null makes this a difficult-to-diagnose integration failure.

---

## Workarounds

### Convert to ISO 8601 before sending

```javascript
// Compact ISO → ISO with separators
const compact = '20260315';
const iso = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
// → "2026-03-15"

// Epoch → ISO string
const epoch = 1773532800000;
const isoFromEpoch = new Date(epoch).toISOString().split('T')[0];
// → "2026-03-15"

// Epoch → ISO datetime
const isoFull = new Date(epoch).toISOString();
// → "2026-03-15T00:00:00.000Z" (milliseconds stripped by server — CB-13)

// Always send the string, never the number
const data = { Field7: isoFromEpoch }; // "2026-03-15" → works
```

### Validate format before sending

```javascript
// Quick check: does this look like a format the VV API accepts?
function isVvAcceptedFormat(value) {
    if (typeof value !== 'string') return false;
    if (/^\d{8}$/.test(value)) return false; // compact ISO
    if (/^\d{10,13}$/.test(value)) return false; // epoch
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true; // ISO date
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return true; // US format
    return true; // let other formats through — server is flexible
}
```

---

## Proposed Fix

### Same validation improvement as WS-BUG-2

The server should return a clear error for unrecognizable date formats instead of silently storing `null`:

```
Current:  POST { Field7: "20260315" }      → 200 OK, Field7 = null
Fixed:    POST { Field7: "20260315" }      → 400 Bad Request
          { "error": "Unrecognized date format for Field7. Use ISO 8601 (YYYY-MM-DD)." }
```

### Optional: add epoch and compact ISO support

If there is demand, the server could be extended to recognize:

- **Compact ISO** (`"20260315"`) → parse as `YYYYMMDD` → `"2026-03-15T00:00:00Z"`
- **Epoch milliseconds** (number or string) → `new Date(value).toISOString()` → ISO+Z

This is lower priority than WS-BUG-2 (DD/MM support) because the affected population is smaller. The minimum viable fix is validation errors for unrecognized formats.

---

## Fix Impact Assessment

### What Changes If Fixed

- Scripts sending compact ISO or epoch values get an explicit error instead of silent data loss
- Optional: epoch and compact ISO formats become accepted inputs

### Backwards Compatibility Risk

**NONE**: These formats are currently silently broken. There is no existing correct data created through these formats — only null values. Any change (error or acceptance) is an improvement.

### Regression Risk

**LOW**: The parser change only affects formats that currently produce null. All 20+ accepted formats are unaffected. Standard regression testing of the WS-5 matrix (33 slots) would verify no accepted format broke.

### Testing Recommendation

Re-run ws-5-A-COMP, ws-5-A-YRDM, ws-5-D-EPOCH, ws-5-D-EPOCHS after the fix. If epoch support is added, add new test slots for edge cases (negative epoch, epoch 0, epoch in seconds vs milliseconds, string epoch with leading zeros).
