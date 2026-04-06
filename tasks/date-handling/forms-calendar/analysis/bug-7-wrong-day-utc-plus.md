# FORM-BUG-7: Date-Only Fields Store the Wrong Day for Users East of London

## What Happens

A user in Mumbai selects **March 15, 2026** in a date-only calendar field. The form displays March 15 correctly. But the database stores **March 14**. Every report, dashboard, SQL query, and API response that reads this field will show March 14 — the previous day.

This happens because the system parses date-only strings as **local midnight**, and for users in timezones east of UTC (UTC+), local midnight falls on the previous day in UTC. Mumbai midnight March 15 = UTC 18:30 March 14. The system then extracts the UTC date portion and stores March 14.

**This is the widest-impact bug in the calendar field investigation:**

- It affects **every date-only field** — regardless of legacy mode or timezone settings
- It affects **every input method** — calendar popup, typed input, preset defaults, form button scripts, form load
- It affects **roughly half the world's population** — everyone in UTC+ timezones (Mumbai, Tokyo, Sydney, Dubai, Singapore, Berlin summer, etc.)
- It is **invisible to the user** — the form always displays the correct date. Only downstream systems (reports, queries, dashboards, API reads) show the wrong one.
- There is **no field-level configuration that prevents it** — neither legacy mode nor the ignore-timezone flag provides any protection

Users in timezones west of UTC (UTC-) — including São Paulo, New York, Chicago, Los Angeles — are **unaffected**. Their local midnight is still the same UTC calendar day, so the date extracts correctly.

---

## Severity: HIGH

Systematic data integrity failure affecting every date-only field write from every UTC+ timezone, on every input path. No user-visible warning. No configuration-level workaround.

---

## Who Is Affected

### Affected (UTC+ timezones)

- **All end users** in UTC+ timezones entering dates via calendar popup, keyboard, or any other method on date-only fields — every date is stored as the previous day
- **All preset date defaults** on date-only fields — the configured default date is stored as the previous day on first save
- **All developer scripts** calling `SetFieldValue` on date-only fields while the browser runs in a UTC+ timezone
- **Reports, dashboards, and API consumers** reading date-only field values — they receive the wrong date

| Timezone              | UTC Offset | March 15 Entry → Stored As |
| --------------------- | ---------- | -------------------------- |
| Mumbai (IST)          | UTC+5:30   | **March 14** (-1 day)      |
| Tokyo (JST)           | UTC+9      | **March 14** (-1 day)      |
| Sydney (AEST)         | UTC+10     | **March 14** (-1 day)      |
| Dubai (GST)           | UTC+4      | **March 14** (-1 day)      |
| Berlin (CEST, summer) | UTC+2      | **March 14** (-1 day)      |

### Not Affected (UTC- and UTC+0 timezones)

| Timezone              | UTC Offset | March 15 Entry → Stored As |
| --------------------- | ---------- | -------------------------- |
| São Paulo (BRT)       | UTC-3      | March 15 (correct)         |
| New York (EST/EDT)    | UTC-5/-4   | March 15 (correct)         |
| Los Angeles (PST/PDT) | UTC-8/-7   | March 15 (correct)         |
| London (GMT, winter)  | UTC+0      | March 15 (correct)         |

UTC- users are safe because their local midnight is still the same UTC calendar day. For example, São Paulo midnight March 15 = UTC 03:00 March 15 — the date portion is still March 15.

---

## Which Fields Are Affected

Calendar fields have three configuration flags:

| Flag             | What It Controls                                                           |
| ---------------- | -------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores time in addition to date (date-only vs date+time) |
| `ignoreTimezone` | Whether timezone conversion is skipped (treat value as display time)       |
| `useLegacy`      | Whether the field uses the older rendering/save code path                  |

FORM-BUG-7 affects **all fields with `enableTime=false`** (all date-only configs). Neither of the other two flags provides any protection:

| Config | enableTime | ignoreTimezone | useLegacy | Affected in UTC+?             |
| :----: | :--------: | :------------: | :-------: | ----------------------------- |
| **A**  |  **off**   |      off       |    off    | **Yes** — stores -1 day       |
| **B**  |  **off**   |     **on**     |    off    | **Yes** — stores -1 day       |
| **E**  |  **off**   |      off       |  **on**   | **Yes** — stores -1 day       |
| **F**  |  **off**   |     **on**     |  **on**   | **Yes** — stores -1 day       |
|   C    |     on     |      off       |    off    | No — DateTime, different path |
|   D    |     on     |       on       |    off    | No — DateTime, different path |
|   G    |     on     |      off       |    on     | No — DateTime, different path |
|   H    |     on     |       on       |    on     | No — DateTime, different path |

