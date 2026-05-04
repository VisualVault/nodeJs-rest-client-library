# FORM-BUG-V2-TYPED-MM-OVERFLOW: V2 typed input silently normalizes invalid month/day via JS Date overflow

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com (customer alias `EmanuelJofre`, database `Main`)
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Not browser-specific. Confirmed on Chromium under macOS (Playwright). Kendo v2 segmented `<input>` is the involved component.
- **User role:** Any authenticated user with permission to type into a calendar field.
- **Customer Culture:** **English (United States)** (`enUS`). Bug is Culture-conditional — confirmed only with enUS Culture so far.
- **Timezone:** BRT (UTC-3) confirmed; bug is not TZ-dependent at root (the parsing happens in the JS `Date` constructor regardless of system TZ).
- **Frequency:** Always (deterministic when the trigger conditions are met).
- **Severity:** **HIGH** — Silent data corruption. The form accepts the input without warning; the stored value is silently shifted to a different real date.

## Summary

When a user types a date into a calendar field on V2 with the customer Culture set to English (United States), Kendo v2's segmented `MM/DD/YYYY` input does not validate that each segment is in range. Any digits typed into the segments are passed to `new Date(Y, M-1, D)`, which silently *normalizes* out-of-range months and days by rolling them forward. So a Brazilian user typing `15/03/2026` (DD/MM intent, March 15) stores **May 3, 2026** instead — month `15` is interpreted as `M-1=14`, which JS rolls forward by 14 months from January, landing on May of the following year-cycle, with day 3.

The form shows no validation error. The field appears to accept the input. The stored value is a valid date — just the wrong one.

A second failure mode appears with ISO input. Typing `2026-03-15` (a hyphenated ISO string) into the same MM/DD/YYYY mask catastrophically misparses: the year segment captures `0315`, and subsequent digits redistribute across other segments, producing values like `0315-02-02T03:06:28.000Z`. This is a year-1300s value, often outside reasonable validation ranges downstream.

V1 is not affected — V1's typed-input pipeline used a different parser that rejected obviously-invalid segments.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- Customer Culture set to English (United States) in Central Admin.
- The `Date Test Harness` form open with at least one Config A field exposed (e.g., `dateTzAwareV2Empty` — date-only, `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`).
- Browser system timezone: any (BRT used in the per-TZ table below; bug is not TZ-dependent).

### Test data

| Slot | Input typed | Intent | Expected (V1 behavior) | Actual (V2 stored) |
|---|---|---|---|---|
| `18-A-enUS-mmdd` | `03/15/2026` | March 15, 2026 (US format) | March 15, 2026 | March 15, 2026 (✓ control passes) |
| `18-A-enUS-iso` | `2026-03-15` | March 15, 2026 (ISO) | March 15, 2026 OR rejected | `0315-02-02T03:06:28.000Z` (catastrophic misparse) |
| `18-A-enUS-ambiguous` | `03/04/2026` | March 4 (US) or April 3 (LATAM) | Per Culture: enUS → March 4 | March 4, 2026 (✓ correct for enUS) |
| `18-A-enUS-ddmm` | `15/03/2026` | March 15 (DD/MM intent) | Rejected (month=15 invalid) OR March 15 if Culture-aware | **May 3, 2026** (silently stored) |
| `18-A-enUS-invalid` | `15/15/2026` | Invalid (no Culture) | Rejected | **May 15, 2027** (silently stored) |

### How to read Expected vs Actual

**Expected:** the platform either accepts a Culture-appropriate parse, or rejects the input with a validation error.
**Actual:** any digits are accepted and `new Date(Y, M-1, D)` is invoked. JS silently overflow-normalizes (e.g., month 15 → 1+14 → February 14 months later → May of next year cycle).

## Reproductions

### Reproduction A — DD/MM intent stored as DD-rolled-forward date

