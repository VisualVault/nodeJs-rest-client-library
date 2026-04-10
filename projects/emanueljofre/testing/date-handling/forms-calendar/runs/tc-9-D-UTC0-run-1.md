# TC-9-D-UTC0 — Run 1 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-9-D-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-9-D-UTC0.md) | **Summary**: [summary](../summaries/tc-9-D-UTC0.md)

## Environment

| Parameter   | Value                                     |
| ----------- | ----------------------------------------- |
| Date        | 2026-04-03                                |
| Browser     | Chromium (Playwright headless)            |
| Tester TZ   | Etc/GMT — UTC+0                           |
| Code path   | V1 (useUpdatedCalendarValueLogic = false) |
| Platform    | VisualVault FormViewer                    |
| Test Method | Playwright CLI (timezoneId: Etc/GMT)      |

## Preconditions Verified

- [x] TZ confirmed Etc/GMT (UTC+0)
- [x] V1 code path active (useUpdatedCalendarValueLogic = false)
- [x] Field5 (Config D) located and accessible

## Step Results

| Step #                          | Expected              | Actual                     | Match |
| ------------------------------- | --------------------- | -------------------------- | ----- |
| initRaw (GFV)                   | "2026-03-15T00:00:00" | "2026-03-15T00:00:00"      | PASS  |
| finalRaw (GFV after round-trip) | "2026-03-15T00:00:00" | "2026-03-15T00:00:00"      | PASS  |
| finalApi                        | —                     | "2026-03-15T00:00:00.000Z" | —     |

## Outcome

PASS — 0 drift. Bug #5 structurally present but invisible at UTC+0.

## Findings

Bug #5 fake Z is structurally present (finalApi has .000Z suffix) but produces 0 drift because the local-to-UTC offset is 0. Coincidentally correct.
