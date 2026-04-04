# TC-9-D-IST-8 — Run 1 | 2026-04-03 | IST | FAIL

**Spec**: [tc-9-D-IST-8.md](../test-cases/tc-9-D-IST-8.md) | **Summary**: [summary](../summaries/tc-9-D-IST-8.md)

## Environment

| Parameter   | Value                                      |
| ----------- | ------------------------------------------ |
| Date        | 2026-04-03                                 |
| Browser     | Chromium (Playwright headless)             |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)             |
| Code path   | V1 (useUpdatedCalendarValueLogic = false)  |
| Platform    | VisualVault FormViewer                     |
| Test Method | Playwright CLI (timezoneId: Asia/Calcutta) |

## Preconditions Verified

- [x] TZ confirmed Asia/Calcutta (UTC+5:30)
- [x] V1 code path active (useUpdatedCalendarValueLogic = false)
- [x] Field5 (Config D) located and accessible

## Step Results

| Step #                       | Expected              | Actual                     | Match |
| ---------------------------- | --------------------- | -------------------------- | ----- |
| initRaw (GFV)                | "2026-03-15T00:00:00" | "2026-03-15T00:00:00"      | PASS  |
| finalRaw (GFV after 8 trips) | "2026-03-15T00:00:00" | "2026-03-16T20:00:00"      | FAIL  |
| finalApi                     | —                     | "2026-03-16T20:00:00.000Z" | —     |

## Outcome

FAIL — Bug #5: 8 x +5:30h = +44h. Nearly 2 days gained. Mar 15 -> Mar 16 20:00.

## Findings

8 round trips at IST (+5:30) accumulate +44h of forward drift. Nearly 2 full days gained, crossing the Mar 16 date boundary.
