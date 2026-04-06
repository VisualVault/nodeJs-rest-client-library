# Bug #3: Hardcoded Parameters in initCalendarValueV2()

## Classification

| Field                  | Value                                                                                                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**           | Medium                                                                                                                                                                                                                                              |
| **Evidence**           | `[CODE]` + `[PLAYWRIGHT AUDIT 2026-04-06]` — Confirmed in source code + functional verification via parseDateString direct invocation. V2 code path only; V1 has equivalent hardcoding. Not end-to-end tested (V2 cannot be activated on test env). |
| **Component**          | FormViewer → Calendar Component → `initCalendarValueV2()`                                                                                                                                                                                           |
| **Code Path**          | V2 only (`useUpdatedCalendarValueLogic=true`) — but V1 has analogous issues                                                                                                                                                                         |
| **Affected Configs**   | All configs — any field where the hardcoded value differs from the actual setting                                                                                                                                                                   |
| **Affected TZs**       | All                                                                                                                                                                                                                                                 |
| **Affected Scenarios** | 3 (Saved Data — hardcodes `enableTime=true`), 5 (Preset Date — hardcodes both params)                                                                                                                                                               |
| **Related Bugs**       | Amplifies Bug #1 by feeding wrong parameters to `parseDateString()`                                                                                                                                                                                 |

---

## Summary

`initCalendarValueV2()` calls `parseDateString()` with **hardcoded** parameter values instead of using the actual field configuration (`this.data.enableTime`, `this.data.ignoreTimezone`). When loading saved data, it hardcodes `enableTime=true` regardless of whether the field is date-only. When loading preset dates, it hardcodes both `enableTime=false` and `ignoreTimezone=true`. This means the parsing behavior is detached from the field's actual configuration, producing incorrect results when the hardcoded values don't match reality.

---

## Who Is Affected

- **V2 code path users only**: Forms opened with `?ObjectID=` parameter, non-empty `modelId`, or server flag `useUpdatedCalendarValueLogic=true`
- Standard standalone forms use V1 (default) and bypass this specific bug
- However, V1 has analogous hardcoding in `initCalendarValueV1()` — the parameters are implicit rather than explicit

---

## Root Cause

### The Defective Code

**File**: `main.js`
**Function**: `initCalendarValueV2()` — line ~102886

```javascript
initCalendarValueV2() {
    let isNewValue = false;

    if (this.data.enableQListener && this.data.text) {
        // URL Query String — uses actual field settings ✓
        this.data.value = this.calendarValueService.parseDateString(
            this.data.text,
            this.data.enableTime,      // ✓ Correct — uses actual setting
            this.data.ignoreTimezone   // ✓ Correct — uses actual setting
        );
        // ...
    } else if (this.data.value) {
        // Server/Database — HARDCODED ✗
        this.data.value = this.calendarValueService.parseDateString(
            this.data.value,
            true,                      // ✗ HARDCODED enableTime=true (ignores field type)
            this.data.ignoreTimezone   // ✓ Uses actual setting
        );
        // ...
    } else if (this.data.enableInitialValue && this.docInfo.isFormTemplate) {
        switch (this.data.initialValueMode) {
            case CalendarInitialValueMode.CurrentDate:
                this.value = new Date();  // ✓ No parsing needed
                break;
            case CalendarInitialValueMode.PresetDate:
                this.data.value = this.calendarValueService.parseDateString(
                    this.data.initialDate,
                    false,             // ✗ HARDCODED enableTime=false
                    true               // ✗ HARDCODED ignoreTimezone=true
                );
                break;
        }
        isNewValue = true;
    }
    // ...
}
```

### Why This Is Wrong

The `enableTime` and `ignoreTimezone` parameters in `parseDateString()` control how the date is parsed:

- `enableTime=true` → preserves time component
- `enableTime=false` → applies `.startOf("day")` (collapses to midnight)
- `ignoreTimezone=true` → parses as local time
- `ignoreTimezone=false` → attempts UTC-to-local conversion

When these are hardcoded to values that don't match the field definition:

**Saved data path** (hardcodes `enableTime=true`):

