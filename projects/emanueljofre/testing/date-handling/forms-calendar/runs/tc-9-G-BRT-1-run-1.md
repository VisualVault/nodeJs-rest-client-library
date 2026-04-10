# TC-9-G-BRT-1 — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-9-G-BRT-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-G-BRT-1.md) | **Summary**: [summary](../summaries/tc-9-G-BRT-1.md)

## Environment

| Parameter   | Value                                          |
| ----------- | ---------------------------------------------- |
| Date        | 2026-04-03                                     |
| Browser     | Chromium (Playwright headless)                 |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                |
| Code path   | V1 (useUpdatedCalendarValueLogic = false)      |
| Platform    | VisualVault FormViewer                         |
| Test Method | Playwright CLI (timezoneId: America/Sao_Paulo) |

## Preconditions Verified

- [x] TZ confirmed America/Sao_Paulo (UTC-3)
- [x] V1 code path active (useUpdatedCalendarValueLogic = false)
- [x] Field14 (Config G) located and accessible

## Step Results

| Step #                      | Expected              | Actual                | Match |
| --------------------------- | --------------------- | --------------------- | ----- |
| initRaw (GFV)               | "2026-03-15T00:00:00" | "2026-03-15T00:00:00" | PASS  |
| finalRaw (GFV after 1 trip) | "2026-03-15T00:00:00" | "2026-03-15T00:00:00" | PASS  |
| finalApi                    | —                     | "2026-03-15T00:00:00" | —     |

## Outcome

PASS — Legacy DateTime GFV returns raw. Round-trip stable.

## Findings

Config G GFV returns raw (useLegacy bypasses non-legacy branch). No UTC conversion, no fake Z. Contrasts Config D where fake Z causes drift.
