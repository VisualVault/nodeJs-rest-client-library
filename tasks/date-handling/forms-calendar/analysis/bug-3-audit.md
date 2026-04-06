# Bug #3 Audit Report: Hardcoded Parameters in initCalendarValueV2()

**Date**: 2026-04-06
**Auditor**: Playwright automated verification + source code analysis
**Original evidence**: Code analysis only (V2 never activated in testing)

---

## Audit Objective

Independently verify Bug #3 (hardcoded `enableTime` and `ignoreTimezone` parameters in `initCalendarValueV2()`) using source code verification, `parseDateString()` functional testing, and V2 activation attempts.

---

## Methodology

### Three-pronged approach

1. **Source code verification** — Read the bundled main.js at known line numbers to confirm hardcoded values
2. **parseDateString functional test** — Call `parseDateString()` directly in the browser with hardcoded vs correct parameters and compare outputs
3. **V2 activation probe** — Attempt to activate V2 via `?ObjectID=` URL parameter and manual flag flip
4. **Cat 3 V1 regression** — Re-run all 18 Category 3 tests via Playwright to verify existing results

---

## Results

### 1. Source Code Verification: CONFIRMED

**File**: `tasks/date-handling/forms-calendar/main.js`

**Line 102932-102958 — `initCalendarValueV2()`**:

```javascript
// Line 102938-102940 — Saved data path:
else if (this.data.value)
    this.data.value = this.calendarValueService.parseDateString(
        this.data.value,
        !0,                        // ← HARDCODED enableTime=true
        this.data.ignoreTimezone   // ✓ Uses actual setting
    )

// Line 102947-102949 — Preset date path:
case this.enums.CalendarInitialValueMode.PresetDate:
    this.data.value = this.calendarValueService.parseDateString(
        this.data.initialDate,
        !1,                        // ← HARDCODED enableTime=false
        !0                         // ← HARDCODED ignoreTimezone=true
    )
```

**Line 104126-104131 — `parseDateString()`**:

```javascript
parseDateString(e, t, n) {                    // e=value, t=enableTime, n=ignoreTimezone
    let r, a = e.replace("Z", "");            // Strip Z from input
    return r = n ? i(a) : i(a).tz("UTC", !0).local(),  // n: local parse vs UTC→local
    t || (r = r.startOf("day")),              // t: if false, collapse to midnight
    r.toISOString()
}
```

**Contrast with URL query string path (line 102934-102935)** — correctly uses actual settings:

```javascript
this.calendarValueService.parseDateString(
    this.data.text,
    this.data.enableTime, // ✓ Actual field setting
    this.data.ignoreTimezone // ✓ Actual field setting
);
```

### 2. parseDateString Functional Test: BUG CONFIRMED

Direct invocation in the browser confirms hardcoded vs correct parameters produce different outputs:

| Input                        | Scenario                   | V2 Hardcoded Params                                             | Correct Params                   | V2 Result                          | Correct Result               | Match  |
| ---------------------------- | -------------------------- | --------------------------------------------------------------- | -------------------------------- | ---------------------------------- | ---------------------------- | ------ |
| `"2026-03-15"`               | Date-only saved (Config A) | enableTime=true, ignoreTZ=false                                 | enableTime=false, ignoreTZ=false | `"2026-03-15T00:00:00.000Z"`       | `"2026-03-14T03:00:00.000Z"` | **NO** |
| `"2026-03-15T00:00:00"`      | DateTime preset (Config C) | enableTime=false, ignoreTZ=true                                 | enableTime=true, ignoreTZ=false  | `"2026-03-15T03:00:00.000Z"`       | `"2026-03-15T00:00:00.000Z"` | **NO** |
| `"2026-03-15T03:00:00.000Z"` | Legacy-stored UTC          | enableTime=true                                                 | enableTime=false                 | `"2026-03-15T03:00:00.000Z"`       | `"2026-03-15T03:00:00.000Z"` | YES    |
| `"2026-03-15T00:00:00"`      | Config D saved vs preset   | enableTime=true,ignoreTZ=true vs enableTime=false,ignoreTZ=true | —                                | Both: `"2026-03-15T03:00:00.000Z"` | —                            | YES    |

**Key finding**: The hardcoded parameters produce materially different results for:

- **Date-only fields loading saved data**: enableTime=true skips `.startOf("day")` → full datetime instead of date-only
- **DateTime presets with ignoreTZ=false**: hardcoded ignoreTZ=true bypasses UTC recovery → 3-hour shift in BRT

Some inputs coincidentally produce the same result (UTC-suffixed strings, Config D values) but the mismatch for standard date-only and DateTime fields is definitive.

### 3. V2 Activation Probe: V2 COULD NOT BE ACTIVATED

| Method                                                                     | Result                           |
| -------------------------------------------------------------------------- | -------------------------------- |
| `?ObjectID={fakeGUID}` appended to URL                                     | V2 flag remains `false`          |
| `?ObjectID=` as first URL param                                            | V2 flag remains `false`          |
| Manual `calendarValueService.useUpdatedCalendarValueLogic = true` + reload | Flag resets to `false` on reload |

**Conclusion**: V2 cannot be activated on the vvdemo test environment via URL manipulation. The `?ObjectID=` path likely requires a valid object that exists in the VV system (not just any GUID). The server flag is not set for the test account. Bug #3 remains **code-confirmed but not end-to-end testable** with current access.

### 4. Category 3 V1 Regression: 10P/8F (matches matrix)

**BRT-chromium** (12 tests: 6P/6F):

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

**IST-chromium** (6 tests: 4P/2F):

