# TC-14-C-typed — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-14-C-typed.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-C-typed.md) | **Summary**: [summary](../summaries/tc-14-C-typed.md)

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
| 10 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS |
| 11 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS |
| 12 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS |

## Outcome

**PASS** — Typed input stores local midnight, same as popup. Display: `03/15/2026 12:00 AM`.

## Findings

- Kendo v2 requires typing ALL segments (date+time+AM/PM) — typing only date leaves placeholders
- Typed input produces identical storage to popup: raw=`T00:00:00`, api converts to UTC
- Form: zzzDATETEST-000786
