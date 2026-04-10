# TC-13-ws-input — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-13-ws-input.md](tasks/date-handling/forms-calendar/test-cases/tc-13-ws-input.md) | **Summary**: [summary](../summaries/tc-13-ws-input.md)

## Environment

| Parameter   | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Date        | 2026-04-08                                             |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                        |
| Code path   | N/A — REST API verification                            |
| Platform    | VisualVault REST API (postForms + getForms)            |
| Test Method | `run-ws-test.js --action WS-1` + `--action WS-2` (API) |

## Preconditions Verified

| Check           | Command                                                               | Result                           |
| --------------- | --------------------------------------------------------------------- | -------------------------------- |
| API auth        | `run-ws-test.js` authentication                                       | `acquireSecurityToken Success` ✓ |
| Record creation | `--action WS-1 --configs A,B,C,D --input-date 2026-03-15 --debug`     | DateTest-001915 created ✓        |
| Record read     | `--action WS-2 --record-id DateTest-001915 --configs A,B,C,D --debug` | All 4 fields returned non-null ✓ |

## Step Results

| Step # | Expected                 | Actual                   | Match |
| ------ | ------------------------ | ------------------------ | ----- |
| 2      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | PASS  |
| 3      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | PASS  |
| 4      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | PASS  |
| 5      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | PASS  |
| 6      | All identical            | All identical            | PASS  |

## Outcome

**PASS** — All 4 configs store `"2026-03-15T00:00:00Z"` identically via the API write path (postForms). The API normalizes date inputs uniformly regardless of field configuration.

## Findings

- **Uniform storage via API**: postForms sends the date string directly to the VV server. The server stores `2026-03-15 00:00:00.000` for all configs — no config-specific transformation.
- **Contrast with browser path**: Browser-saved records show Config C storing UTC (`T03:00:00` for BRT midnight) vs Config D storing local (`T00:00:00`). This divergence is exclusively caused by the Forms Angular `getSaveValue()` pipeline — the API path never exercises it.
- **Implication**: The "mixed timezone storage" problem is a **Forms-only issue**. Dates written via the REST API are stored consistently. Developers using the API to set dates will not encounter C/D storage divergence.
- **Verification record**: DateTest-001915 (created 2026-04-08 via WS-1)
