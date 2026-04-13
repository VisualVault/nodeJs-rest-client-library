# TC-16-D-SFV — Run 1 | 2026-04-13 | BRT | PARTIAL (FAIL-3 Bug #5)

**Spec**: [tc-16-D-SFV.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-D-SFV.md) | **Summary**: [summary](../summaries/tc-16-D-SFV.md)

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
| Field | filter enableTime=true, ignoreTimezone=true, useLegacy=false | `["Field5"]` ✓ |

## Step Results — Phase A (vv5dev)

| Step # | Expected | Actual | Match |
|---|---|---|---|
| 3 | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PASS |
| 4 | `"2026-03-15T14:30:00.000Z"` (fake Z) | `"2026-03-15T14:30:00.000Z"` | PASS (FORM-BUG-5) |
| 6 | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | PASS |

## Step Results — Phase B (vvdemo)

Not yet executed. Awaiting vvdemo half.

## Outcome

**PARTIAL (FAIL-3 Bug #5 on client)** — vv5dev half complete. Config D DateTime+iTZ: pre-save raw=`"2026-03-15T14:30:00"`, client GetFieldValue=`"2026-03-15T14:30:00.000Z"` (fake Z, FORM-BUG-5). API response field5=`"2026-03-15T14:30:00Z"`. Awaiting vvdemo half for cross-env comparison.

## Bug Surface

**FORM-BUG-5** — GetFieldValue fake Z suffix. Client-side `toISOString()` appends Z to a timezone-ambiguous value, making local time appear UTC. Known bug, documented in `tasks/date-handling/forms-calendar/analysis/bug-5-fake-z-drift.md`.
