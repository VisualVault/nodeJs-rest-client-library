# TC-3-D-BRT-BRT — Run 2 | 2026-03-31 | BRT | PASS (FAIL-3 — Bug #5 active)

**Spec**: [tc-3-D-BRT-BRT.md](../test-cases/tc-3-D-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-D-BRT-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 18:32:39 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField5"]` ✓                                                                   |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 7      | `03/15/2026 12:00 AM`        | `03/15/2026 12:00 AM`        | PASS     |
| 8      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS     |
| 9      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| 10     | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS     |

> Note: Used existing saved record DateTest-000004 Rev 1 (originally saved from BRT). Step 9 FAIL matches FAIL-3 (Bug #5 — fake Z appended by GFV). The raw stored value (Step 8) is correct; the bug is only in the GFV output layer.

## Outcome

**PASS (with FAIL-3)** — Config D raw stored value survives BRT reload unchanged (`"2026-03-15T00:00:00"`). Display is correct (`03/15/2026 12:00 AM`). However, GFV returns `"2026-03-15T00:00:00.000Z"` with fake Z appended (Bug #5 confirmed on reload path). The matrix considers this PASS because the reload path introduces no _additional_ drift — Bug #5 is a pre-existing GFV defect, not a reload-specific issue.

## Findings

- **Bug #5 confirmed on reload path**: GFV returns `"2026-03-15T00:00:00.000Z"` (fake Z) instead of `"2026-03-15T00:00:00"`. This contradicts Run 1 (2026-03-27) which reported GFV returning the clean value without fake Z. The discrepancy may be due to Run 1 using a different observation method or timing.
- Raw stored value `"2026-03-15T00:00:00"` unchanged — reload path itself is safe; no additional transformation applied.
- Display `03/15/2026 12:00 AM` identical on reload — correct.
- The fake Z in GFV means any `SetFieldValue(GetFieldValue())` round-trip after reload will cause -3h drift per trip in BRT.
- Matrix status remains PASS (reload stability is the primary assertion; Bug #5 is a known pre-existing issue tracked separately).
- Next: 3-D-BRT-IST to verify Config D cross-TZ behavior.
