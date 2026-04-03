# TC-2-E-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-2-E-IST.md](../test-cases/tc-2-E-IST.md) | **Summary**: [summary](../summaries/tc-2-E-IST.md)

## Environment

| Parameter   | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                  |
| Browser     | Firefox (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                 |
| Platform    | VisualVault FormViewer                                                      |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-firefox`) |

## Step Results

| Step # | Expected       | Actual           | Match    |
| ------ | -------------- | ---------------- | -------- |
| raw    | `"2026-03-15"` | `"2026-03-14"`   | **FAIL** |
| api    | `"2026-03-15"` | `"not captured"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-2-E-IST
- Expected failure — Bug #7
- Test context: EXPECTED FAIL: Bug #7 in legacy typed IST. Stores "2026-03-14" (-1 day).