**`useLegacy=true` provides zero protection.** Configs E and F fail identically to A and B. The legacy flag only changes how `GetFieldValue()` output is formatted (relevant to [FORM-BUG-5](bug-5-fake-z-drift.md)) — it does not change how values are parsed and stored.

**`ignoreTimezone=true` provides zero protection.** Configs B and F fail identically to A and E.

---

## The Problem in Detail

### The Parsing Chain

When a date-only value enters the system (via any input method), it flows through:

```
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

```
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

```
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

São Paulo's local midnight (UTC-3) maps to 03:00 UTC — still the same calendar day. This is why all UTC- timezones and UTC+0 are unaffected.

### Why the Form Still Displays Correctly

The form displays the date using the JavaScript `Date` object in memory (which represents local midnight correctly in the user's timezone), not the stored string. So the user sees March 15 on screen even though `"2026-03-14"` is stored. The discrepancy only becomes visible when the stored value is read by something else — a report, a dashboard, a SQL query, an API call, or the same form loaded by a user in a different timezone.

### All Input Formats Produce the Same Wrong Result

The input format is irrelevant — `normalizeCalValue()` strips the time portion and re-parses the date through `moment(dateStr).toDate()` regardless:

| Input Format | Input Value                  | Stored in Mumbai (IST)  | Stored in São Paulo (BRT) |
| ------------ | ---------------------------- | ----------------------- | ------------------------- |
| ISO date     | `"2026-03-15"`               | `"2026-03-14"` (-1 day) | `"2026-03-15"` (correct)  |
| US date      | `"03/15/2026"`               | `"2026-03-14"` (-1 day) | `"2026-03-15"` (correct)  |
| ISO + time   | `"2026-03-15T00:00:00"`      | `"2026-03-14"` (-1 day) | `"2026-03-15"` (correct)  |
| ISO + Z      | `"2026-03-15T00:00:00.000Z"` | `"2026-03-14"` (-1 day) | `"2026-03-15"` (correct)  |

---

## Edge Cases

### Year Boundary

A user in Mumbai enters **January 1, 2026**:

- Stored: `"2025-12-31"` — **the date has crossed into the previous year**
- Every downstream system reports December 31, 2025 instead of January 1, 2026

### Month Boundary

- April 1 → stored as March 31 (month boundary)
- March 1 → stored as February 28 (month boundary)

### Date Object Double-Shift (-2 Days)

When a JavaScript `Date` object is passed to `SetFieldValue` instead of a string, the shift doubles:

```
Input: new Date(2026, 2, 15)  // March 15, 00:00 IST (local midnight)

Step 1: Date → toISOString() → "2026-03-14T18:30:00.000Z" (first shift: -1 day)
Step 2: Strip time → "2026-03-14"
Step 3: moment("2026-03-14").toDate() → March 14, 00:00 IST = March 13, 18:30 UTC (second shift)
Step 4: getSaveValue → "2026-03-13"

