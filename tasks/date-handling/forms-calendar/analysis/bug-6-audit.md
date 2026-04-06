# Bug #6 Audit Report: GetFieldValue Returns "Invalid Date" for Empty Fields

**Date**: 2026-04-06
**Auditor**: Playwright automated verification + direct function invocation
**Original evidence**: Manual + Playwright testing (2026-04-01 to 2026-04-03)

---

## Audit Objective

Independently verify Bug #6 (missing empty guard in `getCalendarFieldValue()` causes Config C to throw and Config D to return truthy `"Invalid Date"` for empty fields).

---

## Results

### 1. GetFieldValue on All 8 Empty Base Fields

| Config | Field      | enableTime | ignoreTZ  |  legacy   | GFV Return            |  Truthy  | Bug #6?          |
| :----: | ---------- | :--------: | :-------: | :-------: | --------------------- | :------: | ---------------- |
|   A    | Field7     |   false    |   false   |   false   | `""`                  |  false   | NO               |
|   B    | Field10    |   false    |   true    |   false   | `""`                  |  false   | NO               |
| **C**  | **Field6** |  **true**  | **false** | **false** | **THROWS RangeError** |    —     | **YES (crash)**  |
| **D**  | **Field5** |  **true**  | **true**  | **false** | **`"Invalid Date"`**  | **TRUE** | **YES (truthy)** |
|   E    | Field12    |   false    |   false   |   true    | `""`                  |  false   | NO               |
|   F    | Field11    |   false    |   true    |   true    | `""`                  |  false   | NO               |
|   G    | Field14    |    true    |   false   |   true    | `""`                  |  false   | NO               |
|   H    | Field13    |    true    |   true    |   true    | `""`                  |  false   | NO               |

**Pattern**: Only `enableTime=true && useLegacy=false` configs are affected (C, D). All others return `""` correctly.

### 2. Direct getCalendarFieldValue() — Empty and Null Inputs

| Config | Input      | Result                                  | Issue                                                    |
| ------ | ---------- | --------------------------------------- | -------------------------------------------------------- |
| C      | `""`       | THROWS `RangeError: Invalid time value` | `new Date("").toISOString()` crashes                     |
| D      | `""`       | `"Invalid Date"` (truthy)               | `moment("").format(...)` returns literal string          |
| G      | `""`       | `""`                                    | Safe (legacy passthrough)                                |
| H      | `""`       | `""`                                    | Safe (legacy passthrough)                                |
| A      | `""`       | `""`                                    | Safe (date-only passthrough)                             |
| **D**  | **`null`** | **`"Invalid Date"`**                    | Same bug with null input                                 |
| **C**  | **`null`** | **`"1970-01-01T00:00:00.000Z"`**        | **NEW FINDING**: returns Unix epoch instead of crashing! |

**New finding**: Config C with `null` input returns the Unix epoch (`1970-01-01T00:00:00.000Z`) instead of throwing — `new Date(null)` creates epoch date, unlike `new Date("")` which is Invalid Date. This is a third failure mode: silently returns a wrong date for null fields.

### 3. Developer Impact — Standard Pattern

```javascript
if (VV.Form.GetFieldValue('field')) {
    /* process */
}
```

| Config                | Empty Field Behavior              | Developer Impact                          |
| --------------------- | --------------------------------- | ----------------------------------------- |
| A (date-only)         | Returns `""` (falsy)              | **CORRECT** — block skipped               |
| D (DateTime+ignoreTZ) | Returns `"Invalid Date"` (truthy) | **WRONG** — block entered for empty field |
| C (DateTime)          | Throws RangeError                 | **CRASHES** — script execution stops      |
| H (legacy DateTime)   | Returns `""` (falsy)              | **CORRECT** — block skipped               |

### 4. GDOC Workaround Verification

`GetDateObjectFromCalendar()` on all empty fields:

| Field       | Result      | Truthy |  Safe?  |
| ----------- | ----------- | :----: | :-----: |
| Field5 (D)  | `undefined` | false  | **YES** |
| Field6 (C)  | `undefined` | false  | **YES** |
| Field7 (A)  | `undefined` | false  | **YES** |
| Field13 (H) | `undefined` | false  | **YES** |

**GDOC is universally safe** — returns `undefined` (falsy) for all empty fields regardless of config. Recommended as the workaround.

### 5. Playwright Cat 8 Spec Regression

| Test      | Expected | Received                      | Status   |
| --------- | -------- | ----------------------------- | -------- |
| 8-A-empty | `""`     | `""`                          | PASS     |
| 8-C-empty | `""`     | `"ERROR: Invalid time value"` | **FAIL** |
| 8-D-empty | `""`     | `"Invalid Date"`              | **FAIL** |
| 8-H-empty | `""`     | `""`                          | PASS     |

---

## Conclusion

**Bug #6 is CONFIRMED with multi-method verification.**

| Criterion                                  | Status                                     |
| ------------------------------------------ | ------------------------------------------ |
| Config C empty → RangeError                | **CONFIRMED** via direct + Playwright      |
| Config D empty → `"Invalid Date"` (truthy) | **CONFIRMED** via direct + Playwright      |
| Config D null → `"Invalid Date"`           | **CONFIRMED** (same bug)                   |
| Config C null → epoch `"1970-01-01..."`    | **NEW FINDING** (third failure mode)       |
| All other configs safe (return `""`)       | **CONFIRMED** (A, B, E, F, G, H)           |
| GDOC workaround safe (returns `undefined`) | **CONFIRMED** for all configs              |
| Developer pattern `if(GFV)` broken         | **CONFIRMED** for C (crash) and D (truthy) |

### Three Failure Modes

1. **Config D, empty `""`**: Returns `"Invalid Date"` — truthy, breaks conditionals
2. **Config C, empty `""`**: Throws `RangeError` — crashes scripts
3. **Config C, null**: Returns `"1970-01-01T00:00:00.000Z"` — silently returns epoch (new finding)

### Fix: One-Line Empty Guard

```javascript
// Add before line 104117:
if (!value || value.length === 0) return '';
```

This fixes all three failure modes and doesn't affect populated fields.

### Artifacts Created

- `testing/scripts/audit-bug6-empty-fields.js` — comprehensive audit (4 tests)
- This audit report (`bug-6-audit.md`)
