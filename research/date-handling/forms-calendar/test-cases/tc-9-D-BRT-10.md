# TC-9-D-BRT-10 — Config D, GFV Round-Trip ×10, BRT: -30h cumulative drift (Bug #5)

## Environment Specs

Same as [tc-9-D-BRT-8.md](tc-9-D-BRT-8.md). This test extends the cumulative drift to 10 trips.

---

## Preconditions

Same as [tc-9-D-BRT-1.md](tc-9-D-BRT-1.md) P1–P6.

---

## Test Steps

| #   | Action                                           | Test Data                                                                                | Expected Result                                     | ✓   |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------- | --- |
| 1   | Complete setup                                   | See Preconditions P1–P6                                                                  | All P1–P6 checks pass                               | ☐   |
| 2   | Set baseline value (DevTools console)            | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                           | Field displays `03/15/2026 12:00 AM`                | ☐   |
| 3   | Capture baseline raw (DevTools console)          | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                           | `"2026-03-15T00:00:00"`                             | ☐   |
| 4   | Capture baseline GFV (DevTools console)          | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                  | `"2026-03-15T00:00:00"` — correct behavior          | ☐   |
| 5   | Execute 10 GFV round-trips in sequence (console) | Loop 10×: `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error; capture raw after each trip               | ☐   |
| 6   | Capture display after 10 trips                   | —                                                                                        | `03/15/2026 12:00 AM` — no drift (correct behavior) | ☐   |
| 7   | Capture raw after 10 trips (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                           | `"2026-03-15T00:00:00"` — correct behavior          | ☐   |
| 8   | Capture GFV after 10 trips (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                  | `"2026-03-15T00:00:00"` — correct behavior          | ☐   |
| 9   | Confirm browser timezone (DevTools console)      | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active  | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 cumulative drift — -30h after 10 trips):**
Step 7 returns `"2026-03-13T18:00:00"` — the date has drifted nearly 2 full days backward.

- Interpretation: Bug #5 caused -3h per trip × 10 trips = -30h. The calendar date shifted from March 15 to March 13 at 18:00. Trip milestones: Trip 8 = `"2026-03-14T00:00:00"` (full day lost); Trip 10 = `"2026-03-13T18:00:00"`.

---

## Related

| Reference              | Location                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| Matrix row             | `../matrix.md` — row `9-D-BRT-10`                                  |
| Run file               | [`../runs/tc-9-D-BRT-10-run-1.md`](../runs/tc-9-D-BRT-10-run-1.md) |
| Summary                | [`../summaries/tc-9-D-BRT-10.md`](../summaries/tc-9-D-BRT-10.md)   |
| Single-trip: 9-D-BRT-1 | [`tc-9-D-BRT-1.md`](tc-9-D-BRT-1.md) — -3h after 1 trip            |
| 8-trip: 9-D-BRT-8      | [`tc-9-D-BRT-8.md`](tc-9-D-BRT-8.md) — -24h (full day lost)        |
| Bug #5 analysis        | `../analysis.md` — Bug #5                                          |
