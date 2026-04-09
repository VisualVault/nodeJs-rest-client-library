# TC-12-empty-Config-C — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-12-empty-Config-C.md](../test-cases/tc-12-empty-Config-C.md) | **Summary**: [summary](../summaries/tc-12-empty-Config-C.md)

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
| raw    | `""`     | `"unknown"`                        | **FAIL** |
| api    | `""`     | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #6. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-12-empty-Config-C
- Expected failure — Bug #6
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #6 variant — GFV throws RangeError. new Date("").toISOString() throws. Different from Config D "Invalid Date" string: C crashes, D returns bad data.
