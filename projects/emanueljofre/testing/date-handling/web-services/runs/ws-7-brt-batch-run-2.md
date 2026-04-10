# WS-7 — Batch Run 2 | 2026-04-03 | BRT | 6P/6F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | America/Sao_Paulo (BRT) via `TZ=` env var    |
| Test Method    | `run-ws-test.js --action WS-7 --configs ...` |

## Results

| ID         | Config | Sent | Expected | Actual Stored            | Match | Status   |
| ---------- | :----: | ---- | -------- | ------------------------ | :---: | -------- |
| ws-7-A-BRT |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-7-A-BRT |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-7-A-BRT |   A    | —    | —        | `"2026-03-15T00:00:00Z"` |   ✗   | **FAIL** |
| ws-7-C-BRT |   C    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✓   | PASS     |
| ws-7-C-BRT |   C    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✗   | **FAIL** |
| ws-7-C-BRT |   C    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✓   | PASS     |
| ws-7-D-BRT |   D    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✓   | PASS     |
| ws-7-D-BRT |   D    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✗   | **FAIL** |
| ws-7-D-BRT |   D    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✓   | PASS     |
| ws-7-H-BRT |   H    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✓   | PASS     |
| ws-7-H-BRT |   H    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✗   | **FAIL** |
| ws-7-H-BRT |   H    | —    | —        | `"2026-03-15T14:30:00Z"` |   ✓   | PASS     |

## Outcome

**6 PASS, 6 FAIL** out of 12 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-7 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- Failures are consistent with known expected behavior from initial test execution
