# TC-1-H-BRT — Run 2 | 2026-04-06 | BRT | FAIL-1

**Spec**: [tc-1-H-BRT.md](../test-cases/tc-1-H-BRT.md) | **Summary**: [summary](../summaries/tc-1-H-BRT.md)

## Environment

| Parameter   | Value                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| Date        | 2026-04-06                                                                                  |
| Browser     | Chromium (Playwright headless)                                                              |
| Tester TZ   | `America/Sao_Paulo` — UTC-3 (BRT)                                                           |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                                 |
| Platform    | VisualVault FormViewer                                                                      |
| Test Method | Playwright spec (`cat-1-legacy-popup.spec.js`, `--project BRT-chromium`) — Bug #2 audit run |

## Step Results

| Step # | Expected                | Actual                       | Match    |
| ------ | ----------------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | **FAIL** |

## Outcome

**FAIL-1** — Confirms run-1 (2026-03-31). Legacy DateTime + ignoreTZ popup stores raw UTC. ignoreTZ has no effect. Cross-category: TC-2-H-BRT stores `"2026-03-15T00:00:00"`.

## Audit Note

Bug #2 audit run. Config H (ignoreTZ=true) identical to Config G — ignoreTZ is a no-op on the legacy popup path, consistent with E vs F comparison.
