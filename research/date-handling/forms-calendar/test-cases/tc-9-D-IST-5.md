# TC-9-D-IST-5 — Config D, GFV Round-Trip ×5, IST: +27:30h cumulative drift, day boundary crossed (Bug #5)

## Environment Specs

Same as [tc-9-D-IST-1.md](tc-9-D-IST-1.md). This test extends the cumulative drift to 5 trips.

---

## Preconditions

Same as [tc-9-D-IST-1.md](tc-9-D-IST-1.md) P1–P6.

---

## Test Steps

| #   | Action                                          | Test Data                                                                               | Expected Result                                     | ✓   |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- | --- |
| 1   | Complete setup                                  | See Preconditions P1–P6                                                                 | All P1–P6 checks pass                               | ☐   |
| 2   | Set baseline value (DevTools console)           | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                          | Field displays `03/15/2026 12:00 AM`                | ☐   |
| 3   | Capture baseline raw (DevTools console)         | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                          | `"2026-03-15T00:00:00"`                             | ☐   |
| 4   | Capture baseline GFV (DevTools console)         | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                 | `"2026-03-15T00:00:00"` — correct behavior          | ☐   |
| 5   | Execute 5 GFV round-trips in sequence (console) | Loop 5×: `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error; capture raw after each trip               | ☐   |
| 6   | Capture display after 5 trips                   | —                                                                                       | `03/15/2026 12:00 AM` — no drift (correct behavior) | ☐   |
| 7   | Capture raw after 5 trips (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                          | `"2026-03-15T00:00:00"` — correct behavior          | ☐   |
| 8   | Capture GFV after 5 trips (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                 | `"2026-03-15T00:00:00"` — correct behavior          | ☐   |
| 9   | Confirm browser timezone (DevTools console)     | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                          | `"2026-03-14T18:30:00.000Z"` — confirms IST active  | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 cumulative drift — +27:30h, day boundary crossed):**
Step 7 returns `"2026-03-16T03:30:00"` — the date has advanced past March 16.

- Interpretation: Bug #5 caused +5:30h per trip × 5 trips = +27:30h. Trip-by-trip: `+5:30h → +11:00h → +16:30h → +22:00h → +27:30h`. Trip 5 crosses the day boundary (>24h), landing on March 16 at 03:30 AM. In BRT the same 5 trips produce -15h (still March 14), showing the drift direction depends on TZ offset sign.

---

## Related

| Reference              | Location                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `9-D-IST-5`                                       |
| Run file               | [`../runs/tc-9-D-IST-5-run-1.md`](../runs/tc-9-D-IST-5-run-1.md)       |
| Summary                | [`../summaries/tc-9-D-IST-5.md`](../summaries/tc-9-D-IST-5.md)         |
| Single-trip: 9-D-IST-1 | [`tc-9-D-IST-1.md`](tc-9-D-IST-1.md) — +5:30h after 1 trip             |
| BRT 8-trip: 9-D-BRT-8  | [`tc-9-D-BRT-8.md`](tc-9-D-BRT-8.md) — -24h (day lost backward in BRT) |
| Bug #5 analysis        | `../analysis.md` — Bug #5                                              |
