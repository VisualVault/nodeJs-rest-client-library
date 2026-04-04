# TC-9-D-JST-1 — Run 1 | 2026-04-03 | JST | FAIL

**Spec**: [tc-9-D-JST-1.md](../test-cases/tc-9-D-JST-1.md) | **Summary**: [summary](../summaries/tc-9-D-JST-1.md)

## Environment

| Parameter   | Value                                     |
| ----------- | ----------------------------------------- |
| Date        | 2026-04-03                                |
| Browser     | Chromium (Playwright headless)            |
| Tester TZ   | Asia/Tokyo — UTC+9 (JST)                  |
| Code path   | V1 (useUpdatedCalendarValueLogic = false) |
| Platform    | VisualVault FormViewer                    |
| Test Method | Playwright CLI (timezoneId: Asia/Tokyo)   |

## Preconditions Verified

- [x] TZ confirmed Asia/Tokyo (UTC+9)
- [x] V1 code path active (useUpdatedCalendarValueLogic = false)
- [x] Field5 (Config D) located and accessible

## Step Results

| Step #                      | Expected              | Actual                     | Match |
| --------------------------- | --------------------- | -------------------------- | ----- |
| initRaw (GFV)               | "2026-03-15T00:00:00" | "2026-03-15T00:00:00"      | PASS  |
| finalRaw (GFV after 1 trip) | "2026-03-15T00:00:00" | "2026-03-15T09:00:00"      | FAIL  |
| finalApi                    | —                     | "2026-03-15T09:00:00.000Z" | —     |

## Outcome

FAIL — Bug #5: 1 trip x +9h = +9h. Most extreme positive drift.

## Findings

JST (UTC+9) produces the most extreme single-trip positive drift. 3 trips would gain +27h, crossing a full day boundary. Confirms drift is directly proportional to TZ offset magnitude.
