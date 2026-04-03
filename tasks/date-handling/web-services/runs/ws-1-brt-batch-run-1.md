# WS-1 — Batch Run 1 | 2026-04-03 | BRT | 8P/0F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | America/Sao_Paulo (BRT) via `TZ=` env var    |
| Test Method    | `run-ws-test.js --action WS-1 --configs ...` |

## Results

| ID         | Config | Sent                    | Expected                 | Actual Stored            | Match | Status |
| ---------- | :----: | ----------------------- | ------------------------ | ------------------------ | :---: | ------ |
| ws-1-A-BRT |   A    | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` |   ✓   | PASS   |
| ws-1-B-BRT |   B    | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` |   ✓   | PASS   |
| ws-1-E-BRT |   E    | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` |   ✓   | PASS   |
| ws-1-F-BRT |   F    | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` |   ✓   | PASS   |
| ws-1-C-BRT |   C    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` |   ✓   | PASS   |
| ws-1-D-BRT |   D    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` |   ✓   | PASS   |
| ws-1-G-BRT |   G    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` |   ✓   | PASS   |
| ws-1-H-BRT |   H    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` |   ✓   | PASS   |

## Outcome

**8 PASS, 0 FAIL** out of 8 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-1 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- All configs pass — no regressions detected
