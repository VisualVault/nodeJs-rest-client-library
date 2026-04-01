# TC-9-D-BRT-8 — Config D, GFV Round-Trip ×8, BRT: -24h cumulative drift, full day lost (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15` baseline, 8 GFV round-trips in BRT — each trip drifts -3h (Bug #5)         |

---

## Preconditions

Same as [tc-9-D-BRT-1.md](tc-9-D-BRT-1.md) P1–P6.

---

## Test Steps

| #   | Action                                          | Test Data                                                                               | Expected Result                                            | ✓   |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --- |
| 1   | Complete setup                                  | See Preconditions P1–P6                                                                 | All P1–P6 checks pass                                      | ☐   |
| 2   | Set baseline value (DevTools console)           | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                          | Field displays `03/15/2026 12:00 AM`                       | ☐   |
| 3   | Capture baseline raw (DevTools console)         | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                          | `"2026-03-15T00:00:00"`                                    | ☐   |
| 4   | Capture baseline GFV (DevTools console)         | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                 | `"2026-03-15T00:00:00"` — raw unchanged (correct behavior) | ☐   |
| 5   | Execute 8 GFV round-trips in sequence (console) | Loop 8×: `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error; capture raw after each trip                      | ☐   |
| 6   | Capture display after 8 trips                   | —                                                                                       | `03/15/2026 12:00 AM` — no drift (correct behavior)        | ☐   |
| 7   | Capture raw after 8 trips (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                          | `"2026-03-15T00:00:00"` — no drift (correct behavior)      | ☐   |
| 8   | Capture GFV after 8 trips (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                 | `"2026-03-15T00:00:00"` — same as raw (correct behavior)   | ☐   |
| 9   | Confirm browser timezone (DevTools console)     | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                          | `"2026-03-15T03:00:00.000Z"` — confirms BRT active         | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 cumulative drift — full day lost after 8 trips):**
Step 7 returns `"2026-03-14T00:00:00"` — exactly -24h from the original.

- Interpretation: Bug #5 caused -3h per trip × 8 trips = -24h. The calendar date shifted from March 15 to March 14. Trip-by-trip progression: `-3h → -6h → -9h → -12h → -15h → -18h → -21h → -24h`. A production script calling `SetFieldValue(GetFieldValue())` once per day would lose one calendar day every 8 executions.

**FAIL-2 (GFV fake Z confirmed at baseline):**
Step 4 returns `"2026-03-15T00:00:00.000Z"` — fake Z present from the first GFV call.

- Interpretation: Bug #5 active. All subsequent round-trips will compound the drift.

---

## Related

| Reference              | Location                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `9-D-BRT-8`                                 |
| Run file               | [`../runs/tc-9-D-BRT-8-run-1.md`](../runs/tc-9-D-BRT-8-run-1.md) |
| Summary                | [`../summaries/tc-9-D-BRT-8.md`](../summaries/tc-9-D-BRT-8.md)   |
| Single-trip: 9-D-BRT-1 | [`tc-9-D-BRT-1.md`](tc-9-D-BRT-1.md) — -3h after 1 trip          |
| 10-trip: 9-D-BRT-10    | [`tc-9-D-BRT-10.md`](tc-9-D-BRT-10.md) — -30h after 10 trips     |
| Bug #5 analysis        | `../analysis.md` — Bug #5                                        |
