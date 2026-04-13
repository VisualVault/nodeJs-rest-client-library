# TC-14-D-popup — Config D, Calendar Popup, BRT: local midnight stored; fake Z in API (FORM-BUG-5)

## Environment Specs

| Parameter           | Required Value                                                                          |
| ------------------- | --------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                         |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                             |
| Target Field Config | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| Scenario            | `2026-03-15`, BRT midnight via calendar popup — stored as local `T00:00:00` (ignoreTZ)  |

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
// PASS: output contains GMT-0300
// FAIL: any other offset — abort
```

**P4 — Open the DateTest form template:**

```
/FormViewer/app?hidemenu=true&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d&xcid=WADNR&xcdid=fpOnline
```

**P5 — Verify code path:**

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1
```

**P6 — Locate the target field:**

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field5"]
```

## Test Steps

### Phase A — Unmasked Baseline

| #   | Action                                   | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                           | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Click calendar icon next to target field | —                                                              | Calendar popup opens showing Date tab              | ☐   |
| 3   | Navigate to March 2026                   | Click month header → select March                              | March 2026 calendar grid visible                   | ☐   |
| 4   | Click day 15                             | Click gridcell "15"                                            | Popup auto-advances to Time tab, shows `12:00 AM`  | ☐   |
| 5   | Click Set button                         | —                                                              | Popup closes, field shows `03/15/2026 12:00 AM`    | ☐   |
| 6   | Capture raw stored value                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                            | ☐   |
| 7   | Capture API return value                 | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"`                            | ☐   |
| 8   | Verify BRT active                        | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Step 7 — correct behavior:** GetFieldValue should return `"2026-03-15T00:00:00"` without Z. Config D (ignoreTZ=true) stores local time and should not apply UTC conversion.

### Phase C — With Mask (future)

| #   | Action                                | Test Data                                                      | Expected Result                  | ✓   |
| --- | ------------------------------------- | -------------------------------------------------------------- | -------------------------------- | --- |
| 9   | Add mask, open fresh form, open popup | Form Designer                                                  | Mask applied                     | ☐   |
| 10  | Select March 15, click Set            | Same as Steps 3-5                                              | Date selected                    | ☐   |
| 11  | Capture raw                           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`          | ☐   |
| 12  | Capture API                           | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"`          | ☐   |
| 13  | Compare                               | Steps 6-7 vs 11-12                                             | Identical — mask is display-only | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.

**FAIL-2 (V2 active):** Abort.

**FAIL-3 (FORM-BUG-5 — fake Z in API):** GetFieldValue returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`. FORM-BUG-5 appends literal Z to ignoreTZ values. Step 7 will show this.

- Interpretation: FORM-BUG-5 confirmed. For midnight specifically, the fake Z has no practical impact on the date (midnight UTC = midnight local when the time is 00:00:00), but it signals the API contract violation that causes drift at non-zero times.

**FAIL-4 (Mask hides time picker — Phase C):** Time tab not shown when mask is `MM/dd/yyyy`. Document what time value is stored.

**FAIL-5 (Mask changes storage — Phase C):** Raw value differs from Phase A. Critical.

## Related

| Reference   | Location                             |
| ----------- | ------------------------------------ |
| Matrix row  | `matrix.md` — row `14-D-popup`       |
| FORM-BUG-5  | `analysis/bug-5-fake-z-drift.md`     |
| Sibling TCs | `tc-14-C-popup.md`, `tc-14-D-SFV.md` |
