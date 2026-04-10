# WS-9 — Batch Run 1 | 2026-04-03 | BRT | 0P/16F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | America/Sao_Paulo (BRT) via `TZ=` env var    |
| Test Method    | `run-ws-test.js --action WS-9 --configs ...` |

## Results

| ID                  | Config | Sent | Expected | Actual Stored            | Match | Status   |
| ------------------- | :----: | ---- | -------- | ------------------------ | :---: | -------- |
| ws-9-A-iso-BRT      |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-C-iso-BRT      |   C    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-us-BRT       |   A    | —    | —        | `"2026-03-15T03:00:00Z"` |   ✗   | **FAIL** |
| ws-9-C-us-BRT       |   C    | —    | —        | `"2026-03-15T03:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-parts-BRT    |   A    | —    | —        | `"2026-03-15T03:00:00Z"` |   ✗   | **FAIL** |
| ws-9-C-parts-BRT    |   C    | —    | —        | `"2026-03-15T03:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-utc-BRT      |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-C-utc-BRT      |   C    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-arith-BRT    |   A    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-C-arith-BRT    |   C    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-arithUTC-BRT |   A    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-C-arithUTC-BRT |   C    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-safe-BRT     |   A    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-C-safe-BRT     |   C    | —    | —        | `"2026-04-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-A-locale-BRT   |   A    | —    | —        | `"2026-03-14T00:00:00Z"` |   ✗   | **FAIL** |
| ws-9-C-locale-BRT   |   C    | —    | —        | `"2026-03-14T00:00:00Z"` |   ✗   | **FAIL** |

## Outcome

**0 PASS, 16 FAIL** out of 16 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-9 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- Failures are consistent with known expected behavior from initial test execution
