# TC-9-E-any — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-9-E-any.md](../test-cases/tc-9-E-any.md) | **Summary**: [summary](../summaries/tc-9-E-any.md)

## Environment

| Parameter   | Value                                          |
| ----------- | ---------------------------------------------- |
| Date        | 2026-04-03                                     |
| Browser     | Chromium (Playwright headless)                 |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                |
| Code path   | V1 (useUpdatedCalendarValueLogic = false)      |
| Platform    | VisualVault FormViewer                         |
| Test Method | Playwright CLI (timezoneId: America/Sao_Paulo) |

## Preconditions Verified

- [x] TZ confirmed America/Sao_Paulo (UTC-3)
- [x] V1 code path active (useUpdatedCalendarValueLogic = false)
- [x] Field12 (Config E) located and accessible

## Step Results

| Step #                          | Expected     | Actual       | Match |
| ------------------------------- | ------------ | ------------ | ----- |
| initRaw (GFV)                   | "2026-03-15" | "2026-03-15" | PASS  |
| finalRaw (GFV after round-trip) | "2026-03-15" | "2026-03-15" | PASS  |
| finalApi                        | —            | "2026-03-15" | —     |

## Outcome

PASS — Legacy date-only 0 drift. Same as Config A/B in BRT.

## Findings

Legacy date-only Config E is immune to Bug #5. enableTime=false prevents fake Z suffix. Round-trip stable.
