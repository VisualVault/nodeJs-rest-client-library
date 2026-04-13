# TC-14-C-popup — Config C, Calendar Popup, BRT: local midnight stored; API converts to UTC

## Environment Specs

| Parameter           | Required Value                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                                |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                                         |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                                |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                                             |
| Target Field Config | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`                |
| Scenario            | `2026-03-15`, BRT midnight via calendar popup — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00` UTC |

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

| #   | Action                                   | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                           | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Click calendar icon next to target field | —                                                              | Calendar popup opens showing Date tab              | ☐   |
| 3   | Navigate to March 2026                   | Click month header → select March                              | March 2026 calendar grid visible                   | ☐   |
| 4   | Click day 15                             | Click gridcell "15"                                            | Popup auto-advances to Time tab, shows `12:00 AM`  | ☐   |
| 5   | Click Set button                         | —                                                              | Popup closes, field shows `03/15/2026 12:00 AM`    | ☐   |
| 6   | Capture raw stored value                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                            | ☐   |
| 7   | Capture API return value                 | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T03:00:00.000Z"`                       | ☐   |
| 8   | Verify BRT active                        | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Steps 6-7 explanation:** On Kendo v2, the popup stores local midnight directly as `T00:00:00`. GetFieldValue converts: `new Date("2026-03-15T00:00:00")` (BRT midnight) → `toISOString()` → `"2026-03-15T03:00:00.000Z"` (correct UTC).

### Phase C — With Mask (future)

| #   | Action                                        | Test Data                                                      | Expected Result                                          | ✓   |
| --- | --------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- | --- |
| 9   | Add `<Mask>MM/dd/yyyy</Mask>` to target field | Form Designer                                                  | Mask applied — time portion hidden                       | ☐   |
| 10  | Open fresh form, open calendar popup          | Click calendar icon                                            | **Key question: Does the time picker tab still appear?** | ☐   |
| 11  | Select March 15, click Set                    | Same as Steps 3-5                                              | Date selected                                            | ☐   |
| 12  | Capture raw stored value                      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"` — time preserved as midnight?    | ☐   |
| 13  | Capture API return value                      | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T03:00:00.000Z"` — same UTC?                 | ☐   |
| 14  | Compare Phase A vs Phase C                    | Steps 6-7 vs 12-13                                             | Identical — mask is display-only                         | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.

**FAIL-2 (V2 active):** Abort.

**FAIL-3 (Mask hides time picker — Phase C):** Time tab does not appear in popup when mask is `MM/dd/yyyy`. If this happens, the popup may default to midnight (same as unmasked) or may set an unexpected time. Document the actual time value stored.

**FAIL-4 (Mask changes storage — Phase C):** Raw value differs from Phase A. Critical finding.

## Related

| Reference               | Location                             |
| ----------------------- | ------------------------------------ |
| Matrix row              | `matrix.md` — row `14-C-popup`       |
| Category 14 description | `matrix.md` § "14 — Mask Impact"     |
| Sibling TCs             | `tc-14-D-popup.md`, `tc-14-C-SFV.md` |
