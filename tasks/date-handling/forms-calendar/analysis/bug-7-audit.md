# Bug #7 Audit Report: Date-Only Fields Store Wrong Day for UTC+ Timezones

**Date**: 2026-04-06
**Auditor**: Playwright automated verification + direct function invocation
**Original evidence**: Manual + Playwright testing (2026-03-27 to 2026-04-03)

---

## Audit Objective

Independently verify Bug #7 (`normalizeCalValue()` parses date-only strings as local midnight, causing UTC+ users to store the previous day) using cross-TZ testing, cross-config comparison, Date object double-shift verification, round-trip compounding, and boundary crossing tests.

---

## Results

### 1. IST (UTC+5:30) — All Date-Only Configs Store Wrong Day

| Config | Field   | Type                      | Input      | Stored                | Expected              | Bug #7?          |
| :----: | ------- | ------------------------- | ---------- | --------------------- | --------------------- | ---------------- |
| **A**  | Field7  | date-only                 | 03/15/2026 | `2026-03-14`          | `2026-03-15`          | **YES (-1 day)** |
| **B**  | Field10 | date-only+ignoreTZ        | 03/15/2026 | `2026-03-14`          | `2026-03-15`          | **YES (-1 day)** |
|   C    | Field6  | DateTime                  | 03/15/2026 | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` | NO               |
|   D    | Field5  | DateTime+ignoreTZ         | 03/15/2026 | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` | NO               |
| **E**  | Field12 | legacy date-only          | 03/15/2026 | `2026-03-14`          | `2026-03-15`          | **YES (-1 day)** |
| **F**  | Field11 | legacy date-only+ignoreTZ | 03/15/2026 | `2026-03-14`          | `2026-03-15`          | **YES (-1 day)** |
|   G    | Field14 | legacy DateTime           | 03/15/2026 | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` | NO               |
|   H    | Field13 | legacy DateTime+ignoreTZ  | 03/15/2026 | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` | NO               |

**All 4 date-only configs (A, B, E, F) shift -1 day in IST. All 4 DateTime configs (C, D, G, H) are unaffected.** Neither `useLegacy` nor `ignoreTimezone` provides protection.

### 2. BRT (UTC-3) Control — No Shift

| Config | Stored       | Correct? |
| :----: | ------------ | :------: |
|   A    | `2026-03-15` |   YES    |
|   B    | `2026-03-15` |   YES    |
|   E    | `2026-03-15` |   YES    |
|   F    | `2026-03-15` |   YES    |

BRT (UTC-3) midnight is still the same UTC calendar day → no shift. Confirms Bug #7 is UTC+ only.

### 3. Date Object Double-Shift (-2 days)

```
Input: new Date(2026, 2, 15) → IST local midnight
Stored: 2026-03-13 (TWO days early!)
```

Date objects undergo **two** local-midnight conversions:

1. `Date.toISOString()` → UTC string (shifts -1 day from IST midnight)
2. `normalizeCalValue()` strips time → re-parses as local midnight → shifts -1 day again

### 4. Round-Trip Compounding

Each `GetFieldValue→SetFieldValue` cycle loses one day:

| Trip | Stored Value                         |
| :--: | ------------------------------------ |
|  0   | `2026-03-14` (already -1 from input) |
|  1   | `2026-03-13`                         |
|  2   | `2026-03-12`                         |
|  3   | `2026-03-11`                         |

**-1 day per round-trip. No limit. Accumulates indefinitely.**

### 5. Calendar Boundary Crossing

| Input       | Stored (IST) | Boundary Crossed   |
| ----------- | ------------ | ------------------ |
| Jan 1, 2026 | `2025-12-31` | **YEAR boundary**  |
| Apr 1, 2026 | `2026-03-31` | **MONTH boundary** |
| Mar 1, 2026 | `2026-02-28` | **MONTH boundary** |

---

## Conclusion

**Bug #7 is CONFIRMED with multi-method verification. Severity: HIGH.**

| Criterion                                    | Status                                  |
| -------------------------------------------- | --------------------------------------- |
| IST date-only -1 day (A, B, E, F)            | **CONFIRMED** — all 4 configs           |
| BRT control (no shift)                       | **CONFIRMED**                           |
| DateTime configs unaffected (C, D, G, H)     | **CONFIRMED**                           |
| `useLegacy=true` provides NO protection      | **CONFIRMED** (E, F shift identically)  |
| `ignoreTimezone=true` provides NO protection | **CONFIRMED** (B, F shift identically)  |
| Date object double-shift (-2 days)           | **CONFIRMED** (2026-03-15 → 2026-03-13) |
| Round-trip compounding (-1 day/trip)         | **CONFIRMED** (Mar 14 → 13 → 12 → 11)   |
| Year boundary crossing (Jan 1 → Dec 31)      | **CONFIRMED**                           |
| Month boundary crossing (Apr 1 → Mar 31)     | **CONFIRMED**                           |

### Impact Scope

- **50% of world's population** (all UTC+ timezones)
- **4 of 8 configs** (all date-only: A, B, E, F)
- **Every input method** (popup, typed, SetFieldValue, preset, form load)
- **No config-level workaround** — neither `useLegacy` nor `ignoreTimezone` helps
- **Progressive** — compounds on round-trips with no limit
- **Invisible to user** — form displays correct date, DB stores wrong date

### Artifacts Created

- `testing/scripts/audit-bug7-wrong-day.js` — 5-test comprehensive audit (IST + BRT)
- This audit report (`bug-7-audit.md`)
