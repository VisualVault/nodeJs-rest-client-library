# TC-8-C-empty — Run 3 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-8-C-empty.md](../test-cases/tc-8-C-empty.md) | **Summary**: [summary](../summaries/tc-8-C-empty.md)

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

| Step # | Expected | Actual                             | Match    |
| ------ | -------- | ---------------------------------- | -------- |
| raw    | `""`     | `"ERROR: Invalid time value"`      | **FAIL** |
| api    | `""`     | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #6. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-8-C-empty
- Expected failure — Bug #6
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #6 variant — GFV THROWS RangeError instead of returning "". Correct: empty string. new Date("").toISOString() throws.