1. Open the `Date Test Harness` form on https://vv5dev.visualvault.com (Culture = enUS).
2. Click into the Config A field (date-only, TZ-aware) — `Field7` / `dateTzAwareV2Empty`.
3. Type `15/03/2026` and press Tab to commit.
4. Observe: the field shows `05/03/2026` (May 3) instead of rejecting or showing March 15.
5. Save the form. Read back via `getValueObjectValue(field)` or via the API.
6. **Stored value:** `2026-05-03T03:00:00.000Z` (May 3 BRT-midnight in UTC). The user's intended March 15 is gone, replaced silently with May 3.

### Reproduction B — Hyphenated ISO catastrophic misparse

1. Same form, same field.
2. Type `2026-03-15` directly into the MM/DD/YYYY segments.
3. Tab off the field.
4. **Stored value:** `0315-02-02T03:06:28.000Z` — a year-315 date with bizarre month/day/time. The year segment captured the first four digits `0315` (after the hyphens were ignored); the remaining digits redistributed across the other segments.

### Reproduction C — Out-of-range overflow

1. Same form, same field.
2. Type `15/15/2026` (clearly invalid in any culture).
3. Tab off the field.
4. **Stored value:** `2026-05-15T03:00:00.000Z` (May 15, 2027 — month 15 → +14 months from January). No error is raised.

## Concrete values by timezone

The bug's parsing is JS-level and not directly TZ-dependent — but the *stored* value reflects the user's TZ via the `T03:00:00.000Z` (BRT-midnight UTC) suffix. The misparse mechanism is identical across TZs:

| Input | Browser TZ | Stored value (V2) |
|---|---|---|
| `15/03/2026` | BRT (UTC-3) | `2026-05-03T03:00:00.000Z` |
| `15/03/2026` | IST (UTC+5:30) | `2026-05-02T18:30:00.000Z` (same May 3 local; UTC offset shifts the stored value) |
| `15/03/2026` | UTC | `2026-05-03T00:00:00.000Z` |

The misparsed *calendar date* (May 3) is consistent across TZs; the time-of-day suffix shifts.

## Workaround

1. **Enforce Culture consistency.** If the user population enters dates in DD/MM format (LATAM, EU), set the Customer Culture accordingly so Kendo's segments are labeled and parsed correctly.
2. **Validate at the application layer.** Add a script-level validator that rejects out-of-range months and days *before* relying on the stored value.
3. **Avoid typed input on V2 for Culture-mismatched users.** Use the calendar popup or `SetFieldValue()` with an ISO string — both bypass the segmented-typing pipeline and avoid the overflow.

## Status / Test evidence

- **First confirmed:** 2026-04-22 on build `20260418.1` (vv5dev cat-18 enUS Culture baseline).
- **Test slots:** `18-A-enUS-mmdd`, `18-A-enUS-iso`, `18-A-enUS-ambiguous`, `18-A-enUS-ddmm`, `18-A-enUS-invalid` — all PASS the regression (the *expected* values in test-data.js encode the buggy behavior, so PASS = bug confirmed reproducing).
- **Spec:** [`testing/specs/date-handling/cat-18-culture.spec.js`](../../../../testing/specs/date-handling/cat-18-culture.spec.js)
- **Test data:** [`testing/fixtures/test-data.js:10686-10774`](../../../../testing/fixtures/test-data.js#L10686-L10774)
- **Research doc:** None yet — entry only in [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).
- **Root cause hypothesis:** Kendo v2's segmented `<input>` does no per-segment range validation; the values are passed verbatim to `new Date(Y, M-1, D)` which silently overflows.

## References

- Catalog entry: [v2-bugs-catalog.md § A.8](../v2-bugs-catalog.md)
- Known-bugs reference: [docs/reference/form-fields.md](../../../../docs/reference/form-fields.md)
- Related V2 typed-input bug: [v2-config-d-typed-empty.md](v2-config-d-typed-empty.md) — Config D's typed input doesn't even commit (different failure mode on the same Cat-18 sweep)
