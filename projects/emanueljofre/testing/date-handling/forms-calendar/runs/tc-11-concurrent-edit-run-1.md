# TC-11-concurrent-edit — Run 1 | 2026-04-08 | BRT+IST | FAIL

**Spec**: [tc-11-concurrent-edit.md](tasks/date-handling/forms-calendar/test-cases/tc-11-concurrent-edit.md) | **Summary**: [summary](../summaries/tc-11-concurrent-edit.md)

## Environment

| Parameter   | Value                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| Date        | 2026-04-08                                                                                  |
| Tester TZ   | Multi-TZ: Phase A = America/Sao_Paulo (BRT, UTC-3); Phase B = Asia/Calcutta (IST, UTC+5:30) |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                                 |
| Platform    | VisualVault FormViewer (DateTest-001917 BRT, DateTest-001918 IST)                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo` then `timezoneId: Asia/Calcutta`)           |

## Preconditions Verified

**Phase A (BRT — User A):**

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 08 2026 17:33:36 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | Config D filter                                             | `["Field5"]` ✓                                                                       |

**Phase B (IST — User B):**

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Thu Apr 09 2026 02:04:23 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | Config D filter                                             | `["Field5"]` ✓                                                                    |

## Step Results

| Step # | Expected                     | Actual                       | Match                          |
| ------ | ---------------------------- | ---------------------------- | ------------------------------ |
| 3      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS                           |
| 4      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | **FAIL** (fake Z — Bug #5)     |
| 6      | `"2026-03-15T00:00:00"`      | `"2026-03-14T21:00:00"`      | **FAIL** (-3h, day boundary)   |
| 7      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS (BRT confirmed)           |
| 10     | `"2026-03-15T00:00:00"`      | `"2026-03-14T21:00:00"`      | **FAIL** (loaded BRT-drifted)  |
| 11     | `"2026-03-15T00:00:00"`      | `"2026-03-14T21:00:00.000Z"` | **FAIL** (fake Z on drifted)   |
| 13     | `"2026-03-15T00:00:00"`      | `"2026-03-15T02:30:00"`      | **FAIL** (+2:30h net compound) |
| 14     | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS (IST confirmed)           |

## Outcome

**FAIL** — Compound drift confirmed, BRT→IST variant. Same +2:30h net as the IST→BRT variant (tc-11-D-concurrent-IST-edit), proving drift is commutative. Key difference: BRT-first crosses a day boundary in the intermediate state (March 15 → March 14 at step 6), creating a window where the record shows the wrong calendar day.

## Findings

- BRT round-trip drift: -3h (step 6: `T00:00:00` → `T21:00:00` on previous day) — crosses day boundary
- IST round-trip on drifted value: +5:30h (step 13: `T21:00:00` Mar 14 → `T02:30:00` Mar 15)
- Net compound: +2:30h — identical to IST→BRT variant, confirming commutativity
- Intermediate day-boundary crossing (BRT step 6 shows March 14) is unique to BRT-first order — any system reading the record between phases sees the wrong date
- Bug #5 confirmed active for both TZs on same field
- No corrections needed to matrix predictions — expected behavior matched
