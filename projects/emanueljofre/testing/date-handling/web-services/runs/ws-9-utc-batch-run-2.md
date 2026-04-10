# WS-9 — Batch Run 2 | 2026-04-03 | UTC | 0P/8F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | UTC (UTC) via `TZ=` env var                  |
| Test Method    | `run-ws-test.js --action WS-9 --configs ...` |

## Results

| ID                  | Config | Sent | Expected | Actual Stored            | Match | Status   |
| ------------------- | :----: | ---- | -------- | ------------------------ | :---: | -------- |
| ws-9-A-iso-UTC      |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-us-UTC       |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-parts-UTC    |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-utc-UTC      |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-arith-UTC    |   A    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-arithUTC-UTC |   A    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-safe-UTC     |   A    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-locale-UTC   |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |

## Outcome

**0 PASS, 8 FAIL** out of 8 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-9 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- Failures are consistent with known expected behavior from initial test execution
