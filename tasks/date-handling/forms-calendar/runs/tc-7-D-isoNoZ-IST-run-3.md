# TC-7-D-isoNoZ-IST — Run 3 | 2026-04-09 | IST | FAIL

**Spec**: [tc-7-D-isoNoZ-IST.md](../test-cases/tc-7-D-isoNoZ-IST.md) | **Summary**: [summary](../summaries/tc-7-D-isoNoZ-IST.md)

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

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-7-D-isoNoZ-IST
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: ISO without Z SAFE for Config D in IST. Treated as local time → stores unchanged. GFV adds fake Z (Bug #5). This is the recommended input format for Config D.
