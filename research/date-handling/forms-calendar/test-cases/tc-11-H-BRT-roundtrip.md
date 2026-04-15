# TC-11-H-BRT-roundtrip — Config H, Multi-Trip Round-Trip, BRT: zero drift; useLegacy=true immune to FORM-BUG-5

## Environment Specs

| Parameter               | Required Value                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                               |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                      |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                               |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)               |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC  |

---

## Preconditions

**P1 — Set system timezone to `America/Sao_Paulo`:**

macOS:

```bash
sudo systemsetup -settimezone America/Sao_Paulo
```

Windows (run as Administrator):

```bat
tzutil /s "E. South America Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "E. South America Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone America/Sao_Paulo
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT-0300"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active
```

**P6 — Locate the target field by configuration** (DevTools console, after form loads):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field13"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | Field displays `03/15/2026 12:00 AM`               | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                            | ☐   |
| 4   | Capture baseline GFV (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"`                            | ☐   |
| 5   | Round-trip 1 (DevTools console)             | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                           | ☐   |
| 6   | Capture raw after trip 1 (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                            | ☐   |
| 7   | Round-trip 2 (DevTools console)             | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                           | ☐   |
| 8   | Capture raw after trip 2 (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                            | ☐   |
| 9   | Round-trip 3 (DevTools console)             | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                           | ☐   |
| 10  | Capture raw after trip 3 (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                            | ☐   |
| 11  | Capture GFV after trip 3 (DevTools console) | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"`                            | ☐   |
| 12  | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Key contrast with Config D**: The same test on Config D (`enableTime=true, ignoreTimezone=true, useLegacy=false`) drifts -3h per trip in BRT (FORM-BUG-5). After 3 trips, Config D would show `"2026-03-14T15:00:00"` (-9h total). Config H (`useLegacy=true`) should show zero drift because the legacy GFV code path returns the raw stored value without adding a fake Z suffix.

---

## Fail Conditions

**FAIL-1 (Drift detected after any trip):** Steps 6, 8, or 10 return a value other than `"2026-03-15T00:00:00"`.

- Interpretation: `useLegacy=true` does NOT prevent FORM-BUG-5 drift. This would contradict the existing evidence from `9-H-BRT-1` (1-trip PASS) and require a complete re-assessment of the legacy code path. Measure the drift magnitude — if -3h/trip, the legacy GFV is adding fake Z like Config D.

**FAIL-2 (Wrong timezone):** Step 12 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config H flags.

---

## Related

| Reference                      | Location                                                                |
| ------------------------------ | ----------------------------------------------------------------------- |
| Matrix row                     | `matrix.md` — row `11-H-BRT-roundtrip`                                  |
| Single-trip sibling: 9-H-BRT-1 | `matrix.md` — row `9-H-BRT-1` (1-trip PASS, 0 drift)                    |
| IST sibling: 9-H-IST-1         | `matrix.md` — row `9-H-IST-1` (1-trip PASS, 0 drift — TZ-independent)   |
| Config D contrast: 9-D-BRT-3   | `matrix.md` — row `9-D-BRT-3` (3-trip, -9h drift — FORM-BUG-5)          |
| Bug #5 analysis                | `analysis/overview.md` — FORM-BUG-5: Fake [Z] in GetFieldValue          |
| Legacy characterization        | `analysis/overview.md` — Appendix C: Legacy Config E-H Characterization |
| Field config reference         | `matrix.md` — Field Configurations table, Config H                      |