- A **date-only field** (actual `enableTime=false`) loading saved data is processed as DateTime
- The `.startOf("day")` step is skipped — the time component from the DB value is preserved instead of being collapsed to midnight
- This can cause different display behavior than what `getSaveValue()` produced on save

**Preset date path** (hardcodes `enableTime=false`, `ignoreTimezone=true`):

- A **DateTime field** (actual `enableTime=true`) with a preset is processed as date-only — time component is lost
- A field with `ignoreTimezone=false` is processed as `ignoreTimezone=true` — the UTC recovery logic in parseDateString is skipped

### What Should Happen

All calls to `parseDateString()` should use the field's actual settings:

```javascript
this.calendarValueService.parseDateString(
    this.data.value,
    this.data.enableTime, // ← Use actual field setting
    this.data.ignoreTimezone // ← Use actual field setting
);
```

---

## Expected vs Actual Behavior

**Date-only field (Config A, enableTime=false), saved value `"2026-03-15"`, loaded via V2:**

| Parameter        | Expected | Actual (hardcoded) | Effect                                                            |
| ---------------- | -------- | ------------------ | ----------------------------------------------------------------- |
| `enableTime`     | `false`  | `true`             | `.startOf("day")` is NOT applied — time from DB parsing preserved |
| `ignoreTimezone` | `false`  | `false` (correct)  | N/A                                                               |

**DateTime+ignoreTimezone field (Config D), preset value, loaded via V2:**

| Parameter        | Expected | Actual (hardcoded) | Effect                                             |
| ---------------- | -------- | ------------------ | -------------------------------------------------- |
| `enableTime`     | `true`   | `false`            | `.startOf("day")` IS applied — preset time is lost |
| `ignoreTimezone` | `true`   | `true` (correct)   | N/A                                                |

**DateTime field (Config C, ignoreTimezone=false), preset value, loaded via V2:**

| Parameter        | Expected | Actual (hardcoded) | Effect                                             |
| ---------------- | -------- | ------------------ | -------------------------------------------------- |
| `enableTime`     | `true`   | `false`            | `.startOf("day")` IS applied — preset time is lost |
| `ignoreTimezone` | `false`  | `true`             | UTC recovery logic skipped — value parsed as local |

---

## Steps to Reproduce

1. Configure a **date-only field** (Config A) with `enableTime=false`
2. Save a form with a date value
3. Reopen the form in a context where V2 is active (`?ObjectID=` URL param or `modelId` present)
4. The saved date is parsed with `enableTime=true` (hardcoded) — time component is not collapsed to midnight
5. Observe that the displayed value may include unexpected time information or behave differently than when saved

**Note**: V2 is not active in standard standalone forms. This bug requires Object View or server flag context to reproduce.

---

## Test Evidence

- **Code analysis**: Hardcoded parameters confirmed at lines ~102886–102960
- **No live test coverage**: V2 was never activated during testing (all tests used standard standalone form → V1)
- The `useUpdatedCalendarValueLogic` flag was confirmed `false` via live CalendarValueService scan (2026-03-30)

### Audit Status `[PLAYWRIGHT AUDIT 2026-04-06]`

**Three-pronged verification**: source code reading, parseDateString functional testing, and V2 activation probe.

**1. Source Code Verification — CONFIRMED**

Hardcoded parameters verified at exact line numbers in main.js:

- Line 102939: `!0` (true) hardcoded for `enableTime` in saved data path
- Lines 102947-102949: `!1` (false) hardcoded for `enableTime`, `!0` (true) hardcoded for `ignoreTimezone` in preset path
- Contrast: URL query string path (lines 102934-102935) **correctly** uses actual settings `this.data.enableTime` / `this.data.ignoreTimezone`

**2. parseDateString Functional Test — BUG CONFIRMED**

Direct invocation in browser with hardcoded vs correct parameters:

