# WEBSERVICE-BUG-5: Compact ISO and Epoch Timestamp Formats Are Silently Discarded by the API

## What Happens

Several technically valid or widely used date representations are silently accepted by the VisualVault REST API (HTTP 200, record created) but stored as `null` for the date field. The pattern is identical to [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md): the server's date parser does not recognize the format, fails without generating an error, and stores nothing.

The affected formats:

| Format                      | Example           | Where It's Used                                                       |
| --------------------------- | ----------------- | --------------------------------------------------------------------- |
| Compact ISO 8601            | `"20260315"`      | Machine-generated IDs, log timestamps, healthcare (HL7), banking APIs |
| Inverted ISO                | `"2026-15-03"`    | Malformed input, copy-paste errors                                    |
| Epoch milliseconds (number) | `1773532800000`   | JavaScript `Date.getTime()`, Unix systems, message queues             |
| Epoch milliseconds (string) | `"1773532800000"` | JSON serialization of epoch values                                    |

In every case: the API returns success (HTTP 200), the record is created with all non-date fields intact, and the date field is silently empty. No error, no warning. The data loss is only discovered when someone opens the record and finds the date missing.

---

## Severity: LOW

These formats are uncommon in typical VV production scripts. Most VV scripts use ISO 8601 strings (`"YYYY-MM-DD"`) or US format (`"MM/DD/YYYY"`), both of which work correctly. This bug primarily affects integrations with external systems that use epoch timestamps or compact date formats.

---

## Who Is Affected

### Epoch timestamp users (the most likely production scenario)

Scripts that receive timestamps from external databases, message queues (Kafka, RabbitMQ), IoT platforms, or REST APIs that return dates as milliseconds. A script naturally passing the numeric value to the VV API silently loses the date:

```javascript
// DANGEROUS: epoch timestamp from external system
const epochMs = 1773532800000; // = 2026-03-15T00:00:00.000Z
const data = { Field7: epochMs }; // number → null (data lost)

// Also fails as a string:
const data2 = { Field7: String(epochMs) }; // "1773532800000" → null
```

### Compact ISO users (less common)

Possible in systems that use `YYYYMMDD` as a compact date identifier — log files, some European banking APIs, HL7 healthcare messages:

```javascript
const compact = '20260315';
const data = { Field7: compact }; // → null
// Adding dashes fixes it:
const data2 = { Field7: '2026-03-15' }; // → works
```

### Not significantly affected

Typical VV developers — standard scripting patterns use ISO 8601 with separators or US format, both of which are correctly handled. The affected formats are edge cases.

---

## The Problem in Detail

### Why Each Format Fails

The VV server's date parser has a broad format vocabulary — it successfully handles over 20 formats including ISO 8601, US format, year-first with various separators, English month names, and the VV internal database format (see [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) for the full accepted-format table). These four formats fall outside that vocabulary:

| Format                     | Why the Parser Fails                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `"20260315"` (compact ISO) | No separators — parser doesn't recognize an 8-digit string as a date |
| `"2026-15-03"` (inverted)  | Month position has value 15 — invalid month, fails silently          |
| `1773532800000` (number)   | Not a string — the parser expects string input                       |
| `"1773532800000"` (string) | 13-digit numeric string — parser doesn't recognize epoch format      |

### The Common Thread

All four cases share the same failure pattern as WEBSERVICE-BUG-2: the parser receives a value it cannot match to any known format, stores `null`, returns HTTP 200. The difference is only which formats trigger it — WEBSERVICE-BUG-2 covers DD/MM dates (high impact, large affected population), this bug covers less common formats (lower impact).

### Contrast: Similar Formats That Work

| Format              | Example                 | Status | Notes                                      |
| ------------------- | ----------------------- | :----: | ------------------------------------------ |
| ISO with separators | `"2026-03-15"`          | Works  | Adding dashes to compact ISO makes it work |
| ISO datetime        | `"2026-03-15T14:30:00"` | Works  | Full ISO always works                      |
| US format           | `"03/15/2026"`          | Works  | Parser's native format                     |
| English month       | `"March 15, 2026"`      | Works  | Word-based dates work                      |

The parser is flexible for well-known formats — compact ISO and epoch are specific blind spots.

---

## Steps to Reproduce

### Compact ISO

```javascript
const data = { Field7: '20260315' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.meta.status); // → 200 (success!)
console.log(result.data.datafield7); // → null (date lost)
```

### Epoch Timestamp

```javascript
const data = { Field5: 1773532800000 }; // number
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.data.datafield5); // → null (date lost)
```

---

## Workarounds

### Convert to ISO 8601 Before Sending

