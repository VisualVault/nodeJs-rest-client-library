# WEBSERVICE-BUG-3: Ambiguous Dates Silently Stored With Month and Day Swapped

## What Happens

When a developer script sends a date like `"05/03/2026"` to the VisualVault REST API, intending **March 5** (DD/MM, the convention in Latin America and Europe), the server silently stores **May 3** (MM/DD, the US convention). No error is returned. No warning is logged. The record looks complete, the date looks valid — it's just the wrong date.

This is the companion to [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md), which covers the same DD/MM input problem for days 13–31. Together they describe the full range of outcomes when a non-US date format is sent to the API:

| Day in the Date | DD/MM Input Example | What the Server Does                       | Which Bug        |
| :-------------: | ------------------- | ------------------------------------------ | ---------------- |
|      13–31      | `"15/03/2026"`      | Cannot parse (month=15 invalid) → **null** | WEBSERVICE-BUG-2 |
|      1–12       | `"05/03/2026"`      | Parses as MM/DD → **wrong date** (May 3)   | WEBSERVICE-BUG-3 |

WEBSERVICE-BUG-3 is arguably **more dangerous** than WEBSERVICE-BUG-2: a null field is obviously wrong and can be caught during QA. A plausible-but-incorrect date can go undetected for months — the record looks complete, the date looks valid, and only someone who knows the original intended value can spot the error.

---

## Severity: MEDIUM

Classified as "Undocumented Behavior" rather than a clear defect — the parser is doing what it was designed to do (US-centric MM/DD interpretation). The problem is that this behavior is undocumented and silently produces wrong results for the majority of the world's date conventions.

---

## Who Is Affected

The same population as [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) — developers using day-first date formats (Latin America, Europe, UK, Australia, India, most of Africa and Asia) — but **only for dates where the day is 1 through 12**.

This means roughly **40% of all dates** in a typical dataset are vulnerable to month/day swap (12 out of ~30.4 average days per month). The remaining ~60% hit WEBSERVICE-BUG-2 (null) instead.

### Code patterns that trigger this

```javascript
// DANGEROUS: LATAM locale formatting for early-month dates
new Date(2026, 2, 5).toLocaleDateString('es-AR');
// → "5/3/2026" — server reads as May 3, not March 5

// DANGEROUS: CSV import from European source
// Source data: "05/03/2026" meaning March 5
// Server stores: May 3 (2 months off)

// DANGEROUS: manual DD/MM string construction
const date = `${day}/${month}/${year}`; // "05/03/2026"
// Developer expects March 5, server stores May 3
```

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

The key difference from [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md): when the day is ≤ 12, the first component IS a valid month number, so the parser succeeds — but with month and day swapped.

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

- **Days 1–12**: Store the wrong date (month and day swapped) — **~40% of records**
- **Days 13–31**: Store null (data lost entirely) — **~60% of records**
- **Neither case produces an error**

The field's calendar configuration (date-only vs date+time, timezone settings, legacy mode) has **no effect** on the server parser — all field types produce the same results.

---

## Steps to Reproduce

### Via the VV Node.js SDK

```javascript
// Send an ambiguous DD/MM date
const data = { Field7: '05/03/2026' }; // Intending March 5 (DD/MM)
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.data.datafield7);
// → "2026-05-03T00:00:00Z"  (May 3 — month and day swapped)
```

### Via the Test Harness

```bash
# Create a record with an ambiguous DD/MM date
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-1 --configs A --input-date "05/03/2026"

# Read back the stored value
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-2 --configs A --record-id <record-name>
# → datafield7 = "2026-05-03T00:00:00Z"  (May 3, not March 5)
```

---

## Workarounds

Identical to [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md): **always use ISO 8601 (`YYYY-MM-DD`)** for API input. This format is unambiguous — there is no month/day swap possible.

```javascript
// SAFE: ISO 8601 — March 5 is always "2026-03-05"
const data = { Field7: '2026-03-05' };

// SAFE: construct from components explicitly
const y = 2026,
    m = 3,
    d = 5;
const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
// → "2026-03-05"

// SAFE: from Date object
const date = new Date(Date.UTC(2026, 2, 5));
const safe = date.toISOString().split('T')[0]; // "2026-03-05"
```

For DD/MM data from external sources, convert to ISO before sending:

```javascript
function ddmmToIso(input) {
    const [day, month, year] = input.split(/[\/\-\.]/);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
// ddmmToIso("05/03/2026") → "2026-03-05"
```

