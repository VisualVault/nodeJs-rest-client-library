# TC-5-C-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-5-C-BRT.md](../test-cases/tc-5-C-BRT.md) | **Summary**: [summary](../summaries/tc-5-C-BRT.md)

## Environment

| Parameter   | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                        |
| Browser     | Chromium (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                       |
| Platform    | VisualVault FormViewer                                                            |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-chromium`) |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-31T11:29:14.181Z"` | `"2026-03-31T11:29:14.181Z"` | PASS  |
| api    | `"2026-03-31T11:29:14.181Z"` | `"2026-03-31T11:29:14.181Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-5-C-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config C preset in BRT. DateTime + ignoreTZ=false. Raw = Date identical to initialDate ("2026-03-31T11:29:14.181Z") — DateTime presets bypass parseDateString truncation. GFV uses new Date(value).toISOString() → same real UTC ISO. TZ-independent.
