# TC-3-C-IST-BRT — Run 2 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-3-C-IST-BRT.md](../test-cases/tc-3-C-IST-BRT.md) | **Summary**: [summary](../summaries/tc-3-C-IST-BRT.md)

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

| Step # | Expected                     | Actual           | Match    |
| ------ | ---------------------------- | ---------------- | -------- |
| raw    | `"2026-03-15T00:00:00"`      | `"unknown"`      | **FAIL** |
| api    | `"2026-03-14T18:30:00.000Z"` | `"not captured"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #1, Bug #4. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-3-C-IST-BRT
- Expected failure — Bug #1, Bug #4
- Test context: EXPECTED FAIL: Cross-TZ reload IST→BRT. Raw string survives ("2026-03-15T00:00:00") but GFV reinterprets as BRT midnight (T03:00:00.000Z) instead of preserving IST midnight (T18:30:00.000Z). 8.5h UTC shift due to Bug #1+#4 timezone stripping.
