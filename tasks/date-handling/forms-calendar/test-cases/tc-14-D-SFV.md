# TC-14-D-SFV — Config D, SetFieldValue, BRT: local datetime stored; fake Z in API (FORM-BUG-5)

## Environment Specs

| Parameter           | Required Value                                                                          |
| ------------------- | --------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                         |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                             |
| Target Field Config | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| Scenario            | `2026-03-15T14:30:00`, BRT — stored as local time (ignoreTZ prevents UTC conversion)    |

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
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template:**

```
/FormViewer/app?hidemenu=true&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d&xcid=WADNR&xcdid=fpOnline
```

**P5 — Verify code path** (DevTools console):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1, proceed
// ABORT: true → V2
```

**P6 — Locate the target field by configuration** (DevTools console):

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

| #   | Action                      | Test Data                                                      | Expected Result                                    | ✓   |
| --- | --------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set field value via console | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Field displays `03/15/2026 02:30 PM`               | ☐   |
| 3   | Capture raw stored value    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"`                            | ☐   |
| 4   | Capture API return value    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T14:30:00"`                            | ☐   |
| 5   | Verify BRT active           | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Step 4 — correct behavior:** GetFieldValue should return `"2026-03-15T14:30:00"` (same as raw, no Z suffix). The `ignoreTZ` flag means the value is timezone-agnostic.

### Phase C — With Mask (future)

| #   | Action                                        | Test Data                                                      | Expected Result                           | ✓   |
| --- | --------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- | --- |
| 6   | Add `<Mask>MM/dd/yyyy</Mask>` to target field | Form Designer                                                  | Mask applied                              | ☐   |
| 7   | Open fresh form instance                      | Navigate to template URL                                       | New form created                          | ☐   |
| 8   | Repeat Step 2 — SetFieldValue with datetime   | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Display: `03/15/2026` (time hidden)       | ☐   |
| 9   | Capture raw stored value                      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"` — time preserved? | ☐   |
| 10  | Capture API return value                      | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T14:30:00"` — no truncation?  | ☐   |
| 11  | Compare Phase A vs Phase C                    | Visual diff of Steps 3-4 vs 9-10                               | Identical — mask is display-only          | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (FORM-BUG-5 — fake Z in API):** GetFieldValue returns `"2026-03-15T14:30:00.000Z"` instead of `"2026-03-15T14:30:00"`. The `.000Z` suffix is appended by FORM-BUG-5 (getCalendarFieldValue appends literal Z to ignoreTZ values). This is the known bug — Step 4 will fail when Bug #5 is present.

- Interpretation: FORM-BUG-5 confirmed active. The raw value is correct; only the API return is affected. Round-tripping this value causes progressive -3h drift per cycle in BRT.

**FAIL-4 (Mask truncation — Phase C):** Raw value loses time component after mask is applied. Critical WADNR finding.

**FAIL-5 (Mask + Bug #5 compound — Phase C):** If mask truncates to date-only AND Bug #5 adds Z, the compound effect could produce `"2026-03-15.000Z"` or similar malformed value.

## Related

| Reference               | Location                                             |
| ----------------------- | ---------------------------------------------------- |
| Matrix row              | `matrix.md` — row `14-D-SFV`                         |
| Category 14 description | `matrix.md` § "14 — Mask Impact"                     |
| FORM-BUG-5              | `analysis/bug-5-fake-z-drift.md`                     |
| Sibling TCs             | `tc-14-A-SFV.md`, `tc-14-C-SFV.md`, `tc-14-D-GFV.md` |
