# WS-1 — Batch Run 2 | 2026-04-03 | IST | 4P/0F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                        |
| -------------- | -------------------------------------------- |
| Date           | 2026-04-03                                   |
| Execution Mode | Regression pipeline (`run-ws-regression.js`) |
| Server TZ      | Asia/Kolkata (IST) via `TZ=` env var         |
| Test Method    | `run-ws-test.js --action WS-1 --configs ...` |

## Results

| ID         | Config | Sent                    | Expected                 | Actual Stored            | Match | Status |
| ---------- | :----: | ----------------------- | ------------------------ | ------------------------ | :---: | ------ |
| ws-1-A-IST |   A    | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` |   ✓   | PASS   |
| ws-1-C-IST |   C    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` |   ✓   | PASS   |
| ws-1-D-IST |   D    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` |   ✓   | PASS   |
| ws-1-H-IST |   H    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` |   ✓   | PASS   |

## Outcome

**4 PASS, 0 FAIL** out of 4 configs tested.

## Findings

- Regression run via automated pipeline — verifies WS-1 behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing actual stored vs matrix Expected column
- All configs pass — no regressions detected
