# WS-3: US-Biased Date Parsing for Ambiguous Inputs (Undocumented Behavior)

## Classification

| Field                  | Value                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Type**               | Undocumented Behavior                                                            |
| **Severity**           | MEDIUM                                                                           |
| **Evidence**           | `[LIVE]` — Confirmed via WS-5 ambiguous date test (1 slot)                       |
| **Component**          | VV Server — date parser                                                          |
| **Code Path**          | `postForms()` / `postFormRevision()` → server date parser → MM/DD interpretation |
| **Affected Configs**   | All (A–H) — server parser is config-agnostic (CB-6)                              |
| **Affected TZs**       | N/A — server-side defect, timezone irrelevant                                    |
| **Affected Scenarios** | Any script sending DD/MM dates where the day value is 1–12                       |
| **Related Bugs**       | WS-BUG-2 (same parser — day > 12 produces `null` instead of wrong date)          |

---

## Summary

When a date string has an ambiguous numeric format where both the first and second components are ≤ 12 (e.g., `"05/03/2026"`), the VV server always interprets it as **MM/DD/YYYY** (US convention). A developer intending March 5 (DD/MM) gets **May 3** (MM/DD) stored — silently, with no error or warning.

This is the companion bug to WS-BUG-2 (silent null for day > 12). Together they cover the full range of DD/MM inputs:

| Day Value | DD/MM Input    | Server Behavior                     | Bug          |
| :-------: | -------------- | ----------------------------------- | ------------ |
|   13–31   | `"15/03/2026"` | Stored as `null` — silent data loss | WS-BUG-2     |
|   1–12    | `"05/03/2026"` | Stored as May 3 — **wrong date**    | **WS-BUG-3** |

WS-BUG-3 is more insidious than WS-BUG-2: a valid date IS stored (not null), making the error much harder to detect. The record looks complete. The date looks plausible. Only a manual comparison between the intended value and the stored value reveals the swap.

---

## Who Is Affected

The same population as WS-BUG-2 — Latin American, European, and other DD/MM-convention developers — but **only for dates where the day is 1 through 12**. This means:

- **January through December**: any day 1–12 in any month is vulnerable
- **Roughly 40% of all dates** in a typical dataset have day ≤ 12 (12 out of ~30.4 days per month)
- The remaining ~60% hit WS-BUG-2 (null) instead

### Specific vulnerable patterns

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

## Root Cause

Same US-centric date parser as WS-BUG-2. The parser always interprets the first numeric component as the month and the second as the day — following the US MM/DD/YYYY convention. There is no locale-awareness, no format detection heuristic, and no disambiguation logic.

```
Input:    "05/03/2026"
Parser:   Interprets as MM/DD/YYYY → month = 5, day = 3 → May 3, 2026
          Never considers DD/MM/YYYY interpretation → March 5, 2026
Result:   "2026-05-03T00:00:00Z" stored (wrong date, no error)
```

The key difference from WS-BUG-2: when day ≤ 12, the first component IS a valid month number, so the parser succeeds — but with the month and day swapped.

### When the swap is invisible

If the developer intended DD/MM and both components are the same (e.g., `"03/03/2026"` — March 3), the swap produces the same date. This case is a coincidental correct result, not a parser fix.

### When the swap is detectable

The swap always produces a date that is `|month - day|` months off from the intended date. For `"05/03/2026"` (intended March 5), the stored value is May 3 — exactly 2 months later.

---

## Expected vs Actual Behavior

### Tested Case (WS-5)

| Slot         | Config | Input (DD/MM intent)     | Expected Stored          |      Actual Stored       | Interpretation |     Delta     |
| ------------ | :----: | ------------------------ | ------------------------ | :----------------------: | -------------- | :-----------: |
| ws-5-A-AMBIG |   A    | `"05/03/2026"` (March 5) | `"2026-03-05T00:00:00Z"` | `"2026-05-03T00:00:00Z"` | May 3 (MM/DD)  | **+2 months** |

### Extrapolated Cases (same parser behavior, not individually tested)

| Input (DD/MM intent) | Intended Date | Stored Date |      Delta       |
| -------------------- | :-----------: | :---------: | :--------------: |
| `"01/06/2026"`       |    June 1     |  January 6  |    -5 months     |
| `"07/01/2026"`       |   January 7   |   July 1    |    +6 months     |
| `"12/11/2026"`       |  November 12  | December 11 |     +1 month     |
| `"06/06/2026"`       |    June 6     |   June 6    | 0 (coincidental) |
| `"10/03/2026"`       |   March 10    |  October 3  |    +7 months     |

### Boundary Between WS-BUG-2 and WS-BUG-3

| Input (DD/MM intent)      | Day Value | Server Behavior                     | Bug      |
| ------------------------- | :-------: | ----------------------------------- | -------- |
| `"12/03/2026"` (March 12) |    12     | Stored as December 3 — wrong date   | WS-BUG-3 |
| `"13/03/2026"` (March 13) |    13     | Stored as `null` — month 13 invalid | WS-BUG-2 |

---

## Steps to Reproduce

```bash
# 1. Create a record with an ambiguous DD/MM date
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-1 --configs A --input-date "05/03/2026"

# 2. Read back the stored value
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-2 --configs A --record-id <record-name>
# → datafield7 = "2026-05-03T00:00:00Z"  (May 3, not March 5)
```

Or via API directly:

```javascript
const data = { Field7: '05/03/2026' }; // Intending March 5 (DD/MM)
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
const result = JSON.parse(resp);

console.log(result.data.datafield7);
// → "2026-05-03T00:00:00Z"  (May 3 stored — month and day swapped)
```

---

## Test Evidence

### WS-5: Input Format Tolerance (1 slot)

