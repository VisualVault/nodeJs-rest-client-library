# TC-5-A-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-5-A-IST.md](../test-cases/tc-5-A-IST.md) | **Summary**: [summary](../summaries/tc-5-A-IST.md)

## Environment

| Parameter   | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                  |
| Browser     | Firefox (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                 |
| Platform    | VisualVault FormViewer                                                      |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-firefox`) |

## Step Results

| Step # | Expected       | Actual                       | Match    |
| ------ | -------------- | ---------------------------- | -------- |
| raw    | `"2026-03-01"` | `"2026-02-28T18:30:00.000Z"` | **FAIL** |
| api    | `"2026-03-01"` | `"not captured"`             | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-5-A-IST
- Expected failure — Bug #7
- Test context: Config A preset in IST. Bug #7 on init path: moment("2026-03-01").toDate() → IST midnight → Feb 28 UTC. Display correct (03/01/2026) but internal UTC date wrong. Save would store "2026-02-28".