STORED: "2026-03-13" — TWO days early
```

This occurs because `normalizeCalValue()` converts Date objects to ISO strings (first local-to-UTC shift), then re-parses the date portion as local midnight (second shift). Confirmed live: `new Date(2026, 2, 15)` in Mumbai stores `"2026-03-13"`.

### Round-Trip Compounding

Each `GetFieldValue → SetFieldValue` cycle loses an additional day:

| Cycle | Stored Value (Mumbai)                         |
| :---: | --------------------------------------------- |
|   0   | `"2026-03-14"` (already -1 day from input)    |
|   1   | `"2026-03-13"` (-2 days from original intent) |
|   2   | `"2026-03-12"` (-3 days)                      |
|   3   | `"2026-03-11"` (-4 days)                      |

**-1 day per round-trip. No limit. Accumulates indefinitely.** Each write operation passes the stored date back through `normalizeCalValue()`, which applies the local-midnight shift again.

---

## Steps to Reproduce

### Prerequisites

- Set system timezone to Mumbai (UTC+5:30): `sudo systemsetup -settimezone Asia/Calcutta`
- Restart Chrome (timezone is read at launch)
- Verify: `new Date().toString()` should show `GMT+0530`

### 1. Demonstrate the -1 Day Shift

```javascript
VV.Form.SetFieldValue('Field7', '2026-03-15');
VV.Form.VV.FormPartition.getValueObjectValue('Field7');
// Returns: "2026-03-14" ← WRONG (should be "2026-03-15")
```

### 2. Verify Via Calendar Popup

Click the calendar icon on Field7 (date-only, Config A) and select March 15, 2026:

```javascript
VV.Form.VV.FormPartition.getValueObjectValue('Field7');
// Returns: "2026-03-14" ← Same -1 day shift via popup
```

### 3. Demonstrate Year Boundary

```javascript
VV.Form.SetFieldValue('Field7', '2026-01-01');
VV.Form.VV.FormPartition.getValueObjectValue('Field7');
// Returns: "2025-12-31" ← Crossed into previous year
```

### 4. Demonstrate Round-Trip Compounding

```javascript
const val = VV.Form.GetFieldValue('Field7'); // "2026-03-14"
VV.Form.SetFieldValue('Field7', val);
VV.Form.VV.FormPartition.getValueObjectValue('Field7');
// Returns: "2026-03-13" ← Another -1 day
```

### 5. Control — Switch to São Paulo

```bash
sudo systemsetup -settimezone America/Sao_Paulo
```

Restart Chrome, repeat step 1:

```javascript
VV.Form.SetFieldValue('Field7', '2026-03-15');
VV.Form.VV.FormPartition.getValueObjectValue('Field7');
// Returns: "2026-03-15" ← Correct in São Paulo
```

---

## Workarounds

### 1. Use Date+Time Fields Instead of Date-Only

Switch the field configuration to `enableTime=true` (Config C or D). Date+time fields bypass the date-only branch in `normalizeCalValue()` and store the full datetime string correctly.

**Tradeoff**: Users see a time picker they don't need. Config D introduces [FORM-BUG-5](bug-5-fake-z-drift.md) (progressive drift on GetFieldValue round-trips). Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) is the safest date+time option — format-agnostic, no fake Z.

### 2. Compute Dates Server-Side

Use the REST API (`postFormRevision` or `forminstance/`) to write date values instead of client-side `SetFieldValue`. The API bypasses `normalizeCalValue()` entirely and stores the string as-is.

```javascript
// Instead of (client-side — triggers FORM-BUG-7):
VV.Form.SetFieldValue('dateField', '2026-03-15');

