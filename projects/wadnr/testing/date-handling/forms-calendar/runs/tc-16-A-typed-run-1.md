# TC-16-A-typed — Run 1 | 2026-04-13 | BRT | PARTIAL

**Spec**: [tc-16-A-typed.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-A-typed.md) | **Summary**: [summary](../summaries/tc-16-A-typed.md)

## Environment

| Parameter | Value |
|---|---|
| Date | 2026-04-13 |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT) |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform | VisualVault FormViewer, Build 20260410.1 |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |
| Form | zzzDATETEST-000789 |
| DataID | 8b2329fb-cf94-4db1-b6e9-a918455a1f6a |

## Preconditions Verified

| Check | Command | Result |
|---|---|---|
| TZ | `new Date().toString()` | Contains GMT-0300 ✓ |
| V1/V2 | `useUpdatedCalendarValueLogic` | `false` → V1 ✓ |
| Field | filter enableTime=false, ignoreTimezone=false, useLegacy=false | `["Field7"]` ✓ |

## Step Results — Phase A (vv5dev)

| Step # | Expected | Actual | Match |
|---|---|---|---|
| 5 | `"2026-03-15"` | `"2026-03-15"` | PASS |
| 6 | `"2026-03-15"` | `"2026-03-15"` | PASS |
| 8 | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | PASS |

## Step Results — Phase B (vvdemo)

Not yet executed. Awaiting vvdemo half.

## Outcome

**PARTIAL** — vv5dev half complete. Date-only Config A: pre-save raw=`"2026-03-15"`, api=`"2026-03-15"`. API response field7=`"2026-03-15T00:00:00Z"`. Awaiting vvdemo half for cross-env comparison.
