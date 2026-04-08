# TC-13-B-storage — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-13-B-storage.md](../test-cases/tc-13-B-storage.md) | **Summary**: [summary](../summaries/tc-13-B-storage.md)

## Environment

| Parameter   | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Date        | 2026-04-08                                             |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                        |
| Code path   | N/A — REST API verification                            |
| Platform    | VisualVault REST API (postForms + getForms)            |
| Test Method | `run-ws-test.js --action WS-1` + `--action WS-2` (API) |

## Preconditions Verified

| Check           | Command                                                           | Result                           |
| --------------- | ----------------------------------------------------------------- | -------------------------------- |
| API auth        | `run-ws-test.js` authentication                                   | `acquireSecurityToken Success` ✓ |
| Record creation | `--action WS-1 --configs A,B,C,D --input-date 2026-03-15`         | DateTest-001915 created ✓        |
| Record read     | `--action WS-2 --record-id DateTest-001915 --configs A,B --debug` | Both fields returned non-null ✓  |

## Step Results

| Step # | Expected                 | Actual                   | Match |
| ------ | ------------------------ | ------------------------ | ----- |
| 2      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | PASS  |
| 3      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | PASS  |
| 4      | A = B (identical)        | A = B (identical)        | PASS  |

## Outcome

**PASS** — Config A and Config B store identical values. The `ignoreTimezone` flag has no effect on date-only field storage via the API write path. Both store `"2026-03-15T00:00:00Z"` for the same input.

## Findings

- Config B (date-only + ignoreTZ=true) is byte-identical to Config A (date-only + ignoreTZ=false) in API response
- `ignoreTZ` has no observable effect on date-only fields — the flag only matters when `enableTime=true`
- Confirmed via fresh WS-1 record (DateTest-001915) with both configs set to same input `2026-03-15`
- This matches the code analysis: `ignoreTZ` gates the `getSaveValue()` Z-stripping path, which is only relevant when a time component exists
