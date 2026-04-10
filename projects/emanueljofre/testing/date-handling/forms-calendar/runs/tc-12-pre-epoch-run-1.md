# TC-12-pre-epoch — Run 1 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-12-pre-epoch.md](tasks/date-handling/forms-calendar/test-cases/tc-12-pre-epoch.md) | **Summary**: [summary](../summaries/tc-12-pre-epoch.md)

## Environment

| Parameter   | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                       |
| Browser     | Firefox (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                      |
| Platform    | VisualVault FormViewer                                                           |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-firefox`) |

## Step Results

| Step # | Expected                | Actual                    | Match    |
| ------ | ----------------------- | ------------------------- | -------- |
| raw    | `"1969-12-31T00:00:00"` | `""1969-12-30T21:00:00""` | **FAIL** |
| api    | `"1969-12-31T00:00:00"` | `"not captured"`          | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-12-pre-epoch
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Standard -3h drift on pre-Unix-epoch date. Negative epoch handled correctly by JS Date. No special issue.
