# TC-9-D-IST-10 — Config D, Round-Trip 10 trips, IST: +55h drift, >2 days forward (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).            |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15` baseline, 10 GFV round-trips in IST — each trip drifts +5:30h (Bug #5)     |

---

## Preconditions

Same as [tc-9-D-IST-8.md](tc-9-D-IST-8.md) P1–P6.

---

## Test Steps

| #   | Action                                           | Test Data                                                                                                    | Expected Result                                          | ✓   |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --- |
| 1   | Complete setup                                   | See Preconditions P1–P6                                                                                      | All P1–P6 checks pass                                    | ☐   |
| 2   | Set baseline value (DevTools console)            | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                               | Field displays `03/15/2026 12:00 AM`                     | ☐   |
| 3   | Capture baseline raw (DevTools console)          | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                               | `"2026-03-15T00:00:00"`                                  | ☐   |
| 4   | Execute 10 GFV round-trips in sequence (console) | `for (var i=0; i<10; i++) { VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>')); }` | No error                                                 | ☐   |
| 5   | Capture post-trip raw (DevTools console)         | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                               | `"2026-03-15T00:00:00"` — no drift (correct behavior)    | ☐   |
| 6   | Capture post-trip GFV (DevTools console)         | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                      | `"2026-03-15T00:00:00"` — same as raw (correct behavior) | ☐   |
| 7   | Compare raw before vs after                      | Step 3 raw vs Step 5 raw                                                                                     | Identical — `"2026-03-15T00:00:00"` (correct behavior)   | ☐   |
| 8   | Confirm browser timezone (DevTools console)      | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                               | `"2026-03-14T18:30:00.000Z"` — confirms IST active       | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 cumulative drift — +55h after 10 trips, >2 days forward):**
Step 5 returns `"2026-03-17T07:00:00"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 caused +5:30h per trip × 10 trips = +55h. The date rolled forward more than 2 full days — from March 15 midnight to March 17 at 7:00 AM. Trip milestones: Trip 5 = `+27:30h` (day boundary crossed); Trip 8 = `+44:00h` (March 16 20:00); Trip 10 = `+55:00h` (March 17 07:00). A production script calling `SetFieldValue(GetFieldValue())` in an IST environment would drift the date forward by over 2 days after just 10 round-trips.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

---

## Related

| Reference                  | Location                                                             |
| -------------------------- | -------------------------------------------------------------------- |
| Matrix row                 | `../matrix.md` — row `9-D-IST-10`                                    |
| Run file                   | [`../runs/tc-9-D-IST-10-run-1.md`](../runs/tc-9-D-IST-10-run-1.md)   |
| Summary                    | [`../summaries/tc-9-D-IST-10.md`](../summaries/tc-9-D-IST-10.md)     |
| Bug #5 analysis            | `../analysis.md` — Bug #5 (fake Z in getCalendarFieldValue)          |
| Single-trip: 9-D-IST-1     | [`tc-9-D-IST-1.md`](tc-9-D-IST-1.md) — +5:30h after 1 trip           |
| 5-trip: 9-D-IST-5          | [`tc-9-D-IST-5.md`](tc-9-D-IST-5.md) — +27:30h, day boundary crossed |
| 8-trip: 9-D-IST-8          | [`tc-9-D-IST-8.md`](tc-9-D-IST-8.md) — +44h after 8 trips            |
| BRT comparison: 9-D-BRT-10 | [`tc-9-D-BRT-10.md`](tc-9-D-BRT-10.md) — -30h (opposite direction)   |
| Field config reference     | `research/date-handling/CLAUDE.md` — Config D                        |
