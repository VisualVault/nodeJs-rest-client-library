# TC-14-D-save — Config D, Save+Reload, BRT: raw preserved; fake Z persists (FORM-BUG-5)

## Environment Specs

| Parameter           | Required Value                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                                                                       |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                                                                                |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                                                                       |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                                                                                    |
| Target Field Config | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`                                                        |
| Scenario            | `2026-03-15T14:30:00`, BRT — SetFieldValue → Save → Reload → verify raw and API values survive round-trip; check if FORM-BUG-5 fake Z persists |

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

### Phase A — Unmasked Baseline (Save + Reload)

| #   | Action                          | Test Data                                                      | Expected Result                                                                                    | ✓   |
| --- | ------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                  | See Preconditions P1–P6                                        | All P1–P6 checks pass                                                                              | ☐   |
| 2   | Set field value via console     | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Field displays `03/15/2026 02:30 PM`                                                               | ☐   |
| 3   | Capture pre-save raw value      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"`                                                                            | ☐   |
| 4   | Capture pre-save API value      | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | **Expected (correct):** `"2026-03-15T14:30:00"` (no Z — ignoreTimezone should skip UTC conversion) | ☐   |
| 5   | Save the form                   | Use guarded save (`saveFormOnly()` or equivalent)              | Form saved successfully, record ID visible                                                         | ☐   |
| 6   | Navigate to the saved record    | Open form instance by record ID                                | Saved form loads                                                                                   | ☐   |
| 7   | Capture post-reload raw value   | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"` — identical to Step 3                                                      | ☐   |
| 8   | Capture post-reload API value   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | **Expected (correct):** `"2026-03-15T14:30:00"` — no Z                                             | ☐   |
| 9   | Compare pre-save vs post-reload | Steps 3-4 vs Steps 7-8                                         | All values identical — round-trip preserves data                                                   | ☐   |

> **Step 4 — FORM-BUG-5 expected:** Config D (ignoreTimezone=true) should return the value without UTC conversion. However, FORM-BUG-5 appends a fake Z suffix: actual result is likely `"2026-03-15T14:30:00.000Z"`. This Z is semantically wrong — the value is local time, not UTC.

### Phase C — With Mask (future)

| #   | Action                                        | Test Data                                                      | Expected Result                                                   | ✓   |
| --- | --------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- | --- |
| 10  | Add `<Mask>MM/dd/yyyy</Mask>` to target field | Form Designer                                                  | Mask applied — time portion hidden in display                     | ☐   |
| 11  | Open fresh form instance                      | Navigate to template URL                                       | New form created                                                  | ☐   |
| 12  | Set field value via console                   | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Field displays `03/15/2026` (time hidden by mask)                 | ☐   |
| 13  | Capture pre-save raw value                    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"` — time preserved despite mask?            | ☐   |
| 14  | Save the form                                 | Use guarded save                                               | Form saved successfully                                           | ☐   |
| 15  | Navigate to the saved record                  | Open form instance by record ID                                | Saved form loads                                                  | ☐   |
| 16  | Capture post-reload raw value                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"` — time still preserved after round-trip?  | ☐   |
| 17  | Capture post-reload API value                 | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | **Expected (correct):** `"2026-03-15T14:30:00"` — no Z            | ☐   |
| 18  | Compare Phase A vs Phase C                    | Steps 3-4,7-8 vs Steps 13,16-17                                | Identical values — mask is display-only, save pipeline unaffected | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (FORM-BUG-5 fake Z):** Step 4 or 8 returns a value with `.000Z` suffix (e.g., `"2026-03-15T14:30:00.000Z"`) instead of `"2026-03-15T14:30:00"`. This is the known FORM-BUG-5 defect. Record actual values and mark as **confirmed bug**.

**FAIL-4 (Save pipeline alters value):** Post-reload raw value (Step 7) differs from pre-save (Step 3). The save pipeline or server-side processing modified the stored value during round-trip.

**FAIL-5 (Mask affects save — Phase C):** Post-reload values in Phase C differ from Phase A. The mask influenced the save pipeline, potentially truncating the time component. Critical WADNR finding.

## Related

| Reference               | Location                                                |
| ----------------------- | ------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `14-D-save`                           |
| Category 14 description | `matrix.md` § "14 — Mask Impact"                        |
| FORM-BUG-5              | `forms-calendar/analysis/bug-5-fake-z-drift.md`         |
| Config D bugs           | FORM-BUG-4 (save format), FORM-BUG-5 (fake Z)           |
| Sibling TCs             | `tc-14-C-save.md`, `tc-14-D-SFV.md`, `tc-14-D-typed.md` |
