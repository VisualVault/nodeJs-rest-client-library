# TC-14-D-save — Run 1 | 2026-04-13 | BRT | FAIL-3

**Spec**: [tc-14-D-save.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-save.md) | **Summary**: [summary](../summaries/tc-14-D-save.md)

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
| Pre-save raw | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS |
| Post-reload raw | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS |
| Post-reload api | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | FAIL |

## Outcome

**FAIL-3** — Bug #5: ignoreTimezone=true should return bare local datetime from API, but `.000Z` suffix is appended.

## Findings

- Raw value survives save round-trip correctly — no mutation
- The bug is strictly at the API serialization layer, not in the calendar or form save logic
- Form: zzzDATETEST-000787, DataID: 9b009fe3-0daa-4367-a274-dccde23de273
