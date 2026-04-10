# TC-1-F-BRT — Run 2 | 2026-04-06 | BRT | FAIL-1

**Spec**: [tc-1-F-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-F-BRT.md) | **Summary**: [summary](../summaries/tc-1-F-BRT.md)

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

| Step # | Expected       | Actual                       | Match    |
| ------ | -------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15"` | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| api    | `"2026-03-15"` | `"2026-03-15T03:00:00.000Z"` | **FAIL** |

## Outcome

**FAIL-1** — Confirms run-1 (2026-03-31). Legacy popup stores UTC datetime; `ignoreTZ` has no effect on the legacy popup path. Cross-category: TC-2-F-BRT stores `"2026-03-15"`.

## Audit Note

Bug #2 audit run. Values match run-1. Config F (ignoreTZ=true) behaves identically to Config E — ignoreTZ is a no-op on the legacy popup code path.
