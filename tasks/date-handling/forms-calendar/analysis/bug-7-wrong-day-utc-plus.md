# Bug #7: Date-Only Fields Store Wrong Day for UTC+ Timezones

## Classification

| Field                  | Value                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**           | **HIGH** — affects ALL UTC+ users on ALL date-only fields, on every input path                                                                                                             |
| **Evidence**           | `[LIVE]` — Confirmed in IST (UTC+5:30) across Categories 1, 2, 5, 7, 9, 12. -1 day for all string inputs. Date object -2 day `[UNVERIFIED]`. BRT and UTC0 confirmed unaffected (controls). |
| **Component**          | FormViewer → Calendar Component → `normalizeCalValue()`                                                                                                                                    |
| **Code Path**          | V1 (default). V2 partially fixes for `ignoreTimezone=false` fields only.                                                                                                                   |
| **Affected Configs**   | A, B, E, F (`enableTime=false` — all date-only configs)                                                                                                                                    |
| **Affected TZs**       | UTC+ only (IST, JST, AEST, etc.). UTC- (BRT, EST, PST) and UTC+0 unaffected.                                                                                                               |
| **Affected Scenarios** | 1 (Popup), 2 (Typed), 3 (Saved Data — load path), 5 (Preset), 7 (SetFieldValue), 9 (Round-Trip)                                                                                            |
| **Related Bugs**       | Downstream of Bug #1 (Z stripping feeds ambiguous values into the same parsing). Independent of Bug #5 (different configs, different mechanism).                                           |

---

## Summary

`normalizeCalValue()` uses `moment(input).toDate()` to convert date-only strings into JavaScript Date objects. Moment.js parses date-only strings (e.g., `"2026-03-15"`) as **local midnight** — not UTC midnight. For UTC+ users, local midnight is the **previous UTC day** (e.g., IST midnight March 15 = UTC 18:30 March 14). The subsequent `calChange()` call converts this Date object via `toISOString()` and `getSaveValue()` extracts the UTC date portion — storing `"2026-03-14"` instead of `"2026-03-15"`. This affects **every input path** (popup, typed, SetFieldValue, preset, form load) for **every date-only config** (A, B, E, F) and **every UTC+ timezone**. The shift is exactly -1 day, cumulative on round-trips, and invisible to UTC- users — making it undetectable in testing environments west of Greenwich.

---

## Who Is Affected

### Direct Impact

- **All UTC+ end users** entering dates via calendar popup or keyboard on date-only fields — the stored date is the previous day
- **All UTC+ preset dates** — default dates configured in form templates are stored as the previous day on first save
- **All developer scripts** calling `SetFieldValue` on date-only fields while the browser runs in a UTC+ timezone

### Scale

This is the **widest-impact bug** in the calendar field:

- **4 of 8 configs** affected (A, B, E, F — all with `enableTime=false`)
- **~50% of the world's population** lives in UTC+ timezones (IST alone covers 1.4 billion people)
- **Every input method** affected (no safe path for date-only fields in UTC+)
- **`useLegacy=true` does NOT protect** — Configs E and F are equally affected

### Who Is NOT Affected