```javascript
// Compact ISO → ISO with separators
const compact = '20260315';
const iso = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
// → "2026-03-15" (now accepted)

// Epoch → ISO date string
const epoch = 1773532800000;
const isoFromEpoch = new Date(epoch).toISOString().split('T')[0];
// → "2026-03-15" (now accepted)

// Epoch → full ISO datetime
const isoFull = new Date(epoch).toISOString();
// → "2026-03-15T00:00:00.000Z" (also accepted)

// Always send as a string, never as a number
const data = { Field7: isoFromEpoch };
```

### Validate Format Before Sending

```javascript
function isVvAcceptedFormat(value) {
    if (typeof value !== 'string') return false; // numbers not accepted
    if (/^\d{8}$/.test(value)) return false; // compact ISO
    if (/^\d{10,13}$/.test(value)) return false; // epoch
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true; // ISO date
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return true; // US format
    return true; // let other formats through — server is flexible
}
```

---

## Test Evidence

### Format Tolerance Tests (4 FAIL Slots)

Records created through the API with each format, then read back to verify what was stored:

| Format         | Input             | Field Type | HTTP Response | Stored Value | Status |
| -------------- | ----------------- | ---------- | :-----------: | :----------: | :----: |
| Compact ISO    | `"20260315"`      | Date-only  |      200      |   **null**   |  FAIL  |
| Inverted ISO   | `"2026-15-03"`    | Date-only  |      200      |   **null**   |  FAIL  |
| Epoch (number) | `1773532800000`   | Date+time  |      200      |   **null**   |  FAIL  |
| Epoch (string) | `"1773532800000"` | Date+time  |      200      |   **null**   |  FAIL  |

All 4 tests: HTTP 200 returned, record created, date field stored as null. The field's calendar configuration has no effect on the server parser — both date-only and date+time fields produce the same result.

Epoch tests independently confirmed in a separate test run — both numeric and string variants accepted (record created), both stored null.

### Database Verification

Direct database inspection confirmed the data loss:

| Record          | Input                           |    Database Value     |
| --------------- | ------------------------------- | :-------------------: |
| DateTest-001704 | `"20260315"` (compact)          | All date columns NULL |
| DateTest-001706 | `1773532800000` (epoch number)  | All date columns NULL |
| DateTest-001708 | `"20260315"` (compact, re-test) | All date columns NULL |

Records exist in the database (have document IDs and all non-date fields), but every `datetime` column is NULL. The parser failed to convert these formats.

---

## Impact Analysis

### Same Silent-Null Pattern as WEBSERVICE-BUG-2

Complete silent data loss — the date field is stored as `null` with no error indication. The record is created successfully with all non-date fields intact. Null date fields are indistinguishable from intentionally empty fields.

### Scale: Limited but Real for Integrations

Unlike [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) (which affects an entire region's date convention), these formats are uncommon in typical VV scripts. The risk is highest for:

- **Integration scripts** bridging between VV and timestamp-based systems (databases, message queues, IoT platforms) — epoch is the natural format in these contexts
- **Data migration scripts** importing from systems that use compact ISO (`YYYYMMDD`) as a date identifier
- **Healthcare integrations** using HL7 message formats (which use compact ISO dates)

The epoch case is the most likely to occur in production — a script receiving a timestamp from an external database or message queue would naturally pass the numeric value to the API.

---

## Proposed Fix

### Minimum: Return Validation Errors for Unrecognized Formats

Same approach as [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) — the server should return a clear error instead of silently storing null:

```
Current:  POST { Field7: "20260315" }      → 200 OK, Field7 = null
Fixed:    POST { Field7: "20260315" }      → 400 Bad Request
          { "error": "Unrecognized date format for Field7. Use ISO 8601 (YYYY-MM-DD)." }
```

### Optional: Add Compact ISO and Epoch Support

If there is demand, the server parser could be extended to recognize:

- **Compact ISO** (`"20260315"`) → parse as `YYYYMMDD` → `"2026-03-15T00:00:00Z"`
- **Epoch milliseconds** (number or string) → `new Date(value).toISOString()` → ISO+Z

This is lower priority than [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) (DD/MM support) because the affected population is smaller. The minimum viable fix is validation errors for unrecognized formats.

---

## Fix Impact Assessment

### What Changes If Fixed

- Scripts sending compact ISO or epoch values get an explicit error instead of silent data loss
- Optional: these formats become accepted inputs

### Backwards Compatibility Risk: NONE

These formats are currently silently broken. There is no existing correct data created through them — only null values. Any change (error or acceptance) is an improvement.

### Regression Risk: LOW

The parser change only affects formats that currently produce null. All 20+ accepted formats are unaffected. Standard regression testing of the format tolerance matrix would verify no accepted format broke.

### Testing Recommendation

After the fix, verify all four formats either return an error or store correctly. If epoch support is added, test edge cases: negative epoch, epoch 0 (Unix epoch), epoch in seconds vs milliseconds, string epoch with leading zeros.
