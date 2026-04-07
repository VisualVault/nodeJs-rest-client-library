# FORM-BUG-7: Date-Only Fields Store the Wrong Day for Users East of London

## What Happens

A user in Mumbai selects **March 15, 2026** in a date-only calendar field. The form displays March 15 correctly. But the database stores **March 14**. Every report, dashboard, SQL query, and API response that reads this field will show March 14 — the previous day.

This happens because the system parses date-only strings as local midnight, and for users in timezones east of UTC, local midnight falls on the previous day when converted to UTC. The system then extracts the UTC date portion and stores the previous day.

The form always displays the correct date (it uses the in-memory Date object, not the stored string). The discrepancy only becomes visible when the stored value is read by downstream systems.

---

## When This Applies

Three conditions must all be true:

### 1. The field must be date-only (`enableTime=false`)

VisualVault calendar fields have three per-field configuration flags: `enableTime` (date-only vs date+time), `ignoreTimezone` (skip timezone conversion), and `useLegacy` (use older rendering/save code). See the [Appendix](#appendix-field-configuration-reference) for the full mapping.

All four date-only configs (A, B, E, F) are affected. Neither `ignoreTimezone` nor `useLegacy` provides any protection — all date-only fields share the same defective parsing code:

| Config | enableTime | ignoreTimezone | useLegacy | Affected in UTC+?                |
| ------ | ---------- | -------------- | --------- | -------------------------------- |
| **A**  | —          | —              | —         | ✅ **Yes** — stores -1 day       |
| **B**  | —          | ✅             | —         | ✅ **Yes** — stores -1 day       |
| **E**  | —          | —              | ✅        | ✅ **Yes** — stores -1 day       |
| **F**  | —          | ✅             | ✅        | ✅ **Yes** — stores -1 day       |
| C      | ✅         | —              | —         | ❌ No — DateTime, different path |
| D      | ✅         | ✅             | —         | ❌ No — DateTime, different path |
| G      | ✅         | —              | ✅        | ❌ No — DateTime, different path |
| H      | ✅         | ✅             | ✅        | ❌ No — DateTime, different path |

### 2. The user's timezone must be east of UTC (UTC+)

Users in UTC+ timezones store -1 day. Users in UTC- and UTC+0 are unaffected:

| Timezone              | UTC Offset | March 15 Entry → Stored As |
| --------------------- | ---------- | -------------------------- |
| Mumbai (IST)          | UTC+5:30   | **March 14** (-1 day)      |
| Tokyo (JST)           | UTC+9      | **March 14** (-1 day)      |
| Sydney (AEST)         | UTC+10     | **March 14** (-1 day)      |
| Dubai (GST)           | UTC+4      | **March 14** (-1 day)      |
| Berlin (CEST, summer) | UTC+2      | **March 14** (-1 day)      |
| São Paulo (BRT)       | UTC-3      | March 15 (correct)         |
| New York (EST/EDT)    | UTC-5/-4   | March 15 (correct)         |
| London (GMT, winter)  | UTC+0      | March 15 (correct)         |

UTC- users are safe because their local midnight is still the same UTC calendar day. For example, São Paulo midnight March 15 = UTC 03:00 March 15 — the date portion is still March 15.

### 3. Every input method is affected

This is not limited to one entry path. Calendar popup, typed input, preset defaults, `SetFieldValue()`, and form load all produce the same wrong result:

| Input Method | Input Value                  | Stored in Mumbai (IST)  | Stored in São Paulo (BRT) |
| ------------ | ---------------------------- | ----------------------- | ------------------------- |
| Any format   | `"2026-03-15"`               | `"2026-03-14"` (-1 day) | `"2026-03-15"` (correct)  |
| Any format   | `"03/15/2026"`               | `"2026-03-14"` (-1 day) | `"2026-03-15"` (correct)  |
| Any format   | `"2026-03-15T00:00:00"`      | `"2026-03-14"` (-1 day) | `"2026-03-15"` (correct)  |
| Any format   | `"2026-03-15T00:00:00.000Z"` | `"2026-03-14"` (-1 day) | `"2026-03-15"` (correct)  |

---

## Severity: HIGH

Systematic data integrity failure affecting every date-only field write from every UTC+ timezone, on every input path. No user-visible warning — the form displays the correct date while storing the wrong one. No field-level configuration prevents it.

---

## How to Reproduce

### Prerequisites

- Set system timezone to Mumbai: `sudo systemsetup -settimezone Asia/Calcutta`
- Restart Chrome (timezone is read at launch)
- Verify: `new Date().toString()` should show `GMT+0530`

### 1. Demonstrate the -1 Day Shift

```javascript
VV.Form.SetFieldValue('Field7', '2026-03-15');
VV.Form.VV.FormPartition.getValueObjectValue('Field7');
// Returns: "2026-03-14" ← WRONG (should be "2026-03-15")
```

### 2. Demonstrate Year Boundary Crossing

```javascript
VV.Form.SetFieldValue('Field7', '2026-01-01');
VV.Form.VV.FormPartition.getValueObjectValue('Field7');
// Returns: "2025-12-31" ← Crossed into previous year
```

### 3. Control — Switch to São Paulo

```bash
sudo systemsetup -settimezone America/Sao_Paulo
```

Restart Chrome, repeat:

```javascript
VV.Form.SetFieldValue('Field7', '2026-03-15');
VV.Form.VV.FormPartition.getValueObjectValue('Field7');
// Returns: "2026-03-15" ← Correct in São Paulo
```

**Expected**: `"2026-03-15"` stored regardless of timezone.
**Actual**: `"2026-03-14"` stored in Mumbai, correct in São Paulo.

This bug report is backed by a supporting test repository containing Playwright automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## The Problem in Detail

### The Parsing Chain

When a date-only value enters the system (via any input method), it flows through:

```text
Input: "2026-03-15" (or "03/15/2026", or any date string)
    ↓
normalizeCalValue() — date-only branch:
    Strips time portion if present: "2026-03-15"
    Parses via: moment("2026-03-15").toDate()
    → Creates Date object at LOCAL midnight (March 15, 00:00 in the user's timezone)
    ↓
calChange() — converts Date object to ISO:
    .toISOString() → UTC representation of that local midnight
    ↓
getSaveValue() — extracts date portion:
    Substring before "T" → stored as the UTC calendar date
```

### Step-by-Step: Mumbai (UTC+5:30)

```text
1. User enters: "2026-03-15"
2. moment("2026-03-15").toDate()
   Moment.js parses date-only strings as LOCAL midnight:
   → March 15, 00:00 IST
   → Internally: March 14, 18:30 UTC

3. .toISOString()
   → "2026-03-14T18:30:00.000Z"
   Note: March 14, not March 15

4. getSaveValue() extracts date portion:
   → "2026-03-14"

5. STORED: "2026-03-14" ← WRONG (should be "2026-03-15")
```

### Step-by-Step: São Paulo (UTC-3) — Why It's Safe

```text
1. User enters: "2026-03-15"
2. moment("2026-03-15").toDate()
   → March 15, 00:00 BRT
   → Internally: March 15, 03:00 UTC
   Note: Still March 15 in UTC

3. .toISOString()
   → "2026-03-15T03:00:00.000Z"

4. getSaveValue() extracts date portion:
   → "2026-03-15" ← CORRECT
```

São Paulo's local midnight (UTC-3) maps to 03:00 UTC — still the same calendar day.

### Why the Form Still Displays Correctly

The form displays the date using the JavaScript `Date` object in memory (which represents local midnight correctly in the user's timezone), not the stored string. So the user sees March 15 on screen even though `"2026-03-14"` is stored. The discrepancy only becomes visible when the stored value is read by a report, dashboard, SQL query, API call, or the same form loaded by a user in a different timezone.

### Edge Cases

**Year boundary**: A user in Mumbai enters January 1, 2026 → stored as `"2025-12-31"` (crossed into the previous year).

**Month boundary**: April 1 → stored as March 31. March 1 → stored as February 28.

**Date object double-shift (-2 days)**: When a JavaScript `Date` object is passed to `SetFieldValue` instead of a string, the shift doubles. `new Date(2026, 2, 15)` in Mumbai stores `"2026-03-13"` — two days early. This occurs because `normalizeCalValue()` converts the Date to ISO (first local-to-UTC shift), then re-parses the date portion as local midnight (second shift).

**Round-trip compounding**: Each `GetFieldValue → SetFieldValue` cycle loses an additional day. March 14 → March 13 → March 12 — the loss accumulates indefinitely, -1 day per round-trip.

### The V2 Partial Fix

The FormViewer has two versions of its calendar initialization logic. **V1** is the default — it ran during all testing on the demo environment. **V2** is an updated version that activates under specific conditions.

V2 routes date-only parsing through `parseDateString()` instead of inline `moment()` parsing. V2's handling depends on the `ignoreTimezone` flag:

| `ignoreTimezone`       | V2 Behavior                                        | FORM-BUG-7 Status |
| ---------------------- | -------------------------------------------------- | ----------------- |
| `false` (Configs A, E) | `.tz("UTC", true).local()` → correct UTC anchoring | **Fixed**         |
| `true` (Configs B, F)  | `moment(stripped)` → local midnight                | **Still present** |

V2 fixes the bug for Configs A and E but not for Configs B and F. Since V2 is not the default on the demo environment, this partial fix has no confirmed impact.

### Relationship to Other Bugs

| Bug        | Relationship                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FORM-BUG-1 | Conceptual sibling — both stem from local-time reinterpretation, but in different functions for different field types. In V1 they are independent (different code paths). In V2, FORM-BUG-1 feeds into FORM-BUG-7. |
| FORM-BUG-3 | FORM-BUG-3's hardcoded `enableTime=true` accidentally prevents FORM-BUG-7 on the V2 load path. Fixing FORM-BUG-3 before FORM-BUG-7 would introduce wrong dates in V2.                                              |
| FORM-BUG-5 | Independent mechanisms. FORM-BUG-5 affects date+time fields (Config D); FORM-BUG-7 affects date-only fields (A, B, E, F). They never overlap on the same field.                                                    |
| FORM-BUG-4 | FORM-BUG-4 strips Z on save. For date-only fields, `getSaveValue` extracts the date portion (no Z involved). FORM-BUG-7 occurs before `getSaveValue` — the wrong date is already in the ISO string.                |

---

## Verification

Verified on the demo environment at `vvdemo.visualvault.com` across 5 timezones: Mumbai/IST (UTC+5:30), São Paulo/BRT (UTC-3), London/UTC+0, Los Angeles/PDT (UTC-7), and Tokyo/JST (UTC+9). Tested via both manual browser testing and automated Playwright scripts.

All 4 date-only configs (A, B, E, F) confirmed to store -1 day in Mumbai across all input methods (popup, typed, SetFieldValue, preset). All 4 store correctly in São Paulo and London. `useLegacy=true` provides zero protection (E, F fail identically to A, B). `ignoreTimezone=true` provides zero protection (B, F fail identically to A, E). Date+time configs (C, D, G, H) unaffected in all timezones.

Edge cases confirmed: year boundary (Jan 1 → Dec 31), month boundary (Apr 1 → Mar 31, Mar 1 → Feb 28), Date object double-shift (-2 days), round-trip compounding (-1 day per cycle, no limit).

Test coverage across categories: Category 1 (popup) 20/20 — 7P/13F; Category 2 (typed) 16/16 — 11P/5F; Category 5 (preset) 18/18 — 11P/7F; Category 7 (SetFieldValue formats) 38/39 — 29P/9F; Category 9 (round-trip) 20/20 — 9P/11F; Category 12 (edge cases) — year/month/leap boundaries confirmed.

This bug report is backed by a supporting test repository containing Playwright automation scripts, per-test results, and raw test data. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The defective code is shown in [The Parsing Chain](#the-parsing-chain) above. This section adds file locations.

**File**: `main.js` (bundled FormViewer application)
**Function**: `normalizeCalValue()` — line ~102793

The date-only branch (`!this.data.enableTime`) uses `moment(dateStr).toDate()` which parses date-only strings as local midnight. For UTC+ timezones, local midnight is the previous UTC day. The function then returns a `Date` object representing the wrong UTC day, and the downstream chain (`.toISOString()` → `getSaveValue()` date extraction) stores that wrong day.

`normalizeCalValue()` runs on every `SetFieldValue` call and on form load for every calendar field. The fix modifies only the `!enableTime` branch — date+time fields are unaffected.

V1's load path (`initCalendarValueV1()`) uses the same `moment(e).toDate()` pattern for saved data reload, URL parameter input, and preset initial values.

---

## Appendix: Field Configuration Reference

The test form has 8 field configurations referred to by letter throughout this document:

| Config | Field   | enableTime | ignoreTimezone | useLegacy | Description                                  |
| ------ | ------- | ---------- | -------------- | --------- | -------------------------------------------- |
| A      | Field7  | —          | —              | —         | Date-only baseline **(FORM-BUG-7)**          |
| B      | Field10 | —          | ✅             | —         | Date-only + ignoreTZ **(FORM-BUG-7)**        |
| C      | Field6  | ✅         | —              | —         | DateTime UTC (control)                       |
| D      | Field5  | ✅         | ✅             | —         | DateTime + ignoreTZ                          |
| E      | Field12 | —          | —              | ✅        | Legacy date-only **(FORM-BUG-7)**            |
| F      | Field11 | —          | ✅             | ✅        | Legacy date-only + ignoreTZ **(FORM-BUG-7)** |
| G      | Field14 | ✅         | —              | ✅        | Legacy DateTime                              |
| H      | Field13 | ✅         | ✅             | ✅        | Legacy DateTime + ignoreTZ                   |

---

## Workarounds and Fix Recommendations

See [bug-7-fix-recommendations.md](bug-7-fix-recommendations.md) for workarounds, proposed code fix, backwards compatibility analysis, and fix impact assessment.
