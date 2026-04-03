# WS-3 — Batch Run 2 | 2026-04-03 | BRT | 0P/4F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | America/Sao_Paulo (BRT) via `TZ=` env var    |
| Test Method    | `run-ws-test.js --action WS-3 --configs ...` |

## Results

| ID         | Config | Sent                    | Expected | Actual Stored | Match | Status   |
| ---------- | :----: | ----------------------- | -------- | ------------- | :---: | -------- |
| ws-3-A-BRT |   A    | `"2026-03-15"`          | —        | `null`        |   ✗   | **FAIL** |
| ws-3-C-BRT |   C    | `"2026-03-15T14:30:00"` | —        | `null`        |   ✗   | **FAIL** |
| ws-3-D-BRT |   D    | `"2026-03-15T14:30:00"` | —        | `null`        |   ✗   | **FAIL** |
| ws-3-H-BRT |   H    | `"2026-03-15T14:30:00"` | —        | `null`        |   ✗   | **FAIL** |

## Outcome

**0 PASS, 4 FAIL** out of 4 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-3 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- Failures are consistent with known expected behavior from initial test execution
