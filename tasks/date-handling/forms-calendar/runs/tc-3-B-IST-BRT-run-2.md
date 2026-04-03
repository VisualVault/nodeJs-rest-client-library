# TC-3-B-IST-BRT — Run 2 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-3-B-IST-BRT.md](../test-cases/tc-3-B-IST-BRT.md) | **Summary**: [summary](../summaries/tc-3-B-IST-BRT.md)

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

| Step # | Expected       | Actual           | Match    |
| ------ | -------------- | ---------------- | -------- |
| raw    | `"2026-03-15"` | `""2026-03-14""` | **FAIL** |
| api    | `"2026-03-15"` | `"not captured"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-3-B-IST-BRT
- Expected failure — Bug #7
- Test context: EXPECTED FAIL: Bug #7 corrupted during IST save → stores "2026-03-14". Same as A-IST-BRT; ignoreTZ inert for date-only.
