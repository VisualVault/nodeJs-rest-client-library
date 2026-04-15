# TC-14-C-GFV — Config C, GetFieldValue, BRT: API correctly converts local to UTC+Z

## Environment Specs

| Parameter           | Required Value                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                 |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                          |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                 |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                              |
| Target Field Config | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| Scenario            | GetFieldValue after SetFieldValue(`"2026-03-15T14:30:00"`) in BRT                        |

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
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field6"]
```

## Test Steps

### Phase A — Unmasked Baseline

| #   | Action                                  | Test Data                                                      | Expected Result                                    | ✓   |
| --- | --------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                          | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set value first (prerequisite)          | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Field displays `03/15/2026 02:30 PM`               | ☐   |
| 3   | Capture raw stored value                | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"`                            | ☐   |
| 4   | Capture API return value (primary test) | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T17:30:00.000Z"`                       | ☐   |
| 5   | Verify BRT active                       | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Step 4 explanation:** Config C (ignoreTimezone=false) GetFieldValue correctly converts local time to UTC: `14:30 BRT` + 3h offset = `17:30 UTC`, returned as `"2026-03-15T17:30:00.000Z"`.

### Phase C — With Mask (future)

| #   | Action                               | Test Data                               | Expected Result                                           | ✓   |
| --- | ------------------------------------ | --------------------------------------- | --------------------------------------------------------- | --- |
| 6   | Add mask, open fresh form, set value | Same as Steps 2                         | Value set with mask active                                | ☐   |
| 7   | Capture API return value             | `VV.Form.GetFieldValue('<FIELD_NAME>')` | `"2026-03-15T17:30:00.000Z"` — mask should not affect API | ☐   |
| 8   | Compare                              | Steps 4 vs 7                            | Identical — mask is display-only                          | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.

**FAIL-2 (V2 active):** Abort.

**FAIL-3 (Mask alters API — Phase C):** GetFieldValue returns a different value with mask applied. If mask truncates time before the UTC conversion, the API would return `"2026-03-15T03:00:00.000Z"` (midnight BRT → UTC) instead of the expected `"2026-03-15T17:30:00.000Z"`.

## Related

| Reference               | Location                                         |
| ----------------------- | ------------------------------------------------ |
| Matrix row              | `matrix.md` — row `14-C-GFV`                     |
| Category 14 description | `matrix.md` § "14 — Mask Impact"                 |
| Prerequisite TC         | `tc-14-C-SFV.md` (sets the value that GFV reads) |
| Sibling TCs             | `tc-14-D-GFV.md`                                 |
