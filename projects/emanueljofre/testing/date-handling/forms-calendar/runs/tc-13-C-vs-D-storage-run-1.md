# TC-13-C-vs-D-storage — Run 1 | 2026-04-08 | BRT | FAIL

**Spec**: [tc-13-C-vs-D-storage.md](tasks/date-handling/forms-calendar/test-cases/tc-13-C-vs-D-storage.md) | **Summary**: [summary](../summaries/tc-13-C-vs-D-storage.md)

## Environment

| Parameter   | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| Date        | 2026-04-08                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                               |
| Code path   | V1 (browser-saved records); N/A (API records)                 |
| Platform    | VisualVault REST API + Cat 3 browser evidence                 |
| Test Method | `run-ws-test.js` (API) + Cat 3 Playwright run files (browser) |

## Preconditions Verified

| Check              | Command / Source                                          | Result                           |
| ------------------ | --------------------------------------------------------- | -------------------------------- |
| API auth           | `run-ws-test.js` authentication                           | `acquireSecurityToken Success` ✓ |
| WS record          | `--action WS-1 --configs A,B,C,D --input-date 2026-03-15` | DateTest-001915 created ✓        |
| Cat 3 Config C run | `tc-3-C-BRT-BRT-run-4.md`                                 | Raw value available ✓            |
| Cat 3 Config D run | `tc-3-D-BRT-BRT-run-4.md`                                 | Raw value available ✓            |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 2      | `"2026-03-15T00:00:00Z"`     | `"2026-03-15T00:00:00Z"`     | PASS     |
| 3      | `"2026-03-15T00:00:00Z"`     | `"2026-03-15T00:00:00Z"`     | PASS     |
| 4      | C = D (API path)             | C = D ✓                      | PASS     |
| 5      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS     |
| 6      | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS     |
| 7      | C ≠ D (browser path)         | C ≠ D (3h difference) ✓      | **FAIL** |

## Outcome

**FAIL** — Mixed timezone storage confirmed. Browser-saved Config C contains real UTC (`T03:00:00` for BRT midnight), Config D contains local midnight (`T00:00:00`). API-written records store both identically.

## Findings

- **Browser path divergence**: Config C raw = `"2026-03-15T03:00:00.000Z"` (real UTC), Config D raw = `"2026-03-15T00:00:00.000Z"` (local midnight). 3-hour difference for the same input date and same browser timezone.
- **API path uniformity**: Both C and D = `"2026-03-15T00:00:00Z"` via postForms. The API server stores the input string without config-specific transformation.
- **Matrix prediction corrected**: Expected Config C = `"2026-03-14T21:00:00"`. Actual = `"2026-03-15T03:00:00"`. Prediction had wrong UTC offset direction: BRT is UTC-3, so midnight BRT = 03:00 UTC (add 3h), not 21:00 (subtract 3h).
- **Implication**: The same database column (`datetime` type) contains values in two different timezone contexts depending on the field's `ignoreTimezone` setting. SQL queries joining or comparing across these configs will produce incorrect results.
- **Code path difference**: Config C (`ignoreTimezone=false`) → `calChange()` → `toISOString()` → real UTC. Config D (`ignoreTimezone=true`) → `getSaveValue()` → `moment().format("YYYY-MM-DD[T]HH:mm:ss")` → local time stripped of Z.
