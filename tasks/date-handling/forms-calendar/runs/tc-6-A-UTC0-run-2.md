# TC-6-A-UTC0 — Run 2 | 2026-04-09 | UTC0 | PASS

**Spec**: [tc-6-A-UTC0.md](../test-cases/tc-6-A-UTC0.md) | **Summary**: [summary](../summaries/tc-6-A-UTC0.md)

## Environment

| Parameter   | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Date        | 2026-04-09                                                           |
| Browser     | Chromium (Playwright headless)                                       |
| Tester TZ   | UTC — UTC+0 (UTC0)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                          |
| Platform    | VisualVault FormViewer                                               |
| Test Method | Playwright regression (`timezoneId: UTC`, `--project UTC0-chromium`) |

## Step Results

| Step # | Expected    | Actual      | Match |
| ------ | ----------- | ----------- | ----- |
| raw    | `"dynamic"` | `"dynamic"` | PASS  |
| api    | `"dynamic"` | `"dynamic"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-6-A-UTC0
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config A Current Date at UTC+0. Trivially correct — local = UTC. Completes 3-TZ spectrum for 6-A (BRT PASS, IST PASS, UTC0 PASS). No cross-midnight edge possible.
