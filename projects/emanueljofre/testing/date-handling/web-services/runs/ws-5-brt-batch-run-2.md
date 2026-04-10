# WS-5 — Batch Run 2 | 2026-04-03 | BRT | 0P/3F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | America/Sao_Paulo (BRT) via `TZ=` env var    |
| Test Method    | `run-ws-test.js --action WS-5 --configs ...` |

## Results

| ID         | Config | Sent           | Expected | Actual Stored            | Match | Status   |
| ---------- | :----: | -------------- | -------- | ------------------------ | :---: | -------- |
| ws-5-A-BRT |   A    | `"2026-03-15"` | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-5-C-BRT |   C    | `"2026-03-15"` | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-5-D-BRT |   D    | `"2026-03-15"` | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |

## Outcome

**0 PASS, 3 FAIL** out of 3 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-5 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- Failures are consistent with known expected behavior from initial test execution