Run: [`ws-5-batch-run-1.md`](../runs/ws-5-batch-run-1.md) — 2026-04-02, BRT

| Slot         | Config | Input          | Stored                   | Expected          | Status | Notes                        |
| ------------ | :----: | -------------- | ------------------------ | ----------------- | :----: | ---------------------------- |
| ws-5-A-AMBIG |   A    | `"05/03/2026"` | `"2026-05-03T00:00:00Z"` | March 5 or May 3? | PASS\* | Interpreted as MM/DD (May 3) |

\*Marked PASS in the matrix because the API correctly stored what the parser parsed. The FAIL is in the **ambiguity** — the parser has a US bias that is undocumented and produces wrong results for DD/MM-convention users.

### DB Dump Verification (2026-04-06)

| Record          | Input (intended March 5) |             Field7 in DB              |
| --------------- | ------------------------ | :-----------------------------------: |
| DateTest-001660 | `"05/03/2026"`           | `2026-05-03 00:00:00.000` — **May 3** |

The DB column is SQL Server `datetime`. The wrong date is permanently stored — May 3 instead of March 5.

### Confirmed Behaviors

| CB    | Description                                                            | Source |
| ----- | ---------------------------------------------------------------------- | ------ |
| CB-16 | Ambiguous dates (day ≤ 12) always interpreted as MM/DD (US), not DD/MM | WS-5   |

---

## Impact Analysis

### Data Integrity: Wrong Data Stored (Worse Than Null)

Unlike WS-BUG-2 where the date is null (obviously wrong), WS-BUG-3 stores a **plausible but incorrect date**. The record looks complete. The date looks valid. Only someone who knows the intended value can detect the error.

- A March 5 import becomes May 3 — a valid date, 2 months in the future
- A January 7 import becomes July 1 — a valid date, 6 months in the future
- Reports, dashboards, and queries all use the wrong date without any indication of error

### Detection Difficulty: Very Hard

- No null fields to flag during QA
- No API errors to catch in script logs
- The stored date is always a valid calendar date
- Detection requires comparing source data against stored data, field by field
- For bulk imports, the errors are scattered across records — no obvious pattern unless you know to check for month/day swaps

### Scale: Subset of WS-BUG-2 Population

Affects the same DD/MM developer population, but only for dates where day ≤ 12 (~40% of dates). Combined with WS-BUG-2:

| Month Day Range | % of Dates | Outcome for DD/MM Input      |
| :-------------: | :--------: | ---------------------------- |
|      1–12       |    ~40%    | Wrong date stored (WS-BUG-3) |
|      13–31      |    ~60%    | Null stored (WS-BUG-2)       |

A typical DD/MM data migration would lose ~60% of dates to null and silently corrupt ~40% with swapped month/day.

### Interaction with OData Queries

The wrong dates are fully queryable (CB-22). An OData filter for "all records in March 2026" would miss the March 5 record (now stored as May 3) and might pick up records from other months that were incorrectly mapped into March.

---

## Workarounds

Identical to WS-BUG-2: **always use ISO 8601 (`YYYY-MM-DD`)** for API input. This format is unambiguous — there is no month/day swap possible.

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

## Proposed Fix

This bug should be addressed together with WS-BUG-2 as they share the same root cause (US-centric parser). The recommended fix (Option C from WS-BUG-2) handles both:

### For unambiguous DD/MM (day > 12) — WS-BUG-2

Parse as DD/MM (the only valid interpretation). Eliminates silent null.

### For ambiguous dates (day ≤ 12) — WS-BUG-3

Three sub-options:

**A. Reject ambiguous all-numeric dates** (safest):

```
"05/03/2026" → 400 error: "Ambiguous date format. Use ISO 8601 (YYYY-MM-DD)."
```

Forces developers to be explicit. No silent misinterpretation.

**B. Accept a locale hint** (most flexible):

```
POST /formtemplates/{id}/forms
Header: X-Date-Locale: DD/MM
Body: { Field7: "05/03/2026" }
→ Stored as "2026-03-05T00:00:00Z" (March 5)
```

Without the header, default to current MM/DD behavior for backwards compatibility.

**C. Keep current MM/DD default but document it** (minimum):
No code change. Add clear documentation that all-numeric dates are always MM/DD. This is the cheapest option but does not prevent future misinterpretation.

### Recommended Approach

Option A (reject ambiguous) combined with WS-BUG-2's parser extension for unambiguous DD/MM. This eliminates both silent data loss and silent misinterpretation, at the cost of requiring ISO format for ambiguous dates.

---

## Fix Impact Assessment

### What Changes If Fixed

- Ambiguous DD/MM dates either fail explicitly (Option A) or are parsed correctly with a locale hint (Option B)
- Developers discover the issue at development time, not after production data is corrupted
- Combined with WS-BUG-2 fix, all DD/MM inputs have a clear, predictable behavior

### Backwards Compatibility Risk

**MEDIUM**: Unlike WS-BUG-2 (where the result is null — clearly wrong), WS-BUG-3 stores a valid date. Changing the interpretation of ambiguous dates could:

- Fix records that were previously wrong (month/day swapped)
- Break scripts that adapted to the MM/DD interpretation (unlikely but possible)
- Change query results for existing data if the interpretation changes retroactively

**Mitigation**: Only change behavior for new writes. Existing stored data is not reinterpreted. Document the change clearly.

### Regression Risk

**LOW**: The parser change is isolated to server input normalization. All currently-accepted unambiguous formats (ISO, US with month > 12, named months, etc.) are unaffected. The change only impacts the ambiguous case where both components are ≤ 12.

### Data Migration Consideration

Existing records with swapped month/day values from WS-BUG-3 cannot be automatically corrected — the server has no record of the original input format. A migration would require re-importing from the source data with correct formatting.