| Test        | Status | Bug       |
| ----------- | ------ | --------- |
| 3-A-BRT-IST | PASS   | —         |
| 3-B-BRT-IST | PASS   | —         |
| 3-E-BRT-IST | PASS   | —         |
| 3-H-BRT-IST | PASS   | —         |
| 3-C-BRT-IST | FAIL   | Bug #1+#4 |
| 3-D-BRT-IST | FAIL   | Bug #5    |

**Note**: CLAUDE.md claims "Cat 3 fully complete 18/18 (14P, 4F)" — this is incorrect. The matrix and Playwright regression both show **10P/8F**.

---

## Conclusion

### Bug #3 Status: CODE-CONFIRMED + FUNCTIONALLY VERIFIED, NOT END-TO-END TESTED

| Criterion                                    | Status                                                          |
| -------------------------------------------- | --------------------------------------------------------------- |
| Source code hardcoded params                 | VERIFIED at lines 102939, 102948                                |
| parseDateString produces different results   | VERIFIED via direct browser invocation                          |
| V2 end-to-end test                           | NOT POSSIBLE (V2 cannot be activated on test env)               |
| Cat 3 V1 regression                          | 10P/8F — matches matrix, consistent with known bugs #1/#4/#5/#7 |
| Bug #3 directly causes any live test failure | NO — V1 is active in all tests                                  |

### Severity Assessment

- **Current**: LOW — V2 is dormant. Standard forms use V1.
- **Future**: MEDIUM-HIGH — When V2 is activated globally (server flag or migration), Bug #3 will cause:
    - Date-only fields to load with wrong time parsing (saved data path)
    - DateTime presets to lose time component and skip UTC recovery (preset path)
    - These effects compound with Bug #1 (Z stripping in parseDateString)

### Recommendations for Product Team

1. **Fix is straightforward**: Replace `!0`/`!1` with `this.data.enableTime`/`this.data.ignoreTimezone` at two call sites
2. **Priority depends on V2 rollout timeline**: If V2 activation is planned, fix before enabling
3. **V1 has analogous issues**: `initCalendarValueV1()` (lines 102886-102931) hardcodes parsing behavior implicitly — should be reviewed simultaneously

---

## DB Context (2026-04-06)

### Schema: All Fields are `datetime`

The `dbo.DateTest` table uses SQL Server `datetime` for ALL calendar fields — there is no `date` column type. This means `parseDateString()` output, after passing through `getSaveValue()`, becomes a `datetime` value in the DB.

### V2 Bug #3 / Bug #7 Interaction — Critical Irony

The hardcoded `enableTime=true` on the V2 saved data path **accidentally prevents Bug #7** for date-only fields in UTC+ timezones:

| parseDateString("2026-03-15", ...) | enableTime         | Result                       | Bug #7?                             |
| ---------------------------------- | ------------------ | ---------------------------- | ----------------------------------- |
| V2 hardcoded                       | `true` (hardcoded) | `"2026-03-15T00:00:00.000Z"` | **No** — preserves correct date     |
| V2 "fixed"                         | `false` (actual)   | `"2026-03-14T03:00:00.000Z"` | **Yes** — shifts to March 14 in BRT |

**Fixing Bug #3 without fixing Bug #7 first would INTRODUCE Bug #7 on the V2 load path.** This means:

- Bug #7 fix must be prioritized before or simultaneously with Bug #3 fix
- The V2 hardcoded value is a "wrong for the right reasons" situation

### Cat 3 DB Evidence

Cross-referencing Cat 3 saved records with actual DB values:

| Record               | Field   | DB Value                  | Expected                  | Bug                              |
| -------------------- | ------- | ------------------------- | ------------------------- | -------------------------------- |
| cat3-A-BRT (000080)  | Field7  | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (BRT same-TZ)               |
| cat3-AD-IST (000084) | Field7  | `2026-03-14 00:00:00.000` | `2026-03-15 00:00:00.000` | **#7: -1 day permanently in DB** |
| cat3-B-IST (000485)  | Field10 | `2026-03-14 00:00:00.000` | `2026-03-15 00:00:00.000` | **#7: -1 day permanently in DB** |
| cat3-EF-BRT (000471) | Field12 | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (legacy typed)              |
| cat3-C-BRT (000106)  | Field6  | `2026-03-15 00:00:00.000` | `2026-03-15 00:00:00.000` | None (DateTime same-TZ)          |

### Mixed Timezone Storage

The DB contains a mix of UTC and timezone-ambiguous values in the same `datetime` columns:

| Source                                   | DB value                  | Timezone semantics         |
| ---------------------------------------- | ------------------------- | -------------------------- |
| `toISOString()` (Field1 current date)    | `2026-04-06 15:53:43.000` | UTC                        |
| `getSaveValue()` date-only (Field7)      | `2026-03-15 00:00:00.000` | Ambiguous (midnight local) |
| `toISOString()` preset (Field2 BRT)      | `2026-03-01 03:00:00.000` | UTC (BRT midnight)         |
| `getSaveValue()` legacy preset (Field19) | `2026-03-01 00:00:00.000` | Ambiguous (midnight)       |

VV server confirmed running in **BRT (UTC-3)** — VVCreateDate is 3 hours behind Field1 `toISOString()` values.

### Artifacts Created

- `testing/scripts/audit-bug3-v2-probe.js` — V2 activation probe + parseDateString functional test
- `testing/scripts/audit-bug2-db-evidence.js` — popup vs typed save for DB comparison
- This audit report (`bug-3-audit.md`)

### CLAUDE.md Correction Needed

The date-handling CLAUDE.md states "Cat 3 fully complete 18/18 (14P, 4F)". The correct count is **10P/8F** based on both the matrix and this Playwright regression.
