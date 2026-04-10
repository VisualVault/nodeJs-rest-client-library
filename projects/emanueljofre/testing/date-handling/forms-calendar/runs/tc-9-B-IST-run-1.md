# TC-9-B-IST — Run 1 | 2026-04-03 | IST | FAIL

**Spec**: [tc-9-B-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-9-B-IST.md) | **Summary**: [summary](../summaries/tc-9-B-IST.md)

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
- [x] Field10 (Config B) located and accessible

## Step Results

| Step #                              | Expected     | Actual       | Match |
| ----------------------------------- | ------------ | ------------ | ----- |
| initRaw (GFV after initial SFV)     | "2026-03-15" | "2026-03-14" | FAIL  |
| finalRaw (GFV after round-trip SFV) | "2026-03-15" | "2026-03-13" | FAIL  |
| finalApi                            | —            | "2026-03-13" | —     |

## Outcome

FAIL — Bug #7: date-only SFV in IST loses 1 day per call. Initial SFV: "2026-03-15" -> "2026-03-14". Round-trip SFV: "2026-03-14" -> "2026-03-13".

## Findings

Bug #7 causes round-trip drift on date-only fields in UTC+. This is different from Bug #5 — it's a per-SFV-call drift, not a GFV transformation issue. Matrix prediction corrected from "0 drift" to "-1 day per SFV".
