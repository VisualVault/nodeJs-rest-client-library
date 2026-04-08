# TC-11-load-UTC0 — Run 1 | 2026-04-08 | UTC+0 | PASS

**Spec**: [tc-11-load-UTC0.md](../test-cases/tc-11-load-UTC0.md) | **Summary**: [summary](../summaries/tc-11-load-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-08                                  |
| Tester TZ   | Etc/GMT — UTC+0 (GMT)                       |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer                      |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                      | Result                                                                            |
| ------------ | ---------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`      | `"Wed Apr 08 2026 19:56:41 GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | useUpdatedCalendarValueLogic | `false` → V1 active ✓                                                             |
| Field lookup | Config D filter              | `["Field5"]` ✓                                                                    |
| Record       | DateTest-000080 Rev 2        | Loaded ✓                                                                          |

## Step Results

| Step # | Expected                | Actual                       | Match                                                |
| ------ | ----------------------- | ---------------------------- | ---------------------------------------------------- |
| 3      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS                                                 |
| 4      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** (fake Z present but coincidentally correct) |
| 6      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS                                                 |
| 7      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** (fake Z)                                    |

## Outcome

**PASS** — Zero drift on Config D round-trip at UTC+0. Bug #5 fake Z is present (GFV returns "...000Z") but coincidentally correct — local midnight = UTC midnight. Raw value preserved through round-trip.

## Findings

- Bug #5 fake Z IS present at UTC+0 (GFV returns ".000Z" suffix)
- But the fake Z is coincidentally correct: at UTC+0, "T00:00:00" local = "T00:00:00Z" UTC
- Round-trip produces 0 drift because SFV parses "...000Z" as UTC midnight = local midnight
- Config A also preserved: raw "2026-03-15", api "2026-03-15"
- This explains why UTC+0 users never notice Bug #5 — it's masked by the TZ alignment
- Contrast: BRT (-3h drift), IST (+5:30h drift), PST (-7h drift) — all non-zero TZs reveal the bug
- Consistent with 12-utc-0-control (also PASS at UTC+0)
