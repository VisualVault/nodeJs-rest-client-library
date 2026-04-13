# TC-14-C-save — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-14-C-save.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-C-save.md) | **Summary**: [summary](../summaries/tc-14-C-save.md)

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
| Field | filter enableTime=true, ignoreTimezone=false, useLegacy=false | `["Field6"]` ✓ |

## Step Results

| Step # | Expected | Actual | Match |
|---|---|---|---|
| Pre-save raw | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS |
| Post-reload raw | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS |
| Post-reload api | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS |

## Outcome

**PASS** — Save round-trip preserves value. Raw stays local midnight, API converts to UTC correctly.

## Findings

- Save does not mutate the stored value — post-reload raw matches pre-save raw
- API value consistent before and after save
- Form: zzzDATETEST-000787, DataID: 9b009fe3-0daa-4367-a274-dccde23de273
