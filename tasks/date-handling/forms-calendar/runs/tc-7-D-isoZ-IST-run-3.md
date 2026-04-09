# TC-7-D-isoZ-IST — Run 3 | 2026-04-09 | IST | FAIL

**Spec**: [tc-7-D-isoZ-IST.md](../test-cases/tc-7-D-isoZ-IST.md) | **Summary**: [summary](../summaries/tc-7-D-isoZ-IST.md)

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
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T05:30:00"`            | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-7-D-isoZ-IST
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: ISO+Z input causes +5:30h shift in IST. UTC midnight parsed as IST 05:30 AM → stored as "2026-03-15T05:30:00". Developers must use ISO without Z for Config D to avoid shift.