---

## Test Evidence

### Ambiguous Date Test

A record was created through the API with the input `"05/03/2026"` (intended as March 5 in DD/MM convention):

| Input (DD/MM Intent) | Field Type | Stored Value             | Interpretation | Status |
| -------------------- | ---------- | ------------------------ | -------------- | :----: |
| `"05/03/2026"`       | Date-only  | `"2026-05-03T00:00:00Z"` | May 3 (MM/DD)  |  FAIL  |

HTTP 200 returned. Record created successfully. Wrong date stored silently.

### Database Verification

Direct database inspection confirmed the wrong date:

| Record          | Input (intended March 5) |            Database Value             |
| --------------- | ------------------------ | :-----------------------------------: |
| DateTest-001660 | `"05/03/2026"`           | `2026-05-03 00:00:00.000` — **May 3** |

The wrong date is permanently stored in the SQL Server `datetime` column.

### Query Impact

The wrong date is fully queryable. An OData filter for "all records in March 2026" would miss this record (stored as May 3), and a filter for May 2026 would incorrectly include it.

---

## Impact Analysis

### Data Integrity: Wrong Data Stored (Harder to Detect Than Null)

Unlike [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) where the date is null (obviously wrong), this bug stores a **plausible but incorrect date**. The record looks complete. The date looks valid. Only someone who knows the intended value can detect the error.

- A March 5 import becomes May 3 — a valid date, 2 months in the future
- A January 7 import becomes July 1 — a valid date, 6 months in the future
- Reports, dashboards, and queries all use the wrong date without any indication of error

### Detection Difficulty: Very Hard

- No null fields to flag during QA
- No API errors to catch in script logs
- The stored date is always a valid calendar date
- Detection requires comparing source data against stored data, field by field
- For bulk imports, the errors are scattered across records — no obvious pattern unless you know to check for month/day swaps

---

## Proposed Fix

This bug should be addressed together with [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) since they share the same root cause (US-centric parser). The recommended approach from WEBSERVICE-BUG-2 handles both:

1. **Day > 12** (WEBSERVICE-BUG-2): Parse as DD/MM — the only valid interpretation. Eliminates silent null.
2. **Day ≤ 12** (this bug): Three options:

**Option A — Reject ambiguous dates** (safest):

```
"05/03/2026" → 400 error: "Ambiguous date format. Use ISO 8601 (YYYY-MM-DD)."
```

Forces developers to be explicit. No silent misinterpretation.

**Option B — Accept a locale hint header** (most flexible):

```
POST with header X-Date-Locale: DD/MM
"05/03/2026" → stored as March 5
```

Without the header, default to current MM/DD behavior for backwards compatibility.

**Option C — Keep current MM/DD default but document it** (minimum):
No code change. Add clear documentation that all-numeric dates are always interpreted as MM/DD. Cheapest option but does not prevent future misinterpretation.

**Recommended**: Option A (reject ambiguous dates) for all-numeric inputs where both components are ≤ 12, combined with DD/MM support for unambiguous cases (day > 12). ISO 8601 and US format always accepted without restriction.

---

## Fix Impact Assessment

### What Changes If Fixed

- Ambiguous DD/MM dates either fail with a clear error (Option A) or are parsed correctly with a locale hint (Option B)
- Developers discover the issue during development, not after production data is corrupted
- Combined with the WEBSERVICE-BUG-2 fix, all DD/MM inputs have clear, predictable behavior

### Backwards Compatibility Risk: MEDIUM

Unlike WEBSERVICE-BUG-2 (where the result is null — clearly wrong), this bug stores a valid date. Changing the interpretation could:

- Fix records that were previously wrong (month/day swapped)
- Break scripts that adapted to the MM/DD interpretation (unlikely but possible)
- Change query results for existing data if the interpretation changes retroactively

**Mitigation**: Only change behavior for new writes. Existing stored data is not reinterpreted. Document the change clearly.

### Regression Risk: LOW

The parser change is isolated to server input normalization. All currently-accepted unambiguous formats (ISO, US with month > 12, named months, etc.) are unaffected. The change only impacts the ambiguous case where both components are ≤ 12.

### Data Recovery

Existing records with swapped month/day values cannot be automatically corrected — the server has no record of the original input format. Correcting them requires re-importing from the original source data with proper ISO formatting.
