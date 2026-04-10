# WS-6 — Batch Run 2 | 2026-04-03 | BRT | 0P/12F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | America/Sao_Paulo (BRT) via `TZ=` env var    |
| Test Method    | `run-ws-test.js --action WS-6 --configs ...` |

## Results

| ID         | Config | Sent                     | Expected | Actual Stored | Match | Status   |
| ---------- | :----: | ------------------------ | -------- | ------------- | :---: | -------- |
| ws-6-A-BRT |   A    | `""`                     | —        | `null`        |   ✗   | **FAIL** |
| ws-6-D-BRT |   D    | `""`                     | —        | `null`        |   ✗   | **FAIL** |
| ws-6-A-BRT |   A    | —                        | —        | `null`        |   ✗   | **FAIL** |
| ws-6-D-BRT |   D    | —                        | —        | `null`        |   ✗   | **FAIL** |
| ws-6-A-BRT |   A    | —                        | —        | `null`        |   ✗   | **FAIL** |
| ws-6-D-BRT |   D    | —                        | —        | `null`        |   ✗   | **FAIL** |
| ws-6-A-BRT |   A    | `"null"`                 | —        | `null`        |   ✗   | **FAIL** |
| ws-6-D-BRT |   D    | `"null"`                 | —        | `null`        |   ✗   | **FAIL** |
| ws-6-A-BRT |   A    | `"Invalid Date"`         | —        | `null`        |   ✗   | **FAIL** |
| ws-6-D-BRT |   D    | `"Invalid Date"`         | —        | `null`        |   ✗   | **FAIL** |
| ws-6-A-BRT |   A    | `""2026-03-15" then """` | —        | `null`        |   ✗   | **FAIL** |
| ws-6-D-BRT |   D    | `""2026-03-15" then """` | —        | `null`        |   ✗   | **FAIL** |

## Outcome

**0 PASS, 12 FAIL** out of 12 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-6 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- Failures are consistent with known expected behavior from initial test execution
