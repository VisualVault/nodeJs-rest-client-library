# TC-9-D-PST-1 — Run 1 | 2026-04-03 | PST | FAIL

**Spec**: [tc-9-D-PST-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-D-PST-1.md) | **Summary**: [summary](../summaries/tc-9-D-PST-1.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Browser     | Chromium (Playwright headless)                   |
| Tester TZ   | America/Los_Angeles — UTC-7 PDT (DST active)     |
| Code path   | V1 (useUpdatedCalendarValueLogic = false)        |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (timezoneId: America/Los_Angeles) |

## Preconditions Verified

- [x] TZ confirmed America/Los_Angeles (UTC-7 PDT, DST active)
- [x] V1 code path active (useUpdatedCalendarValueLogic = false)
- [x] Field5 (Config D) located and accessible

## Step Results

| Step #                      | Expected              | Actual                     | Match |
| --------------------------- | --------------------- | -------------------------- | ----- |
| initRaw (GFV)               | "2026-03-15T00:00:00" | "2026-03-15T00:00:00"      | PASS  |
| finalRaw (GFV after 1 trip) | "2026-03-15T00:00:00" | "2026-03-14T17:00:00"      | FAIL  |
| finalApi                    | —                     | "2026-03-14T17:00:00.000Z" | —     |

## Outcome

FAIL — Bug #5: 1 trip x -7h (PDT) = -7h. DST active on Mar 15 2026 (started Mar 8).

## Findings

PDT drift is -7h, not -8h (PST). Matrix prediction corrected. DST is active on Mar 15 2026 (DST started Mar 8). 3 trips at PDT would lose -21h, nearly a full day.