| Input                        | Scenario                   | V2 Hardcoded Params                 | Correct Params                   | V2 Result                          | Correct Result               | Match  |
| ---------------------------- | -------------------------- | ----------------------------------- | -------------------------------- | ---------------------------------- | ---------------------------- | ------ |
| `"2026-03-15"`               | Date-only saved (Config A) | enableTime=true, ignoreTZ=false     | enableTime=false, ignoreTZ=false | `"2026-03-15T00:00:00.000Z"`       | `"2026-03-14T03:00:00.000Z"` | **NO** |
| `"2026-03-15T00:00:00"`      | DateTime preset (Config C) | enableTime=false, ignoreTZ=true     | enableTime=true, ignoreTZ=false  | `"2026-03-15T03:00:00.000Z"`       | `"2026-03-15T00:00:00.000Z"` | **NO** |
| `"2026-03-15T03:00:00.000Z"` | Legacy-stored UTC          | enableTime=true                     | enableTime=false                 | `"2026-03-15T03:00:00.000Z"`       | `"2026-03-15T03:00:00.000Z"` | YES    |
| `"2026-03-15T00:00:00"`      | Config D saved vs preset   | enableTime=true/false,ignoreTZ=true | —                                | Both: `"2026-03-15T03:00:00.000Z"` | —                            | YES    |

Key finding: hardcoded parameters produce materially different results for date-only fields loading saved data and DateTime presets with ignoreTZ=false.

**3. V2 Activation Probe — V2 COULD NOT BE ACTIVATED**

| Method                                                                     | Result                           |
| -------------------------------------------------------------------------- | -------------------------------- |
| `?ObjectID={fakeGUID}` appended to URL                                     | V2 flag remains `false`          |
| `?ObjectID=` as first URL param                                            | V2 flag remains `false`          |
| Manual `calendarValueService.useUpdatedCalendarValueLogic = true` + reload | Flag resets to `false` on reload |

Conclusion: V2 cannot be activated on vvdemo test environment. Bug #3 is **code-confirmed + functionally verified, NOT end-to-end tested**.

**4. Category 3 V1 Regression — 10P/8F (matches matrix)**

BRT-chromium (12 tests: 6P/6F):

| Test        | Status | Bug                                        |
| ----------- | ------ | ------------------------------------------ |
| 3-A-BRT-BRT | PASS   | —                                          |
| 3-B-BRT-BRT | PASS   | —                                          |
| 3-E-BRT-BRT | PASS   | —                                          |
| 3-F-BRT-BRT | PASS   | —                                          |
| 3-G-BRT-BRT | PASS   | —                                          |
| 3-H-BRT-BRT | PASS   | —                                          |
| 3-A-IST-BRT | FAIL   | Bug #7                                     |
| 3-B-IST-BRT | FAIL   | Bug #7                                     |
| 3-C-BRT-BRT | FAIL   | Bug #4                                     |
| 3-C-IST-BRT | FAIL   | Bug #1+#4 (RangeError: Invalid time value) |
| 3-D-BRT-BRT | FAIL   | Bug #5                                     |
| 3-D-IST-BRT | FAIL   | Bug #5                                     |

IST-chromium (6 tests: 4P/2F):

| Test        | Status | Bug       |
| ----------- | ------ | --------- |
| 3-A-BRT-IST | PASS   | —         |
| 3-B-BRT-IST | PASS   | —         |
| 3-E-BRT-IST | PASS   | —         |
| 3-H-BRT-IST | PASS   | —         |
| 3-C-BRT-IST | FAIL   | Bug #1+#4 |
| 3-D-BRT-IST | FAIL   | Bug #5    |

**Note**: date-handling CLAUDE.md claims "Cat 3 fully complete 18/18 (14P, 4F)" — this is incorrect. The correct count is **10P/8F**.

### DB Context `[PLAYWRIGHT AUDIT 2026-04-06]`

**Schema**: All fields are SQL Server `datetime` — no `date` column type. `parseDateString()` output passes through `getSaveValue()` to become a `datetime` value in the DB.

**V2 Bug #3 / Bug #7 Interaction — Critical Irony**: The hardcoded `enableTime=true` on V2 saved data path **accidentally prevents Bug #7** for date-only fields in UTC+:

