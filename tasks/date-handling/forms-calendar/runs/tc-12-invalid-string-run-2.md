# TC-12-invalid-string — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-12-invalid-string.md](../test-cases/tc-12-invalid-string.md) | **Summary**: [summary](../summaries/tc-12-invalid-string.md)

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
| raw    | `""`     | `"Invalid Date"`                   | **FAIL** |
| api    | `""`     | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #6. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-12-invalid-string
- Expected failure — Bug #6
- API value not captured — test stopped at raw value assertion failure
- Test context: Invalid input silently ignored by normalizeCalValue(). Field stays empty → Bug #6 fires on empty state. No error thrown.
