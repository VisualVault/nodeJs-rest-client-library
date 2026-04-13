# TC-14-D-typed — Run 1 | 2026-04-13 | BRT | FAIL-3

**Spec**: [tc-14-D-typed.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-typed.md) | **Summary**: [summary](../summaries/tc-14-D-typed.md)

## Environment

| Parameter | Value |
|---|---|
| Date | 2026-04-13 |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT) |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform | VisualVault FormViewer, Build 20260410.1 |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check | Command | Result |
|---|---|---|
| TZ | `new Date().toString()` | Contains GMT-0300 ✓ |
| V1/V2 | `useUpdatedCalendarValueLogic` | `false` → V1 ✓ |
| Field | filter enableTime=true, ignoreTimezone=true, useLegacy=false | `["Field5"]` ✓ |

## Step Results

| Step # | Expected | Actual | Match |
|---|---|---|---|
| 10 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS |
| 11 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | FAIL |

## Outcome

**FAIL-3** — Bug #5: ignoreTimezone=true should suppress UTC conversion, but API value includes `.000Z` suffix instead of bare local datetime.

## Findings

- Raw value is correct (`T00:00:00`) — typed input matches popup for Config D
- API layer appends `.000Z` regardless of ignoreTimezone setting (Bug #5)
- Form: zzzDATETEST-000786
