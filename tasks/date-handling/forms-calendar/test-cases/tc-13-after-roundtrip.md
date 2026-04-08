# TC-13-after-roundtrip — DB Storage: Bug #5 round-trip drift persists to database; -3h after 1 trip in BRT

## Environment Specs

| Parameter           | Required Value                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable (V8 engine)                                                          |
| **System Timezone** | `America/Sao_Paulo` — UTC-3 (BRT)                                                                 |
| **Platform**        | VisualVault FormViewer, Build 20260304.1 + REST API (getForms)                                    |
| **VV Code Path**    | V1 (`useUpdatedCalendarValueLogic = false`)                                                       |
| **Target Field**    | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**        | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC             |

---

## Preconditions

**P1 — Set system timezone to `America/Sao_Paulo`** (or use Playwright `timezoneId`).

**P2 — Open the DateTest form template** (creates a fresh instance).

**P3 — Verify V1 active**: `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` = `false`.

**P4 — Locate Config D field**: `Object.values(VV.Form.VV.FormPartition.fieldMaster).filter(f => f.fieldType === 13 && f.enableTime === true && f.ignoreTimezone === true && f.useLegacy === false && f.enableInitialValue === false).map(f => f.name)` → `["Field5"]`.

---

## Test Steps

| #   | Action                    | Test Data                                                          | Expected Result                                   | ✓   |
| --- | ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- | --- |
| 1   | Complete setup            | See Preconditions P1–P4                                            | Form loaded, V1 active, Field5 identified         | ☐   |
| 2   | Set initial value         | `VV.Form.SetFieldValue('Field5', '2026-03-15')`                    | Raw: `"2026-03-15T00:00:00"`                      | ☐   |
| 3   | Capture pre-roundtrip GFV | `VV.Form.GetFieldValue('Field5')`                                  | `"2026-03-15T00:00:00.000Z"` (fake Z from Bug #5) | ☐   |
| 4   | Execute 1 round-trip      | `VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'))` | Raw shifts to `"2026-03-14T21:00:00"` (-3h)       | ☐   |
| 5   | Save the form             | Click Save button                                                  | Form saved successfully                           | ☐   |
| 6   | Read back via API         | `run-ws-test.js --action WS-2 --record-id <instance> --configs D`  | `"2026-03-14T21:00:00Z"` — drift persisted to DB  | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 drift persists to DB — expected):**
API returns `"2026-03-14T21:00:00Z"` instead of `"2026-03-15T00:00:00Z"`.

- Interpretation: The -3h drift from FORM-BUG-5 is not just a client-side display issue — it persists through the save pipeline to the database. Any subsequent read (API, dashboard, report) will see the drifted value. This confirms that each `SetFieldValue(GetFieldValue())` call in production scripts permanently corrupts the stored date.

---

## Related

| Reference                     | Location                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Matrix row                    | `../matrix.md` — row `13-after-roundtrip`                                           |
| FORM-BUG-5 analysis           | `../analysis/bug-5.md`                                                              |
| Cat 9 round-trip tests        | TC-9-D-BRT-1, TC-9-D-BRT-8 — browser-side drift measurement                         |
| Companion: multi-roundtrip-db | [`tc-13-multi-roundtrip-db.md`](tc-13-multi-roundtrip-db.md) — 8-trip full day loss |
