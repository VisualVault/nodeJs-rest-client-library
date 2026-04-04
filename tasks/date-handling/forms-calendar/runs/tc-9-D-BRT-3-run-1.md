# TC-9-D-BRT-3 — Run 1 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-9-D-BRT-3.md](../test-cases/tc-9-D-BRT-3.md) | **Summary**: [summary](../summaries/tc-9-D-BRT-3.md)

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
- [x] Field5 (Config D) located and accessible

## Step Results

| Step #                       | Expected              | Actual                     | Match |
| ---------------------------- | --------------------- | -------------------------- | ----- |
| initRaw (GFV)                | "2026-03-15T00:00:00" | "2026-03-15T00:00:00"      | PASS  |
| finalRaw (GFV after 3 trips) | "2026-03-15T00:00:00" | "2026-03-14T15:00:00"      | FAIL  |
| finalApi                     | —                     | "2026-03-14T15:00:00.000Z" | —     |

## Outcome

FAIL — Bug #5: 3 trips x -3h = -9h drift.

## Findings

Intermediate trip count confirms linear drift. -9h crosses midnight backward to Mar 14.
