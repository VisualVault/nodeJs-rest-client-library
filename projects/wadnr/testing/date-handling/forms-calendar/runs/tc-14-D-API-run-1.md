# TC-14-D-API — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-14-D-API.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-API.md) | **Summary**: [summary](../summaries/tc-14-D-API.md)

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

| Step | Detail | Result |
|---|---|---|
| API endpoint | `GET /api/v1/WADNR/fpOnline/formtemplates/ff59bb37-.../forms/9b009fe3-...?expand=true` | 200 OK |
| field5 value | `"2026-03-15T00:00:00Z"` | PASS |

## Outcome

**PASS** — Server stores Config D identically to Config C. `ignoreTimezone` has no effect at the API/server level — both configs return `T00:00:00Z`.

## Findings

- field5 (Config D) = field6 (Config C) = `"2026-03-15T00:00:00Z"` — identical server-side storage
- The ignoreTimezone flag only affects client-side JavaScript behavior, not server serialization
- This confirms Bug #5 is a client-side API layer issue, not a server-side storage issue
- Form: zzzDATETEST-000787, DataID: 9b009fe3-0daa-4367-a274-dccde23de273