| parseDateString("2026-03-15", ...) | enableTime         | Result                       | Bug #7?                             |
| ---------------------------------- | ------------------ | ---------------------------- | ----------------------------------- |
| V2 hardcoded                       | `true` (hardcoded) | `"2026-03-15T00:00:00.000Z"` | **No** — preserves correct date     |
| V2 "fixed"                         | `false` (actual)   | `"2026-03-14T03:00:00.000Z"` | **Yes** — shifts to March 14 in BRT |

**Fixing Bug #3 without fixing Bug #7 first would INTRODUCE Bug #7 on the V2 load path.**

**Cat 3 DB Evidence** — Cross-referencing saved records with actual DB values:

| Record               | Field   | DB Value                  | Expected                  | Bug                              |
| -------------------- | ------- | ------------------------- | ------------------------- | -------------------------------- |
| cat3-A-BRT (000080)  | Field7  | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (BRT same-TZ)               |
| cat3-AD-IST (000084) | Field7  | `2026-03-14 00:00:00.000` | `2026-03-15 00:00:00.000` | **#7: -1 day permanently in DB** |
| cat3-B-IST (000485)  | Field10 | `2026-03-14 00:00:00.000` | `2026-03-15 00:00:00.000` | **#7: -1 day permanently in DB** |
| cat3-EF-BRT (000471) | Field12 | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (legacy typed)              |
| cat3-C-BRT (000106)  | Field6  | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (DateTime same-TZ)          |

**Mixed Timezone Storage**: DB contains a mix of UTC and timezone-ambiguous values in the same `datetime` columns. VV server confirmed running in **BRT (UTC-3)** — VVCreateDate is 3 hours behind Field1 `toISOString()` values.

**Artifacts created**: `testing/scripts/audit-bug3-v2-probe.js` (V2 probe + parseDateString functional test), `testing/scripts/audit-bug2-db-evidence.js`

---

## Impact Analysis

### Current Impact

- **Limited** — V2 is not the default code path. Standard forms use V1.
- Only affects forms opened in Object View context or with server flag enabled

### Future Impact

- **Higher** — V2 is the intended successor to V1. As VV migrates to V2, this bug will affect more users
- If V2 is enabled globally via the server flag, all forms will be affected

### Interaction with Other Bugs

- Bug #3 feeds incorrect parameters to `parseDateString()`, which already has Bug #1 (Z stripping)
- The combination compounds the error: wrong parameter values + wrong timezone handling

---

## Workarounds

- **Use V1**: Ensure `useUpdatedCalendarValueLogic=false` (the default). This bypasses the V2 code path entirely.
- **Avoid Object View for date-critical forms**: If dates must be accurate, open forms in standard mode (no `?ObjectID=` param)

---

## Proposed Fix

### Before

```javascript
// Saved data — hardcodes enableTime
this.data.value = this.calendarValueService.parseDateString(
    this.data.value,
    true, // ← HARDCODED
    this.data.ignoreTimezone
);

// Preset — hardcodes both
this.data.value = this.calendarValueService.parseDateString(
    this.data.initialDate,
    false, // ← HARDCODED
    true // ← HARDCODED
);
```

### After

```javascript
// Saved data — use actual settings
this.data.value = this.calendarValueService.parseDateString(
    this.data.value,
    this.data.enableTime, // ← ACTUAL field setting
    this.data.ignoreTimezone
);

// Preset — use actual settings
this.data.value = this.calendarValueService.parseDateString(
    this.data.initialDate,
    this.data.enableTime, // ← ACTUAL field setting
    this.data.ignoreTimezone // ← ACTUAL field setting
);
```

---

## Fix Impact Assessment

### What Changes If Fixed

- Date-only fields loading saved data correctly apply `.startOf("day")`
- DateTime presets retain their time component
- Preset dates respect the field's `ignoreTimezone` setting

### Backwards Compatibility Risk

- **LOW for saved data path**: The fix makes parsing match the field's actual type, which aligns with how the value was originally saved
- **MEDIUM for preset path**: Changing preset parsing could produce different initial values for existing form templates. Templates with presets would need regression testing.

### Regression Risk

- Moderate — `initCalendarValueV2()` runs on every form load when V2 is active
- Must test all 8 configs with saved data reload and preset date load under V2
- Must verify that V1 behavior is completely unaffected (V1 uses `initCalendarValueV1()`, a separate function)