- **UTC- users** (BRT, EST, CST, PST): Local midnight is still the same UTC calendar day. March 15 00:00 BRT = March 15 03:00 UTC → `getSaveValue` extracts March 15. Correct.
- **UTC+0 users**: Local midnight = UTC midnight. No shift. Correct.
- **DateTime fields** (C, D, G, H, `enableTime=true`): `normalizeCalValue()` skips the date-only branch. Different bugs apply (Bug #5 for Config D) but not Bug #7.

---

## Root Cause

### The Defective Code

**File**: `main.js`
**Function**: `normalizeCalValue()` — line ~102793

```javascript
normalizeCalValue(e) {
    if (!e)
        return null;

    // Step 1: Parse input via moment — date-only strings parsed as LOCAL midnight
    let t = o(e).isValid() ? o(e).toDate() : null;  // o = moment

    // V2 path (not default):
    if (this.calendarValueService.useUpdatedCalendarValueLogic)
        return new Date(this.calendarValueService.parseDateString(
            e, this.data.enableTime, this.data.ignoreTimezone));

    // Date-only branch (enableTime=false):
    if (!this.data.enableTime) {
        let n = e;
        // If input is a Date object, convert to ISO string first
        "[object Date]" === Object.prototype.toString.call(n) && (n = n.toISOString());
        // Strip time portion and re-parse as local midnight
        n && "string" == typeof n && n.indexOf("T") > 0 &&
            (t = o(n.substring(0, n.indexOf("T"))).toDate())
        //          ↑ strips time     ↑ re-parses as LOCAL midnight (BUG)
    }

    return t  // Returns Date object at local midnight
}
```

**Then** the caller chain applies:

```javascript
// calChange() receives the Date object from normalizeCalValue():
calChange(e, t = true, n = false) {
    let i = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    //                                    ↑ Converts local midnight to UTC ISO string
    // IST: March 15 00:00 IST → "2026-03-14T18:30:00.000Z" (previous UTC day!)
    // ...
    let r = this.calendarValueService.getSaveValue(
        this.data.value,
        this.data.enableTime,    // false for date-only
        this.data.ignoreTimezone
    );
    // getSaveValue for date-only: extracts "2026-03-14" from the ISO string
    this.updateFormValueSubject(this.data.name, r, true, t, n);
}
```

### The Parsing Problem — Step by Step

For input `"2026-03-15"` in IST (UTC+5:30):

```
1. normalizeCalValue("2026-03-15")

2. moment("2026-03-15").toDate()
   Moment parses date-only strings as LOCAL midnight:
   → March 15, 2026 00:00:00 IST
   → Which is March 14, 2026 18:30:00 UTC internally

3. Date object returned to calChange()

4. calChange() calls .toISOString():
   → "2026-03-14T18:30:00.000Z"
   Note: March 14, not March 15

5. getSaveValue() with enableTime=false:
   → input.substring(0, input.indexOf("T"))
   → "2026-03-14"

6. STORED: "2026-03-14" ← WRONG (should be "2026-03-15")
```

For the same input in BRT (UTC-3):

```
1. moment("2026-03-15").toDate()
   → March 15, 2026 00:00:00 BRT
   → Which is March 15, 2026 03:00:00 UTC internally

2. .toISOString() → "2026-03-15T03:00:00.000Z"
   Still March 15 in UTC ✓

3. getSaveValue() → "2026-03-15" ✓ CORRECT
```

### Why moment(dateString).toDate() Is Wrong Here

The core issue is that `moment("2026-03-15")` creates a moment at **local midnight** on that date. This is moment.js's documented behavior for date-only strings (without `T` or timezone suffix). For UTC+ timezones, local midnight is the **previous UTC day**.

The correct approach for date-only values is to parse at **UTC midnight**:

```javascript
// WRONG: local midnight (Bug #7)
moment('2026-03-15').toDate(); // IST: March 14 18:30 UTC

// CORRECT: UTC midnight
new Date('2026-03-15T00:00:00.000Z'); // IST: March 15 00:00 UTC
moment.utc('2026-03-15').toDate(); // IST: March 15 00:00 UTC
```

### What Should Happen

`normalizeCalValue()` should parse date-only strings as UTC midnight, ensuring the calendar date is preserved regardless of the user's timezone:

```javascript
// For date-only fields:
// "2026-03-15" → Date object representing March 15 00:00 UTC
// Then getSaveValue extracts "2026-03-15" from toISOString() → correct in every timezone
```

### The Date Object Double-Shift (UNVERIFIED)

Code analysis predicts that `Date` objects undergo **two** local-midnight conversions in the date-only branch:

1. `Date` → `toISOString()` → `"2026-03-14T18:30:00.000Z"` (first shift: IST local midnight → UTC)
2. Strip time → `"2026-03-14"` → `moment("2026-03-14").toDate()` (second shift: re-parsed as IST local midnight for March 14 → `"2026-03-13T18:30:00.000Z"`)

This would produce **-2 days** in IST for `Date` object inputs. This path was **never triggered in live testing** — all tested input methods (popup, typed, SetFieldValue with strings) showed exactly -1 day. The -2 day path may only occur when a raw `Date` object is directly passed to `SetFieldValue()`, which was not tested in isolation.

---

## Expected vs Actual Behavior

### All Input Formats — IST (UTC+5:30) vs BRT (UTC-3)

| Input Format  | Input Value                  | BRT Stored       | IST Stored               | IST Expected   | Shift   | Evidence       |
| ------------- | ---------------------------- | ---------------- | ------------------------ | -------------- | ------- | -------------- |
| ISO date      | `"2026-03-15"`               | `"2026-03-15"` ✓ | `"2026-03-14"` ✗         | `"2026-03-15"` | -1 day  | `[LIVE]`       |
| US date       | `"03/15/2026"`               | `"2026-03-15"` ✓ | `"2026-03-14"` ✗         | `"2026-03-15"` | -1 day  | `[LIVE]`       |
| ISO+time      | `"2026-03-15T00:00:00"`      | `"2026-03-15"` ✓ | `"2026-03-14"` ✗         | `"2026-03-15"` | -1 day  | `[LIVE]`       |
| ISO+Z         | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15"` ✓ | `"2026-03-14"` ✗         | `"2026-03-15"` | -1 day  | `[LIVE]`       |
| `Date` object | `new Date(2026,2,15)`        | `"2026-03-15"` ✓ | predicted `"2026-03-13"` | `"2026-03-15"` | -2 day? | `[UNVERIFIED]` |

**All string-based formats produce identical -1 day shift** — the format is irrelevant because `normalizeCalValue()` strips the time and re-parses the date portion through `moment(dateStr).toDate()` regardless.

### Config Comparison — IST, Input "2026-03-15"

| Config | enableTime | useLegacy | Stored Value            | Correct? | Bug #7? |
| ------ | :--------: | :-------: | ----------------------- | :------: | :-----: |
| A      |   false    |   false   | `"2026-03-14"`          |    ✗     | **YES** |
| B      |   false    |   false   | `"2026-03-14"`          |    ✗     | **YES** |
| C      |    true    |   false   | `"2026-03-15T00:00:00"` |    ✓     |   No    |
| D      |    true    |   false   | `"2026-03-15T00:00:00"` |    ✓     |   No    |
| **E**  |   false    | **true**  | `"2026-03-14"`          |    ✗     | **YES** |
| **F**  |   false    | **true**  | `"2026-03-14"`          |    ✗     | **YES** |
| G      |    true    |   true    | `"2026-03-15T00:00:00"` |    ✓     |   No    |
| H      |    true    |   true    | `"2026-03-15T00:00:00"` |    ✓     |   No    |

**`useLegacy=true` provides zero protection** — Configs E and F fail identically to A and B. The `useLegacy` flag only affects `getCalendarFieldValue()` (GetFieldValue output), not `normalizeCalValue()` (storage path).

### Edge Cases — IST

| Scenario       | Input          | Stored         | Expected       | Boundary Crossed |
| -------------- | -------------- | -------------- | -------------- | :--------------: |
| Year boundary  | `"2026-01-01"` | `"2025-12-31"` | `"2026-01-01"` |     **Year**     |
| Leap day       | `"2026-02-28"` | `"2026-02-27"` | `"2026-02-28"` |        No        |
| Month boundary | `"2026-04-01"` | `"2026-03-31"` | `"2026-04-01"` |    **Month**     |

### Timezone Controls

| TZ   | Offset   | Input `"2026-03-15"` | Stored                   | Correct? | Why                                               |
| ---- | -------- | -------------------- | ------------------------ | :------: | ------------------------------------------------- |
| BRT  | UTC-3    | `"2026-03-15"`       | `"2026-03-15"`           |    ✓     | Local midnight 00:00 BRT = 03:00 UTC → same day   |
| UTC0 | UTC+0    | `"2026-03-15"`       | `"2026-03-15"`           |    ✓     | Local midnight = UTC midnight → no shift          |
| IST  | UTC+5:30 | `"2026-03-15"`       | `"2026-03-14"`           |    ✗     | Local midnight 00:00 IST = 18:30 UTC previous day |
| JST  | UTC+9    | `"2026-03-15"`       | predicted `"2026-03-14"` |    ✗     | Local midnight 00:00 JST = 15:00 UTC previous day |

---

## Steps to Reproduce

### Prerequisites

- Set system timezone to IST (UTC+5:30): `sudo systemsetup -settimezone Asia/Calcutta`
- Restart Chrome (timezone is read at launch)
- Verify: `new Date().toString()` should show `GMT+0530`

### Minimal Reproduction

1. Open a form with a Config A field (`Field7`: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`)
2. In DevTools console:

    ```javascript
    // Set a date
    VV.Form.SetFieldValue('Field7', '2026-03-15');

    // Check what was stored
    VV.Form.VV.FormPartition.getValueObjectValue('Field7');
    // Returns: "2026-03-14" ← WRONG (should be "2026-03-15")
    ```

### Verify Via Popup

3. Click the calendar icon on Field7 and select March 15, 2026
4. Check stored value:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field7');
    // Returns: "2026-03-14" ← Same -1 day shift via popup
    ```

### Demonstrate Round-Trip Compounding

5. Read the value and write it back:
    ```javascript
    // Stored: "2026-03-14" (already -1 day from step 2)
    const val = VV.Form.GetFieldValue('Field7'); // Returns "2026-03-14"
    VV.Form.SetFieldValue('Field7', val);
    VV.Form.VV.FormPartition.getValueObjectValue('Field7');
    // Returns: "2026-03-13" ← Another -1 day (Bug #7 applies again)
    ```

### Demonstrate Year Boundary

6. Set to January 1:
    ```javascript
    VV.Form.SetFieldValue('Field7', '2026-01-01');
    VV.Form.VV.FormPartition.getValueObjectValue('Field7');
    // Returns: "2025-12-31" ← Crossed into previous year
    ```

### Control — Switch to BRT and Repeat

7. Set timezone back to BRT: `sudo systemsetup -settimezone America/Sao_Paulo`, restart Chrome
8. Repeat step 2:
    ```javascript
    VV.Form.SetFieldValue('Field7', '2026-03-15');
    VV.Form.VV.FormPartition.getValueObjectValue('Field7');
    // Returns: "2026-03-15" ← Correct in BRT
    ```

---

## Test Evidence

### Category 1 — Calendar Popup (20/20 complete: 7P, 13F)

| Test ID  | Config | TZ   | Selected | Stored         | Status                          |
| -------- | ------ | ---- | -------- | -------------- | ------------------------------- |
| 1-A-BRT  | A      | BRT  | Mar 15   | `"2026-03-15"` | PASS                            |
| 1-B-BRT  | B      | BRT  | Mar 15   | `"2026-03-15"` | PASS                            |
| 1-A-IST  | A      | IST  | Mar 15   | `"2026-03-14"` | **FAIL** (-1 day)               |
| 1-B-IST  | B      | IST  | Mar 15   | `"2026-03-14"` | **FAIL** (-1 day)               |
| 1-E-IST  | E      | IST  | Mar 15   | `"2026-03-14"` | **FAIL** (legacy, still -1 day) |
| 1-F-IST  | F      | IST  | Mar 15   | `"2026-03-14"` | **FAIL** (legacy, still -1 day) |
| 1-A-UTC0 | A      | UTC0 | Mar 15   | `"2026-03-15"` | PASS                            |

13 of 20 tests fail — all IST date-only configs (A, B, E, F across IST, plus DateTime configs fail for Bug #5, not Bug #7).

### Category 2 — Typed Input (16/16 complete: 11P, 5F)

| Test ID | Config | TZ  | Typed      | Stored         | Status            |
| ------- | ------ | --- | ---------- | -------------- | ----------------- |
| 2-A-BRT | A      | BRT | 03/15/2026 | `"2026-03-15"` | PASS              |
| 2-A-IST | A      | IST | 03/15/2026 | `"2026-03-14"` | **FAIL** (-1 day) |

Typed and popup produce **identical results** — Bug #2 (popup/typed divergence) disproven for non-legacy configs.

### Category 5 — Preset Date (18/18 complete: 11P, 7F)

| Test ID | Config | TZ  | Preset   | Date Object (UTC)            | Stored after save | Status            |
| ------- | ------ | --- | -------- | ---------------------------- | ----------------- | ----------------- |
| 5-A-IST | A      | IST | 3/1/2026 | `"2026-02-28T18:30:00.000Z"` | `"2026-02-28"`    | **FAIL** (-1 day) |
| 5-B-IST | B      | IST | 3/1/2026 | `"2026-02-28T18:30:00.000Z"` | `"2026-02-28"`    | **FAIL** (-1 day) |
| 5-A-BRT | A      | BRT | 3/1/2026 | `"2026-03-01T03:00:00.000Z"` | `"2026-03-01"`    | PASS              |

Preset date March 1 → displays correctly in IST but the internal Date object is Feb 28 UTC → stored as `"2026-02-28"` on first save.

### Category 7 — SetFieldValue Formats (38/39 done: 29P, 9F)

| Test ID          | Config | TZ  | Format   | Input          | Stored         | Status   |
| ---------------- | ------ | --- | -------- | -------------- | -------------- | -------- |
| 7-A-dateOnly-IST | A      | IST | ISO date | `"2026-03-15"` | `"2026-03-14"` | **FAIL** |
| 7-B-dateOnly-IST | B      | IST | ISO date | `"2026-03-15"` | `"2026-03-14"` | **FAIL** |
| 7-E-dateOnly-IST | E      | IST | ISO date | `"2026-03-15"` | `"2026-03-14"` | **FAIL** |
| 7-F-dateOnly-IST | F      | IST | ISO date | `"2026-03-15"` | `"2026-03-14"` | **FAIL** |
| 7-A-dateOnly-BRT | A      | BRT | ISO date | `"2026-03-15"` | `"2026-03-15"` | PASS     |

**Key finding**: `useLegacy=true` (Configs E, F) does NOT protect date-only fields from Bug #7. All 4 date-only configs fail identically in IST.

### Category 9 — Round-Trip GFV (20/20 complete: 9P, 11F)

| Test ID | Config | TZ  | Start                                  | After 1 RT     | Days Lost | Status   |
| ------- | ------ | --- | -------------------------------------- | -------------- | :-------: | -------- |
| 9-A-BRT | A      | BRT | `"2026-03-15"`                         | `"2026-03-15"` |     0     | PASS     |
| 9-B-IST | B      | IST | `"2026-03-15"` → stored `"2026-03-14"` | `"2026-03-13"` |  **-2**   | **FAIL** |

In IST, each `SetFieldValue(GetFieldValue())` cycle loses an additional day: initial -1 (Bug #7 on write), then the read value `"2026-03-14"` is written back → Bug #7 again → stores `"2026-03-13"`. **-1 day per write operation** compounds indefinitely.

### Category 12 — Edge Cases

| Test ID                | Config | TZ  | Input          | Stored         | Boundary         | Status   |
| ---------------------- | ------ | --- | -------------- | -------------- | ---------------- | -------- |
| 12-year-boundary-IST   | A      | IST | `"2026-01-01"` | `"2025-12-31"` | **Year crossed** | **FAIL** |
| 12-leap-day-IST        | A      | IST | `"2026-02-28"` | `"2026-02-27"` | Feb → Feb        | **FAIL** |
| 12-near-midnight-1-IST | A      | IST | `"2026-03-15"` | `"2026-03-14"` | Standard         | **FAIL** |

---

## Impact Analysis

### Data Integrity — Systematic Wrong Dates

This is not a rare edge case — it is a **systematic failure** affecting every date-only field write operation in UTC+ timezones:

- **Every popup selection** stores the previous day
- **Every typed date** stores the previous day
- **Every preset default** stores the previous day (on first save)
- **Every SetFieldValue call** stores the previous day
- The form **displays** the correct date (the display uses the local Date object, not the stored string) — so users **see the right date but the database contains the wrong one**

This means:

- SQL queries filtering by date return wrong results for UTC+ users' records
- Reports show the previous day for dates entered by UTC+ users
- Dashboards display the stored date, which is -1 day from what the user entered
- Cross-system integrations (API reads) return the wrong date

### Round-Trip Compounding

Unlike a static offset, Bug #7 **accumulates**:

- Each write operation applies the -1 day shift independently
- A script that reads a date and writes it back (common in validation, copying, or reformatting logic) loses a day
- After N round-trips, the date has shifted by -N days
- There is no built-in detection or correction

### V2 Partial Fix Scope

V2 (`useUpdatedCalendarValueLogic=true`) routes through `parseDateString()` which has two branches:

|    `ignoreTimezone`    | V2 Behavior                                        |   Bug #7 Status   |
| :--------------------: | -------------------------------------------------- | :---------------: |
| `false` (Configs A, E) | `.tz("UTC", true).local()` → correct UTC anchoring |     **Fixed**     |
| `true` (Configs B, F)  | `moment(stripped)` → local midnight                | **Still present** |

V2 fixes Bug #7 for Configs A and E but **not** for Configs B and F. Since V2 is not the default (V1 is active in all tested environments), this partial fix has no current impact.

### V1 Load Path

`initCalendarValueV1()` uses the same `moment(e).toDate()` pattern for:

- Saved data reload
- URL parameter input
- Preset initial values

This means Bug #7 also affects the **form load path** in V1 — a date saved correctly (e.g., by a BRT user) will be re-parsed as local midnight when loaded by an IST user, potentially shifting the date. `[CODE — confirmed in source, not independently live-tested for reload path]`

### Interaction with Other Bugs

| Bug    | Interaction                                                                                                                                                                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug #1 | Bug #1 strips Z from strings fed into `parseDateString()`. Bug #7 operates in `normalizeCalValue()` which parses date-only strings without Z via `moment()`. Both use local-midnight parsing, but in different functions for different scenarios. Fixing either one independently helps different code paths.     |
| Bug #5 | Independent — Bug #5 affects Config D (DateTime), Bug #7 affects date-only configs (A/B/E/F). They never overlap on the same field. However, in Category 9 round-trips, a Config D field drifts by TZ offset (Bug #5) while a date-only field drifts by -1 day (Bug #7) — different mechanisms, both progressive. |
| Bug #4 | Bug #4 strips Z on save. For date-only fields, `getSaveValue` extracts the date portion (no Z involved). Bug #7 happens before `getSaveValue` — the wrong date is already in the ISO string that `getSaveValue` processes.                                                                                        |

---

## Workarounds

### Workaround #1: Use DateTime Fields Instead of Date-Only

Switch the field configuration to `enableTime=true` (Config C or D). DateTime fields bypass the date-only branch in `normalizeCalValue()` and store the full datetime string correctly.

**Tradeoff**: Users see a time picker they don't need. Config D introduces Bug #5. Config C is the safest DateTime option (format-agnostic, no fake Z on GFV).

### Workaround #2: Compute Dates Server-Side

Use the REST API (`postFormRevision` or `forminstance/`) to write date values instead of client-side `SetFieldValue`. The API bypasses `normalizeCalValue()` entirely and stores the string as-is.

```javascript
// Instead of:
VV.Form.SetFieldValue('dateField', '2026-03-15');

// Use server-side write via vvClient in a scheduled/event script:
vvClient.forms.postFormRevision(null, { Field7: '2026-03-15' }, formId, revisionId);
```

**Tradeoff**: Requires server-side script execution context. Not available in client-side form button scripts.

### Workaround #3: Noon Time Anchor (Limited)

For `SetFieldValue` calls, append a noon time to avoid the midnight boundary:

```javascript
// UNSAFE — stores previous day in UTC+
VV.Form.SetFieldValue('Field7', '2026-03-15');

// ATTEMPTED WORKAROUND — noon avoids midnight shift
VV.Form.SetFieldValue('Field7', '2026-03-15T12:00:00');
```

**CAVEAT — LIMITED EFFECTIVENESS**: For date-only fields (`enableTime=false`), `normalizeCalValue()`'s date-only branch **strips the time** and re-parses the date portion: `"2026-03-15T12:00:00"` → strip to `"2026-03-15"` → `moment("2026-03-15").toDate()` → local midnight again → **same bug**. This workaround only helps if `enableTime=true` (at which point Bug #7 doesn't apply anyway).

**This workaround does not work for date-only fields.**

### Workaround #4: Accept the Offset (For Programmatic Use Only)

If you know the user is in a UTC+ timezone and you're setting a date programmatically, you can pre-shift by +1 day:

```javascript
// User wants March 15, IST browser
VV.Form.SetFieldValue('Field7', '2026-03-16'); // +1 day → stored as "2026-03-15"
```

**CAVEAT — FRAGILE AND DANGEROUS**: This requires knowing the exact timezone offset and breaks for UTC- or UTC+0 users. Not recommended for production code.

### Workaround #5: Avoid Date-Only Fields in UTC+ Deployments

If the deployment exclusively serves UTC+ users and date accuracy is critical, use Config C (DateTime, `ignoreTimezone=false`, `useLegacy=false`) for all date fields. Config C is format-agnostic, has no Bug #5, and stores dates correctly across all timezones.

---

## Proposed Fix

### Before (Current)

```javascript
normalizeCalValue(e) {
    if (!e)
        return null;
    let t = o(e).isValid() ? o(e).toDate() : null;  // o = moment
    if (this.calendarValueService.useUpdatedCalendarValueLogic)
        return new Date(this.calendarValueService.parseDateString(
            e, this.data.enableTime, this.data.ignoreTimezone));
    if (!this.data.enableTime) {
        let n = e;
        "[object Date]" === Object.prototype.toString.call(n) && (n = n.toISOString());
        n && "string" == typeof n && n.indexOf("T") > 0 &&
            (t = o(n.substring(0, n.indexOf("T"))).toDate())
        //      ↑ moment(dateStr).toDate() = LOCAL midnight = WRONG for UTC+
    }
    return t
}
```

### After (Fixed)

```javascript
normalizeCalValue(e) {
    if (!e)
        return null;

    if (this.calendarValueService.useUpdatedCalendarValueLogic)
        return new Date(this.calendarValueService.parseDateString(
            e, this.data.enableTime, this.data.ignoreTimezone));

    if (!this.data.enableTime) {
        // Date-only field: extract date string and parse as UTC midnight
        let n = e;
        if ("[object Date]" === Object.prototype.toString.call(n)) {
            n = n.toISOString();
        }
        if (n && typeof n === "string") {
            // Strip time portion if present
            if (n.indexOf("T") > 0) {
                n = n.substring(0, n.indexOf("T"));
            }
            // Remove any trailing Z
            n = n.replace("Z", "");
            // FIX: Parse as UTC midnight — not local midnight
            return new Date(n + "T00:00:00.000Z");
        }
        return null;
    }

    // DateTime fields: existing behavior
    let t = o(e).isValid() ? o(e).toDate() : null;
    return t;
}
```

### Key Change

**Replace `moment(dateStr).toDate()`** (local midnight) **with `new Date(dateStr + "T00:00:00.000Z")`** (UTC midnight).

This ensures that `"2026-03-15"` always becomes March 15 00:00 UTC — regardless of the user's timezone. When `calChange()` subsequently calls `toISOString()`, it gets `"2026-03-15T00:00:00.000Z"`, and `getSaveValue()` extracts `"2026-03-15"` — correct in every timezone.

### Why `new Date()` With Explicit UTC Instead of `moment.utc()`

- `new Date("2026-03-15T00:00:00.000Z")` is native JavaScript — no library dependency
- The explicit `T00:00:00.000Z` suffix is unambiguous: ISO 8601 with UTC marker
- `moment.utc("2026-03-15").toDate()` would also work but adds unnecessary moment dependency for a one-line fix

---

## Fix Impact Assessment

### What Changes If Fixed

- UTC+ users get correct dates stored for all date-only fields
- BRT and UTC0 users see **no change** (the fix produces the same result for UTC- and UTC0)
- Popup, typed, SetFieldValue, and preset paths all store correct dates
- Round-trip compounding is eliminated (each write stores the correct date)

### Backwards Compatibility Risk

**HIGH** — the most significant compatibility concern of all 7 bugs.

**Existing data problem**: All date-only values stored by UTC+ users are currently -1 day from the intended date. If Bug #7 is fixed:

- **New saves** are correct (`"2026-03-15"` for March 15)
- **Old data** remains wrong (`"2026-03-14"` for what was intended to be March 15)
- There is **no way to identify which records are affected** — the stored value `"2026-03-14"` is indistinguishable from a user who legitimately entered March 14

**Data migration dilemma**:
| Option | Approach | Risk |
|--------|----------|------|
| No migration | Fix code only, old data stays wrong | Users see old dates shift +1 day on display (display correction) |
| Blanket +1 day | Add 1 day to all date-only values from UTC+ users | Corrupts records where March 14 was the intended date |
| Per-user migration | Shift only records saved from known UTC+ IPs/sessions | Requires session timezone logging that doesn't exist |
| Accept mixed state | Old dates wrong, new dates correct | Inconsistency in the same database — queries return mixed results |

**Recommendation**: Fix the code. Do not attempt data migration. The existing wrong data is -1 day but consistently wrong — users have been seeing the "correct" display (local Date object) all along. The fix prevents future corruption without retroactively breaking the display of old records.

**Display impact on old data**: After the fix, old records loaded by the same UTC+ user will go through the fixed `normalizeCalValue()` on the load path → `"2026-03-14"` parsed as UTC midnight → displayed as March 14 (which was always the stored value). No change to existing behavior on reload.

### Regression Risk

**High traffic function**: `normalizeCalValue()` runs on every `SetFieldValue` call for every calendar field — date-only and DateTime. The fix modifies only the `!enableTime` branch, so DateTime fields are unaffected.

**Testing scope required**:

- All 4 date-only configs (A, B, E, F) × 3 timezones (BRT, IST, UTC0) × all input methods
- Verify DateTime configs (C, D, G, H) are completely unaffected
- Verify form load path for saved records (both same-TZ and cross-TZ reload)
- Verify preset date load
- Verify round-trip idempotency: `SetFieldValue(GetFieldValue())` should no longer shift

**Coordinated fix**: Bug #7 in `normalizeCalValue()` and Bug #1 in `parseDateString()` operate on different code paths but share the same root cause (local-midnight parsing). Fixing both simultaneously ensures consistent UTC-anchored behavior across all date entry scenarios.
