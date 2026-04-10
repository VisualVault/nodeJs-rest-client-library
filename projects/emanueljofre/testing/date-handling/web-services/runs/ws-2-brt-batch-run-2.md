# WS-2 — Batch Run 2 | 2026-04-03 | BRT | 6P/2F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | America/Sao_Paulo (BRT) via `TZ=` env var    |
| Test Method    | `run-ws-test.js --action WS-2 --configs ...` |

## Results

| ID         | Config | Sent | Expected                             | Actual Stored | Match | Status   |
| ---------- | :----: | ---- | ------------------------------------ | ------------- | :---: | -------- |
| ws-2-A-BRT |   A    | —    | `"2026-03-15T00:00:00Z"`             | `null`        |   ✗   | **FAIL** |
| ws-2-B-BRT |   B    | —    | `"null"`                             | `null`        |   ✓   | PASS     |
| ws-2-C-BRT |   C    | —    | `"null"`                             | `null`        |   ✓   | PASS     |
| ws-2-D-BRT |   D    | —    | `""2026-03-15T00:00:00Z"` (real Z)"` | `null`        |   ✗   | **FAIL** |
| ws-2-E-BRT |   E    | —    | `"null"`                             | `null`        |   ✓   | PASS     |
| ws-2-F-BRT |   F    | —    | `"null"`                             | `null`        |   ✓   | PASS     |
| ws-2-G-BRT |   G    | —    | `"null"`                             | `null`        |   ✓   | PASS     |
| ws-2-H-BRT |   H    | —    | `"null"`                             | `null`        |   ✓   | PASS     |

## Outcome

**6 PASS, 2 FAIL** out of 8 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-2 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- Failures are consistent with known expected behavior from initial test execution
