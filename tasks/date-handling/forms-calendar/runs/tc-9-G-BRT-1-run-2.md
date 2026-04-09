# TC-9-G-BRT-1 — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-9-G-BRT-1.md](../test-cases/tc-9-G-BRT-1.md) | **Summary**: [summary](../summaries/tc-9-G-BRT-1.md)

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

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-9-G-BRT-1
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config G legacy DateTime: 0 drift. useLegacy=true GFV returns raw (no UTC conversion, no fake Z). Round-trip stable.
