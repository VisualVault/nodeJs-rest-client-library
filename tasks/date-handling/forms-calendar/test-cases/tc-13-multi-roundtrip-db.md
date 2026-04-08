# TC-13-multi-roundtrip-db — DB Storage: 8 Bug #5 round-trips lose exactly 1 calendar day (-24h drift in BRT)

## Environment Specs

| Parameter           | Required Value                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable (V8 engine)                                                          |
| **System Timezone** | `America/Sao_Paulo` — UTC-3 (BRT)                                                                 |
| **Platform**        | VisualVault FormViewer, Build 20260304.1 + REST API (getForms)                                    |
| **VV Code Path**    | V1 (`useUpdatedCalendarValueLogic = false`)                                                       |
| **Target Field**    | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**        | `2026-03-15`, BRT midnight — 8 consecutive `SetFieldValue(GetFieldValue())` round-trips           |

---

## Preconditions

**P1 — Set system timezone to `America/Sao_Paulo`** (or use Playwright `timezoneId`).

**P2 — Open the DateTest form template** (creates a fresh instance).

**P3 — Verify V1 active**: `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` = `false`.

**P4 — Locate Config D field**: → `["Field5"]`.

---

## Test Steps

| #   | Action                   | Test Data                                                         | Expected Result                                               | ✓   |
| --- | ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------- | --- |
| 1   | Complete setup           | See Preconditions P1–P4                                           | Form loaded, V1 active, Field5 identified                     | ☐   |
| 2   | Set initial value        | `VV.Form.SetFieldValue('Field5', '2026-03-15')`                   | Raw: `"2026-03-15T00:00:00"`                                  | ☐   |
| 3   | Execute 8 round-trips    | Loop: `SFV(GFV('Field5'))` × 8                                    | Progressive -3h/trip: T21→T18→T15→T12→T09→T06→T03→T00:00      | ☐   |
| 4   | Verify final browser raw | `getValueObjectValue('Field5')`                                   | `"2026-03-14T00:00:00"` — midnight March 14 (lost 1 full day) | ☐   |
| 5   | Save the form            | Click Save button                                                 | Form saved successfully                                       | ☐   |
| 6   | Read back via API        | `run-ws-test.js --action WS-2 --record-id <instance> --configs D` | `"2026-03-14T00:00:00Z"` — full day drift in DB               | ☐   |

---

## Fail Conditions

**FAIL-1 (Full day drift in DB — expected):**
API returns `"2026-03-14T00:00:00Z"` — midnight on March 14, exactly 24 hours behind the original March 15 midnight.

- Interpretation: 8 round-trips × -3h/trip = -24h total drift. The date has shifted back by exactly one calendar day. A user or script viewing this record would see "March 14" instead of "March 15" — a full day data corruption. This is the worst-case scenario for FORM-BUG-5 in BRT: the minimum number of round-trips needed to corrupt a calendar date (change the day).

---

## Related

| Reference                     | Location                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Matrix row                    | `../matrix.md` — row `13-multi-roundtrip-db`                                        |
| FORM-BUG-5 analysis           | `../analysis/bug-5.md`                                                              |
| Cat 9-D-BRT-8 (browser drift) | TC-9-D-BRT-8 — same 8-trip drift measured in browser without save                   |
| Companion: after-roundtrip    | [`tc-13-after-roundtrip.md`](tc-13-after-roundtrip.md) — single-trip DB persistence |
