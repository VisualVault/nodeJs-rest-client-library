# TC-8-V2 — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-8-V2.md](tasks/date-handling/forms-calendar/test-cases/tc-8-V2.md) | **Summary**: [summary](../summaries/tc-8-V2.md)

## Environment

| Parameter   | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                   |
| Browser     | Chromium (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                  |
| Platform    | VisualVault FormViewer                                                       |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-chromium`) |

## Step Results

| Step # | Expected                | Actual                             | Match    |
| ------ | ----------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"`       | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — No bugs triggered. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-8-V2
- Expected failure — assertion mismatch
- API value not captured — test stopped at raw value assertion failure
- Test context: V2 code path: GFV returns raw unchanged. Bug #5 absent. V2 bypasses all GFV transformations (no UTC conv, no fake Z).
