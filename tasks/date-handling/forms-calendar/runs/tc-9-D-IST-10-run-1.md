# TC-9-D-IST-10 — Run 1 | 2026-04-03 | IST | FAIL

**Spec**: [tc-9-D-IST-10.md](../test-cases/tc-9-D-IST-10.md) | **Summary**: [summary](../summaries/tc-9-D-IST-10.md)

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

| Step #                        | Expected              | Actual                     | Match |
| ----------------------------- | --------------------- | -------------------------- | ----- |
| initRaw (GFV)                 | "2026-03-15T00:00:00" | "2026-03-15T00:00:00"      | PASS  |
| finalRaw (GFV after 10 trips) | "2026-03-15T00:00:00" | "2026-03-17T07:00:00"      | FAIL  |
| finalApi                      | —                     | "2026-03-17T07:00:00.000Z" | —     |

## Outcome

FAIL — Bug #5: 10 x +5:30h = +55h. >2 days forward. Mar 15 -> Mar 17 07:00.

## Findings

10 round trips at IST (+5:30) accumulate +55h of forward drift. More than 2 full days gained. Mirrors BRT-10 (which is -30h in the opposite direction).
