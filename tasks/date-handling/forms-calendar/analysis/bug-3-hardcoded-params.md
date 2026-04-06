# FORM-BUG-3: Form Load Ignores Field Configuration, Uses Hardcoded Settings

## What Happens

When a form loads saved data or preset dates using the updated code path (V2), the system calls its date-parsing function with **hardcoded parameter values** instead of reading the field's actual configuration. This means the parsing behavior is disconnected from what the field is actually configured to do:

- A **date-only field** loading saved data is processed as if it were a **date+time field** — the time component from the database value is preserved instead of being collapsed to midnight, potentially causing unexpected display behavior.
- A **date+time field** loading a preset default is processed as if it were **date-only** — the time component of the preset is discarded. Additionally, the timezone handling flag is hardcoded to "ignore timezone" regardless of the field's actual setting, which skips the UTC recovery logic that would otherwise correct the value.

**Current scope**: Like [FORM-BUG-1](bug-1-timezone-stripping.md), this defect exists in the V2 code path that is **not active in standard production forms**. V2 activates only in specific contexts (Object View mode, server flag). The current production code (V1) has analogous hardcoding — implicit rather than explicit — but its effects manifest through other bugs in this investigation.

**Critical dependency**: One of the hardcoded values accidentally **prevents** a different, more severe bug ([FORM-BUG-7](bug-7-wrong-day-utc-plus.md)) from appearing on the V2 load path. Fixing FORM-BUG-3 without fixing FORM-BUG-7 first would make dates worse, not better. See [Critical Dependency](#critical-dependency-fixing-this-bug-would-expose-form-bug-7).

---

## Severity: MEDIUM

Currently dormant — V2 is not active in standard forms. Becomes Medium-High when V2 is activated globally, as the wrong parsing parameters would affect every form load for every calendar field.

---

## Who Is Affected

**Only when V2 is active** (not the default):

- Forms opened in **Object View mode** (`?ObjectID=` URL parameter)
- Forms with a non-empty `modelId` context
- Accounts where the `useUpdatedCalendarValueLogic` server flag is enabled

Standard standalone forms use V1 (the default) and bypass the defective function entirely.

---

## Background

### V1 and V2 Code Paths

The FormViewer has two versions of its calendar field initialization logic, controlled by an internal flag:

- **V1** (`useUpdatedCalendarValueLogic = false`, the default): The current production code. Processes saved dates through inline code in `initCalendarValueV1()`.
- **V2** (`useUpdatedCalendarValueLogic = true`): An updated code path that routes all date parsing through a centralized function called `parseDateString()`. FORM-BUG-3 is about the **call sites** that invoke `parseDateString()` — specifically, two of the three call sites pass wrong parameter values.

### Field Configuration Flags

Each calendar field has three boolean configuration properties:

| Flag             | What It Controls                                                           |
| ---------------- | -------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores time in addition to date (date-only vs date+time) |
| `ignoreTimezone` | Whether timezone conversion is skipped (treat value as display time)       |
| `useLegacy`      | Whether the field uses the older rendering/save code path                  |

### What `parseDateString()` Does With These Flags

The `parseDateString(value, enableTime, ignoreTimezone)` function uses the two flags to decide how to parse a date string:

- `enableTime=true` → preserves the full time component
- `enableTime=false` → collapses to midnight (`.startOf("day")`)
- `ignoreTimezone=true` → parses as local time
- `ignoreTimezone=false` → attempts a UTC-to-local conversion

When the wrong flags are passed, the parsing behavior doesn't match the field's intended type — a date-only field gets DateTime parsing, or a DateTime field gets date-only parsing.

---

## The Problem in Detail

### Three Call Sites, Two Are Wrong

The V2 initialization function `initCalendarValueV2()` calls `parseDateString()` in three scenarios. One uses the correct field settings; two use hardcoded values:

**1. URL query string path — CORRECT:**

```javascript
parseDateString(this.data.text, this.data.enableTime, this.data.ignoreTimezone);
//                               ✓ actual setting      ✓ actual setting
```

**2. Saved data path — HARDCODED `enableTime`:**

```javascript
parseDateString(this.data.value, true, this.data.ignoreTimezone);
//                                ✗ hardcoded true   ✓ actual setting
```

A date-only field (`enableTime=false`) loading saved data is told `enableTime=true` — the `.startOf("day")` step is skipped, and the time component from the database value leaks through.

**3. Preset date path — BOTH HARDCODED:**

```javascript
parseDateString(this.data.initialDate, false, true);
//                                      ✗ hardcoded false   ✗ hardcoded true
```

A date+time field (`enableTime=true`) loading a preset is told `enableTime=false` — the preset's time component is discarded. A field with `ignoreTimezone=false` is told `true` — the UTC recovery logic is skipped.

### Concrete Examples

**Date-only field (Config A, `enableTime=false`), loading saved value `"2026-03-15"`:**

| Parameter      | Should Be | Hardcoded Value   | Effect                                                                |
| -------------- | --------- | ----------------- | --------------------------------------------------------------------- |
| enableTime     | `false`   | **`true`**        | `.startOf("day")` is NOT applied — time from DB parsing leaks through |
| ignoreTimezone | `false`   | `false` (correct) | N/A                                                                   |

With correct parameters: `parseDateString("2026-03-15", false, false)` → collapses to midnight, produces a clean date.
With hardcoded parameters: `parseDateString("2026-03-15", true, false)` → preserves full datetime, produces a different result.

**Date+time field (Config C, `enableTime=true`, `ignoreTimezone=false`), loading a preset:**

| Parameter      | Should Be | Hardcoded Value | Effect                                             |
| -------------- | --------- | --------------- | -------------------------------------------------- |
| enableTime     | `true`    | **`false`**     | `.startOf("day")` IS applied — preset time is lost |
| ignoreTimezone | `false`   | **`true`**      | UTC recovery logic skipped — value parsed as local |

---

## Critical Dependency: Fixing This Bug Would Expose FORM-BUG-7

The hardcoded `enableTime=true` on the saved data path has an unintended positive side effect: it **accidentally prevents [FORM-BUG-7](bug-7-wrong-day-utc-plus.md)** from appearing on the V2 load path.

Here's why: when `parseDateString` receives a date-only string like `"2026-03-15"` with `enableTime=true`, it skips the `.startOf("day")` call and preserves the full datetime. This produces a correct date. But with the "fixed" parameter `enableTime=false`, the function collapses to local midnight — and for UTC+ users, local midnight is the previous UTC day, storing March 14 instead of March 15 (this is exactly FORM-BUG-7).

| parseDateString("2026-03-15", ...) | enableTime         | Result in São Paulo          | Correct Date?   |
| ---------------------------------- | ------------------ | ---------------------------- | --------------- |
| Current (hardcoded)                | `true` (hardcoded) | `"2026-03-15T00:00:00.000Z"` | **Yes**         |
| "Fixed" (actual setting)           | `false` (actual)   | `"2026-03-14T03:00:00.000Z"` | **No** (-1 day) |

**Fixing FORM-BUG-3 without fixing FORM-BUG-7 first would INTRODUCE wrong dates on the V2 load path.** The fix order must be:

1. Fix FORM-BUG-7 (date-only local-midnight parsing) first
2. Then fix FORM-BUG-3 (hardcoded parameters) — now safe because the underlying parsing is correct

---

## Test Evidence

### Functional Verification via Direct Invocation

Since V2 could not be activated on the test environment (see V2 Activation Probe below), `parseDateString()` was called directly in the browser with hardcoded vs correct parameters:

| Input                        | Scenario                   | Hardcoded Params                    | Correct Params                   | Hardcoded Result                   | Correct Result               | Match  |
| ---------------------------- | -------------------------- | ----------------------------------- | -------------------------------- | ---------------------------------- | ---------------------------- | ------ |
| `"2026-03-15"`               | Date-only saved (Config A) | enableTime=true, ignoreTZ=false     | enableTime=false, ignoreTZ=false | `"2026-03-15T00:00:00.000Z"`       | `"2026-03-14T03:00:00.000Z"` | **No** |
| `"2026-03-15T00:00:00"`      | DateTime preset (Config C) | enableTime=false, ignoreTZ=true     | enableTime=true, ignoreTZ=false  | `"2026-03-15T03:00:00.000Z"`       | `"2026-03-15T00:00:00.000Z"` | **No** |
| `"2026-03-15T03:00:00.000Z"` | Legacy-stored UTC          | enableTime=true                     | enableTime=false                 | `"2026-03-15T03:00:00.000Z"`       | `"2026-03-15T03:00:00.000Z"` | Yes    |
| `"2026-03-15T00:00:00"`      | Config D saved vs preset   | enableTime=true/false,ignoreTZ=true | —                                | Both: `"2026-03-15T03:00:00.000Z"` | —                            | Yes    |

The hardcoded parameters produce materially different results for date-only fields loading saved data and date+time presets with `ignoreTimezone=false`. Some inputs coincidentally produce the same result (UTC-suffixed strings, Config D values), but the mismatch for standard date-only and DateTime fields is definitive.

### V2 Activation Probe — V2 Could Not Be Activated

| Method                                                                     | Result                           |
| -------------------------------------------------------------------------- | -------------------------------- |
| `?ObjectID={fakeGUID}` appended to URL                                     | V2 flag remains `false`          |
| `?ObjectID=` as first URL param                                            | V2 flag remains `false`          |
| Manual `calendarValueService.useUpdatedCalendarValueLogic = true` + reload | Flag resets to `false` on reload |

The `?ObjectID=` path likely requires a valid object that exists in the VV system (not just any GUID). The server flag is not set for the test account. FORM-BUG-3 remains **code-confirmed + functionally verified, not end-to-end tested**.

### Category 3 (Server Reload) V1 Regression — 10 PASS / 8 FAIL

Re-run via Playwright to verify existing V1 behavior is consistent with the matrix:

**São Paulo (12 tests: 6P/6F):**

| Test        | Status | Bug Triggered                               |
| ----------- | ------ | ------------------------------------------- |
| 3-A-BRT-BRT | PASS   | —                                           |
| 3-B-BRT-BRT | PASS   | —                                           |
| 3-E-BRT-BRT | PASS   | —                                           |
| 3-F-BRT-BRT | PASS   | —                                           |
| 3-G-BRT-BRT | PASS   | —                                           |
| 3-H-BRT-BRT | PASS   | —                                           |
| 3-A-IST-BRT | FAIL   | FORM-BUG-7 (date saved from Mumbai, -1 day) |
| 3-B-IST-BRT | FAIL   | FORM-BUG-7                                  |
| 3-C-BRT-BRT | FAIL   | FORM-BUG-4 (Z stripped on save)             |
| 3-C-IST-BRT | FAIL   | FORM-BUG-1 + FORM-BUG-4 (RangeError)        |
| 3-D-BRT-BRT | FAIL   | FORM-BUG-5 (fake Z)                         |
| 3-D-IST-BRT | FAIL   | FORM-BUG-5                                  |

**Mumbai (6 tests: 4P/2F):**

| Test        | Status | Bug Triggered           |
| ----------- | ------ | ----------------------- |
| 3-A-BRT-IST | PASS   | —                       |
| 3-B-BRT-IST | PASS   | —                       |
| 3-E-BRT-IST | PASS   | —                       |
| 3-H-BRT-IST | PASS   | —                       |
| 3-C-BRT-IST | FAIL   | FORM-BUG-1 + FORM-BUG-4 |
| 3-D-BRT-IST | FAIL   | FORM-BUG-5              |

**Note**: The date-handling CLAUDE.md previously stated "Cat 3 fully complete 18/18 (14P, 4F)." The correct count is **10P/8F** — corrected during this audit.

### Database Evidence

All calendar fields in the `dbo.DateTest` table are SQL Server `datetime` type — there is no `date` column type. This means `parseDateString()` output, after passing through `getSaveValue()`, becomes a `datetime` value in the database.

Cross-referencing saved records with actual DB values:

| Record               | Field   | DB Value                  | Expected                  | Bug                          |
| -------------------- | ------- | ------------------------- | ------------------------- | ---------------------------- |
| cat3-A-BRT (000080)  | Field7  | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (same-TZ reload)        |
| cat3-AD-IST (000084) | Field7  | `2026-03-14 00:00:00.000` | `2026-03-15 00:00:00.000` | FORM-BUG-7: -1 day in DB     |
| cat3-B-IST (000485)  | Field10 | `2026-03-14 00:00:00.000` | `2026-03-15 00:00:00.000` | FORM-BUG-7: -1 day in DB     |
| cat3-EF-BRT (000471) | Field12 | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (legacy typed, same-TZ) |
| cat3-C-BRT (000106)  | Field6  | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (date+time, same-TZ)    |

The DB also contains mixed timezone semantics within the same `datetime` columns — some values are UTC (from `toISOString()`), others are timezone-ambiguous local time (from `getSaveValue()`). The VV server runs in São Paulo (UTC-3), confirmed by a 3-hour offset between `VVCreateDate` (server local) and Field1 `toISOString()` (UTC).

---

## Technical Root Cause

### The Defective Code

**File**: `main.js` (bundled FormViewer application)
**Function**: `initCalendarValueV2()` — lines ~102932–102958

```javascript
initCalendarValueV2() {
    let isNewValue = false;

    if (this.data.enableQListener && this.data.text) {
        // URL Query String — CORRECT: uses actual field settings
        this.data.value = this.calendarValueService.parseDateString(
            this.data.text,
            this.data.enableTime,      // ✓ actual setting
            this.data.ignoreTimezone   // ✓ actual setting
        );
    } else if (this.data.value) {
        // Saved Data — HARDCODED enableTime
        this.data.value = this.calendarValueService.parseDateString(
            this.data.value,
            true,                      // ✗ HARDCODED (ignores field type)
            this.data.ignoreTimezone   // ✓ actual setting
        );
    } else if (this.data.enableInitialValue && this.docInfo.isFormTemplate) {
        switch (this.data.initialValueMode) {
            case CalendarInitialValueMode.CurrentDate:
                this.value = new Date();   // ✓ No parsing needed
                break;
            case CalendarInitialValueMode.PresetDate:
                this.data.value = this.calendarValueService.parseDateString(
                    this.data.initialDate,
                    false,             // ✗ HARDCODED (ignores field type)
                    true               // ✗ HARDCODED (ignores field setting)
                );
                break;
        }
        isNewValue = true;
    }
}
```

### The V1 Analog

V1 (`initCalendarValueV1()`) does not call `parseDateString()` — it handles each case with inline code. The inline code also has implicit hardcoding (e.g., the date-only branch always uses `moment(e).toDate()` regardless of `ignoreTimezone`), but the effects manifest as other bugs rather than this one.

---

## Workarounds

This bug is currently dormant because V2 is not active in standard form usage. The default V1 code path is the effective workaround.

- **Avoid Object View for date-critical forms**: If dates must be accurate, open forms in standard mode (no `?ObjectID=` URL parameter)
- **Do not enable the V2 server flag** until this bug and FORM-BUG-7 are both fixed

---

## Proposed Fix

### Before (Current)

```javascript
// Saved data — hardcodes enableTime
parseDateString(this.data.value, true, this.data.ignoreTimezone);

// Preset — hardcodes both
parseDateString(this.data.initialDate, false, true);
```

### After (Fixed)

```javascript
// Saved data — use actual settings
parseDateString(this.data.value, this.data.enableTime, this.data.ignoreTimezone);

// Preset — use actual settings
parseDateString(this.data.initialDate, this.data.enableTime, this.data.ignoreTimezone);
```

The fix is straightforward: replace the hardcoded values with the field's actual configuration properties at both call sites.

**However**: This fix **must not be deployed before FORM-BUG-7 is fixed**. With the current `parseDateString` implementation, passing the correct `enableTime=false` for date-only fields would trigger FORM-BUG-7's local-midnight parsing on the V2 load path, storing the wrong day for UTC+ users.

---

## Fix Impact Assessment

### What Changes If Fixed

- Date-only fields loading saved data correctly apply `.startOf("day")` (midnight collapse)
- Date+time presets retain their time component
- Preset dates respect the field's `ignoreTimezone` setting
- All three `parseDateString` call sites in V2 use consistent, correct parameters

### Backwards Compatibility Risk: MEDIUM

- **Saved data path**: The fix makes parsing match the field's actual type, which aligns with how the value was originally saved — low risk
- **Preset path**: Changing preset parsing could produce different initial values for existing form templates. Templates with presets would need regression testing.

### Regression Risk: MODERATE

- `initCalendarValueV2()` runs on every V2 form load for every calendar field
- Must test all 8 field configurations with saved data reload and preset date load under V2
- Must verify V1 behavior is completely unaffected (V1 uses a separate function)
- **Must coordinate with FORM-BUG-7 fix** — deploying this fix alone would introduce date-only wrong-day errors on V2

### Artifacts Created During Investigation

- `testing/scripts/audit-bug3-v2-probe.js` — V2 activation probe + `parseDateString` functional test
- `testing/scripts/audit-bug2-db-evidence.js` — DB comparison script (shared with FORM-BUG-2 audit)
