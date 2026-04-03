# WS-8 — Batch Run 2 | 2026-04-03 | BRT | 0P/10F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | America/Sao_Paulo (BRT) via `TZ=` env var    |
| Test Method    | `run-ws-test.js --action WS-8 --configs ...` |

## Results

| ID         | Config | Sent | Expected | Actual Stored | Match | Status   |
| ---------- | :----: | ---- | -------- | ------------- | :---: | -------- |
| ws-8-A-BRT |   A    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-A-BRT |   A    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-A-BRT |   A    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-A-BRT |   A    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-A-BRT |   A    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-C-BRT |   C    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-C-BRT |   C    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-C-BRT |   C    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-C-BRT |   C    | —    | —        | `null`        |   ✗   | **FAIL** |
| ws-8-C-BRT |   C    | —    | —        | `null`        |   ✗   | **FAIL** |

## Outcome

**0 PASS, 10 FAIL** out of 10 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-8 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- Failures are consistent with known expected behavior from initial test execution