// Use server-side write via vvClient:
vvClient.forms.postFormRevision(null, { Field7: '2026-03-15' }, formId, revisionId);
```

**Tradeoff**: Requires server-side script execution context. Not available in client-side form button scripts.

### 3. Noon Time Anchor — DOES NOT WORK for Date-Only Fields

Appending a noon time to avoid the midnight boundary:

```javascript
VV.Form.SetFieldValue('Field7', '2026-03-15T12:00:00');
```

**This does not work.** For date-only fields (`enableTime=false`), `normalizeCalValue()` strips the time portion and re-parses the date: `"2026-03-15T12:00:00"` → strip to `"2026-03-15"` → `moment("2026-03-15").toDate()` → local midnight again → same bug.

### 4. Pre-Shift by +1 Day — Fragile, Not Recommended

```javascript
// Mumbai user wants March 15:
VV.Form.SetFieldValue('Field7', '2026-03-16'); // +1 day → stored as "2026-03-15"
```

Requires knowing the user's timezone. Breaks for UTC- and UTC+0 users. Not suitable for production code.

### 5. Avoid Date-Only Fields in UTC+ Deployments

If the deployment serves UTC+ users and date accuracy is critical, use Config C for all date fields. Config C is the safest configuration — no FORM-BUG-5, no FORM-BUG-7, correct across all timezones.

---

## Test Evidence

Testing conducted across Mumbai/IST (UTC+5:30), São Paulo/BRT (UTC-3), London/UTC+0, Los Angeles/PDT (UTC-7), and Tokyo/JST (UTC+9) using both manual browser testing and automated Playwright scripts.

### Category 1 — Calendar Popup (20/20 complete: 7 PASS, 13 FAIL)

| Test     | Config | TZ    | Selected | Stored         | Status                          |
| -------- | ------ | ----- | -------- | -------------- | ------------------------------- |
| 1-A-BRT  | A      | BRT   | Mar 15   | `"2026-03-15"` | PASS                            |
| 1-B-BRT  | B      | BRT   | Mar 15   | `"2026-03-15"` | PASS                            |
| 1-A-IST  | A      | IST   | Mar 15   | `"2026-03-14"` | **FAIL** (-1 day)               |
| 1-B-IST  | B      | IST   | Mar 15   | `"2026-03-14"` | **FAIL** (-1 day)               |
| 1-E-IST  | E      | IST   | Mar 15   | `"2026-03-14"` | **FAIL** (legacy, still -1 day) |
| 1-F-IST  | F      | IST   | Mar 15   | `"2026-03-14"` | **FAIL** (legacy, still -1 day) |
| 1-A-UTC0 | A      | UTC+0 | Mar 15   | `"2026-03-15"` | PASS                            |

### Category 2 — Typed Input (16/16 complete: 11 PASS, 5 FAIL)

Typed and popup produce identical results — [FORM-BUG-2](bug-2-inconsistent-handlers.md) (popup/typed divergence) is not present for non-legacy configs.

| Test    | Config | TZ  | Typed      | Stored         | Status            |
| ------- | ------ | --- | ---------- | -------------- | ----------------- |
| 2-A-BRT | A      | BRT | 03/15/2026 | `"2026-03-15"` | PASS              |
| 2-A-IST | A      | IST | 03/15/2026 | `"2026-03-14"` | **FAIL** (-1 day) |

### Category 5 — Preset Date (18/18 complete: 11 PASS, 7 FAIL)

| Test    | Config | TZ  | Preset   | Stored After Save | Status            |
| ------- | ------ | --- | -------- | ----------------- | ----------------- |
| 5-A-IST | A      | IST | 3/1/2026 | `"2026-02-28"`    | **FAIL** (-1 day) |
| 5-B-IST | B      | IST | 3/1/2026 | `"2026-02-28"`    | **FAIL** (-1 day) |
| 5-A-BRT | A      | BRT | 3/1/2026 | `"2026-03-01"`    | PASS              |

Preset date March 1 in Mumbai → stored as February 28 (month boundary crossed on first save).

### Category 7 — SetFieldValue Formats (38/39 done: 29 PASS, 9 FAIL)

| Test             | Config | TZ  | Input          | Stored         | Status   |
| ---------------- | ------ | --- | -------------- | -------------- | -------- |
| 7-A-dateOnly-IST | A      | IST | `"2026-03-15"` | `"2026-03-14"` | **FAIL** |
| 7-B-dateOnly-IST | B      | IST | `"2026-03-15"` | `"2026-03-14"` | **FAIL** |
| 7-E-dateOnly-IST | E      | IST | `"2026-03-15"` | `"2026-03-14"` | **FAIL** |
| 7-F-dateOnly-IST | F      | IST | `"2026-03-15"` | `"2026-03-14"` | **FAIL** |
| 7-A-dateOnly-BRT | A      | BRT | `"2026-03-15"` | `"2026-03-15"` | PASS     |

All 4 date-only configs (A, B, E, F) fail identically in Mumbai — `useLegacy=true` provides zero protection.

### Category 9 — Round-Trip (20/20 complete: 9 PASS, 11 FAIL)

| Test    | Config | TZ  | Start                                  | After 1 Round-Trip | Status                           |
| ------- | ------ | --- | -------------------------------------- | ------------------ | -------------------------------- |
| 9-A-BRT | A      | BRT | `"2026-03-15"`                         | `"2026-03-15"`     | PASS                             |
| 9-B-IST | B      | IST | `"2026-03-15"` → stored `"2026-03-14"` | `"2026-03-13"`     | **FAIL** (-2 days from original) |

In Mumbai, each `SetFieldValue(GetFieldValue())` cycle loses an additional day.

### Category 12 — Edge Cases

| Test                   | Config | TZ  | Input          | Stored         | Boundary Crossed | Status   |
| ---------------------- | ------ | --- | -------------- | -------------- | ---------------- | -------- |
| 12-year-boundary-IST   | A      | IST | `"2026-01-01"` | `"2025-12-31"` | **Year**         | **FAIL** |
| 12-leap-day-IST        | A      | IST | `"2026-02-28"` | `"2026-02-27"` | Feb → Feb        | **FAIL** |
| 12-near-midnight-1-IST | A      | IST | `"2026-03-15"` | `"2026-03-14"` | Standard         | **FAIL** |

### Independent Verification `[PLAYWRIGHT AUDIT 2026-04-06]`

All findings independently verified through automated Playwright testing:

- **Mumbai date-only shift**: All 4 date-only configs (A, B, E, F) store March 14 instead of March 15
- **São Paulo control**: All 4 date-only configs store March 15 correctly
- **Date+time configs unaffected**: All 4 date+time configs (C, D, G, H) store correct values in Mumbai
- **`useLegacy` no protection**: E, F shift identically to A, B
- **`ignoreTimezone` no protection**: B, F shift identically to A, E
- **Date object double-shift**: `new Date(2026, 2, 15)` in Mumbai → stored `"2026-03-13"` (-2 days)
- **Round-trip compounding**: March 14 → March 13 → March 12 → March 11 (-1 day/trip, no limit)
- **Year boundary**: Jan 1 2026 → Dec 31 2025; Apr 1 → Mar 31; Mar 1 → Feb 28

---

## Technical Root Cause

### The Defective Function

**File**: `main.js` (bundled FormViewer application)
**Function**: `normalizeCalValue()` — line ~102793

This function converts input values into JavaScript Date objects. It is called on every `SetFieldValue` call and on form load for every calendar field.

```javascript
normalizeCalValue(e) {
    if (!e)
        return null;

    // Initial parse — date-only strings become LOCAL midnight
    let t = moment(e).isValid() ? moment(e).toDate() : null;

    // V2 path (not the default):
    if (this.calendarValueService.useUpdatedCalendarValueLogic)
        return new Date(this.calendarValueService.parseDateString(
            e, this.data.enableTime, this.data.ignoreTimezone));

    // Date-only branch (enableTime=false):
    if (!this.data.enableTime) {
        let n = e;
        // If input is a Date object, convert to ISO string first
        if ("[object Date]" === Object.prototype.toString.call(n))
            n = n.toISOString();
        // Strip time portion and re-parse as local midnight
        if (n && typeof n === "string" && n.indexOf("T") > 0)
            t = moment(n.substring(0, n.indexOf("T"))).toDate();
        //     ↑ strips time           ↑ re-parses as LOCAL midnight (THE BUG)
    }

    return t;  // Returns Date object at local midnight
}
```

### Why `moment(dateString).toDate()` Is Wrong Here

The moment.js library parses date-only strings (without `T` or timezone suffix) as **local midnight** — this is documented behavior. For UTC+ timezones, local midnight is the **previous UTC day**:

```javascript
// In Mumbai (UTC+5:30):
moment('2026-03-15').toDate();
// → March 15, 00:00 IST = March 14, 18:30 UTC

