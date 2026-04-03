# TC-3-G-BRT-BRT — Run 2 | 2026-04-03 | BRT | PASS

**Spec**: [tc-3-G-BRT-BRT.md](../test-cases/tc-3-G-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-G-BRT-BRT.md)

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

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to prior runs.

## Findings

- Firefox verification for TC-3-G-BRT-BRT
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Legacy DateTime same-TZ reload (BRT→BRT). Value survives intact — parseDateString roundtrip stable when no Z to strip. GFV returns raw unchanged (useLegacy=true).
