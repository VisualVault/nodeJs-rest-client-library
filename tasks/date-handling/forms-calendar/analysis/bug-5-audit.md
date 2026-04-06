# Bug #5 Audit Report: GetFieldValue Adds Fake [Z] Causing Progressive Drift

**Date**: 2026-04-06
**Auditor**: Playwright automated verification + direct function invocation + source code analysis
**Original evidence**: Manual browser testing + Playwright regression (2026-03-27 to 2026-04-03)

---

## Audit Objective

Independently verify Bug #5 (`getCalendarFieldValue()` adds literal `[Z]` to Config D values, causing progressive drift on GetFieldValue→SetFieldValue round-trips) using TZ-invariance proof, direct function invocation, round-trip drift measurement, cross-config comparison, and edge case testing.

---

## Results

### 1. TZ-Invariance Proof: FAKE Z CONFIRMED

The definitive test: if Z were real UTC, BRT and IST would produce DIFFERENT values. If Z is fake (literal character), both produce IDENTICAL output.

| Stored Value            | BRT GFV (Config D)           | IST GFV (Config D)           | Identical? |
| ----------------------- | ---------------------------- | ---------------------------- | :--------: |
| `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` |  **YES**   |

**Proof**: Both timezones return the exact same string → the Z is a literal character appended by `moment().format("[Z]")`, NOT a real UTC conversion. If `new Date().toISOString()` were used (like Config C), the values would differ.

**Config C contrast** (real UTC via `new Date().toISOString()`):

| Stored Value            | BRT GFV (Config C)           | IST GFV (Config C)           | Identical? |
| ----------------------- | ---------------------------- | ---------------------------- | :--------: |
| `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | `"2026-03-14T18:30:00.000Z"` |   **NO**   |

Config C produces different values per timezone = real UTC conversion. Config D produces identical values = fake literal Z.

### 2. End-to-End Config D (BRT)

Type "03/15/2026 12:00 AM" in Field5 (Config D):

| Metric       | Value                                       |
| ------------ | ------------------------------------------- |
| Raw stored   | `"2026-03-15T00:00:00"` (no Z — correct)    |
| GFV return   | `"2026-03-15T00:00:00.000Z"` (fake Z added) |
| Values match | **NO** — Bug #5 transforms the raw value    |

### 3. Round-Trip Drift

**BRT (UTC-3) — Expected: -3h per trip**

| Step          | Raw Value             | Shift   |
| ------------- | --------------------- | ------- |
| Before        | `2026-03-15T00:00:00` | —       |
| After 1 trip  | `2026-03-14T21:00:00` | **-3h** |
| After 2 trips | `2026-03-14T18:00:00` | **-6h** |
| After 3 trips | `2026-03-14T15:00:00` | **-9h** |

Exactly -3h per trip = BRT offset. After 8 trips: -24h = full day lost.

**IST (UTC+5:30) — Expected: +5:30h per trip**

| Step          | Raw Value             | Shift      |
| ------------- | --------------------- | ---------- |
| Before        | `2026-03-15T00:00:00` | —          |
| After 1 trip  | `2026-03-15T05:30:00` | **+5:30h** |
| After 2 trips | `2026-03-15T11:00:00` | **+11h**   |

Exactly +5:30h per trip. Opposite direction from BRT — further confirms the drift is proportional to TZ offset.

### 4. Cross-Config Comparison (BRT)

| Config                              | Raw         | GFV              | Z?  | Match  | Bug           |
| ----------------------------------- | ----------- | ---------------- | --- | :----: | ------------- |
| **D** (DateTime, ignoreTZ, !legacy) | `T00:00:00` | `T00:00:00.000Z` | YES | **NO** | **#5 fake Z** |
| C (DateTime, !ignoreTZ, !legacy)    | `T00:00:00` | `T03:00:00.000Z` | YES | **NO** | #4 real UTC   |
| G (DateTime, !ignoreTZ, legacy)     | `T00:00:00` | `T00:00:00`      | NO  |  YES   | —             |
| H (DateTime, ignoreTZ, legacy)      | `T00:00:00` | `T00:00:00`      | NO  |  YES   | —             |

Only Config D has Bug #5 fake Z. Config C has Bug #4 (different issue — real UTC conversion). Legacy configs (G, H) return raw unchanged.

### 5. Year Boundary Edge Case

Jan 1, 2026 midnight → 1 round-trip in BRT:

| Step         | Value                      | Year     |
| ------------ | -------------------------- | -------- |
| Before       | `2026-01-01T00:00:00`      | 2026     |
| GFV (fake Z) | `2026-01-01T00:00:00.000Z` | —        |
| After 1 trip | `2025-12-31T21:00:00`      | **2025** |

**Year boundary crossed in a single round-trip.** January 1, 2026 becomes December 31, 2025 after one GetFieldValue→SetFieldValue cycle.

---

## Source Code

**`getCalendarFieldValue()`** — line 104114-104125 in main.js:

```javascript
getCalendarFieldValue(e, t) {
    if (this.useUpdatedCalendarValueLogic)
        return t;                              // V2: raw passthrough — no bug
    if (!e.useLegacy && e.enableTime) {
        if (e.ignoreTimezone) {
            const e = "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]";  // ← FAKE Z (literal escape)
            return i(t).format(e)                        // ← Appends literal Z to local time
        }
        return new Date(t).toISOString()       // Config C: real UTC conversion (Bug #4)
    }
    return t                                   // Legacy or date-only: passthrough
}
```

In moment.js, `[Z]` outputs the literal character `Z` regardless of timezone. This is different from `Z` (timezone offset) or `ZZ` (no-colon offset).

---

## Conclusion

**Bug #5 is CONFIRMED with multi-method verification.**

| Criterion                                       | Status                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| TZ-invariance proof (BRT = IST = fake Z)        | **CONFIRMED** — identical GFV output in both TZs      |
| Config C contrast (real UTC = different per TZ) | **CONFIRMED** — proves Config D's Z is fake           |
| End-to-end raw vs GFV                           | Raw `T00:00:00` → GFV `T00:00:00.000Z` (fake Z added) |
| BRT drift (-3h/trip)                            | **CONFIRMED** — T00:00 → T21:00 → T18:00 → T15:00     |
| IST drift (+5:30h/trip)                         | **CONFIRMED** — T00:00 → T05:30 → T11:00              |
| Year boundary (Jan 1 → Dec 31)                  | **CONFIRMED** — 2026 → 2025 in single trip            |
| Cross-config (D affected, G/H immune)           | **CONFIRMED**                                         |
| Source code `[Z]` format string                 | VERIFIED at line 104119                               |

### Severity: HIGH

- Progressive data corruption on every round-trip
- Proportional to TZ offset: -3h BRT, +5:30h IST, -7h PST, +9h JST, 0h UTC0
- Year and day boundaries crossed in production-realistic scenarios
- Invisible at UTC+0 (0h drift) — developers in UTC won't catch it during testing
- Only Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) is affected
- V2 path returns raw unchanged (no bug) — fix model exists

### Artifacts Created

- `testing/scripts/audit-bug5-fake-z.js` — 5-test comprehensive audit script
- This audit report (`bug-5-audit.md`)