// The correct approach — UTC midnight:
new Date('2026-03-15T00:00:00.000Z');
// → March 15, 00:00 UTC = March 15, 05:30 IST
```

### The V2 Partial Fix

The V2 code path routes through `parseDateString()` instead of inline moment parsing. V2's handling depends on the `ignoreTimezone` flag:

| `ignoreTimezone` | V2 Behavior                                        | FORM-BUG-7 Status |
| :--------------: | -------------------------------------------------- | :---------------: |
|  `false` (A, E)  | `.tz("UTC", true).local()` → correct UTC anchoring |     **Fixed**     |
|  `true` (B, F)   | `moment(stripped)` → local midnight                | **Still present** |

V2 fixes the bug for Configs A and E but **not** for Configs B and F. Since V2 is not the default (V1 is active in all tested environments), this partial fix has no current impact.

### The V1 Load Path Also Has This Bug

`initCalendarValueV1()` uses the same `moment(e).toDate()` pattern for saved data reload, URL parameter input, and preset initial values. This means a date saved correctly by a São Paulo user will be re-parsed as local midnight when loaded by a Mumbai user — potentially shifting the displayed date by -1 day on the load path as well.

### Interaction with Other Bugs

| Bug        | Relationship                                                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FORM-BUG-1 | Conceptual sibling — both stem from local-time reinterpretation, but in different functions for different scenarios. Fixing either one independently helps different code paths.                     |
| FORM-BUG-3 | FORM-BUG-3's hardcoded `enableTime=true` accidentally prevents FORM-BUG-7 on V2 load path. Fixing FORM-BUG-3 before FORM-BUG-7 would introduce wrong dates in V2.                                    |
| FORM-BUG-5 | Independent mechanisms. FORM-BUG-5 affects date+time fields (Config D); FORM-BUG-7 affects date-only fields (A/B/E/F). They never overlap on the same field.                                         |
| FORM-BUG-4 | FORM-BUG-4 strips Z on save. For date-only fields, `getSaveValue` extracts the date portion (no Z involved). FORM-BUG-7 happens before `getSaveValue` — the wrong date is already in the ISO string. |

---

## Proposed Fix

### Before (Current)

```javascript
// Date-only branch in normalizeCalValue():
if (n && typeof n === 'string' && n.indexOf('T') > 0) t = moment(n.substring(0, n.indexOf('T'))).toDate();
//      ↑ LOCAL midnight — wrong for UTC+
```

### After (Fixed)

```javascript
if (!this.data.enableTime) {
    let n = e;
    if ('[object Date]' === Object.prototype.toString.call(n)) n = n.toISOString();
    if (n && typeof n === 'string') {
        if (n.indexOf('T') > 0) n = n.substring(0, n.indexOf('T'));
        n = n.replace('Z', '');
        // FIX: Parse as UTC midnight — not local midnight
        return new Date(n + 'T00:00:00.000Z');
    }
    return null;
}
```

### Key Change

**Replace `moment(dateStr).toDate()`** (local midnight) **with `new Date(dateStr + "T00:00:00.000Z")`** (UTC midnight).

This ensures that `"2026-03-15"` always becomes March 15 00:00 UTC — regardless of the user's timezone. When `calChange()` subsequently calls `.toISOString()`, it gets `"2026-03-15T00:00:00.000Z"`, and `getSaveValue()` extracts `"2026-03-15"` — correct in every timezone.

**Why native `new Date()` instead of `moment.utc()`**: `new Date("2026-03-15T00:00:00.000Z")` is native JavaScript with no library dependency. The explicit `T00:00:00.000Z` suffix is unambiguous ISO 8601. `moment.utc("2026-03-15").toDate()` would also work but adds unnecessary moment dependency for a one-line fix.

---

## Fix Impact Assessment

### What Changes If Fixed

- UTC+ users get correct dates stored for all date-only fields
- São Paulo and London users see **no change** (the fix produces the same result for UTC- and UTC+0)
- Popup, typed, SetFieldValue, and preset paths all store correct dates
- Round-trip compounding is eliminated
- Year and month boundary crossing eliminated

### Backwards Compatibility Risk: HIGH

**This is the most significant compatibility concern across all 7 bugs.**

All date-only values stored by UTC+ users are currently -1 day from the intended date. If FORM-BUG-7 is fixed:

- **New saves** are correct (`"2026-03-15"` for March 15)
- **Old data** remains wrong (`"2026-03-14"` for what was intended to be March 15)
- **There is no way to identify which records are affected** — the stored value `"2026-03-14"` is indistinguishable from a user who legitimately entered March 14

### Data Migration Dilemma

| Option             | Approach                                          | Risk                                                             |
| ------------------ | ------------------------------------------------- | ---------------------------------------------------------------- |
| No migration       | Fix code only, old data stays as-is               | Old -1 day values persist; display unchanged on reload           |
| Blanket +1 day     | Add 1 day to all date-only values from UTC+ users | Corrupts records where the stored date was intentionally entered |
| Per-user migration | Shift only records from known UTC+ sessions       | Requires session timezone logging that doesn't exist             |
| Accept mixed state | Old dates -1 day, new dates correct               | Inconsistency in the same database                               |

**Recommendation**: Fix the code. Do not attempt data migration. The existing -1 day data is consistently wrong — users have been seeing the "correct" display (local Date object) all along. The fix prevents future corruption. On reload after the fix, old records go through the fixed `normalizeCalValue()` → `"2026-03-14"` parsed as UTC midnight → displayed as March 14 (which was always the stored value). No change to existing display behavior.

### Regression Risk

**High-traffic function**: `normalizeCalValue()` runs on every `SetFieldValue` call for every calendar field — date-only and date+time. The fix modifies only the `!enableTime` branch, so date+time fields are completely unaffected.

**Testing scope required:**

- All 4 date-only configs (A, B, E, F) × 3 timezones (São Paulo, Mumbai, London) × all input methods
- Verify date+time configs (C, D, G, H) are completely unaffected
- Verify form load path for saved records (same-TZ and cross-TZ reload)
- Verify preset date load
- Verify round-trip idempotency: `SetFieldValue(GetFieldValue())` should no longer shift

**Coordinated fix**: FORM-BUG-7 (`normalizeCalValue`) and [FORM-BUG-1](bug-1-timezone-stripping.md) (`parseDateString`) operate on different code paths but share the same root cause (local-midnight parsing). Fixing both simultaneously ensures consistent UTC-anchored behavior across all date entry scenarios. [FORM-BUG-3](bug-3-hardcoded-params.md) must also be fixed simultaneously — its hardcoded `enableTime=true` currently masks FORM-BUG-7 on the V2 load path.

### Artifacts Created During Investigation

- `testing/scripts/audit-bug7-wrong-day.js` — 5-test comprehensive audit (Mumbai + São Paulo)
