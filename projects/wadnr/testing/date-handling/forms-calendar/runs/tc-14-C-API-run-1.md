# TC-14-C-API — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-14-C-API.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-C-API.md) | **Summary**: [summary](../summaries/tc-14-C-API.md)

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

| Step | Detail | Result |
|---|---|---|
| API endpoint | `GET /api/v1/WADNR/fpOnline/formtemplates/ff59bb37-.../forms/9b009fe3-...?expand=true` | 200 OK |
| field6 value | `"2026-03-15T00:00:00Z"` | PASS |

## Outcome

**PASS** — Server stores local midnight with `Z` appended by the JSON serializer. Config C (ignoreTimezone=false) value is correct at API level.

## Findings

- API returns `T00:00:00Z` — the server stored local midnight and the serializer appends `Z`
- This is consistent with the browser API value `T03:00:00.000Z` being a client-side UTC conversion
- Form: zzzDATETEST-000787, DataID: 9b009fe3-0daa-4367-a274-dccde23de273
