# TC-14-A-SFV — Config A, SetFieldValue, BRT: date-only stored unchanged; API returns same string

## Environment Specs

| Parameter           | Required Value                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                  |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive (standard time year-round since 2019).     |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                  |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                               |
| Target Field Config | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| Scenario            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00` UTC      |

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

**P4 — Open the DateTest form template** (creates a fresh instance):

```
/FormViewer/app?hidemenu=true&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d&xcid=WADNR&xcdid=fpOnline
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1 is active, proceed
// ABORT: true → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field7"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

## Test Steps

### Phase A — Unmasked Baseline

| #   | Action                      | Test Data                                                      | Expected Result                                    | ✓   |
| --- | --------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set field value via console | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture raw stored value    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 4   | Capture API return value    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                                     | ☐   |
| 5   | Verify BRT active           | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

### Phase C — With Mask (future, after Form Designer change)

| #   | Action                                        | Test Data                                                      | Expected Result                                           | ✓   |
| --- | --------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | --- |
| 6   | Add `<Mask>MM/dd/yyyy</Mask>` to target field | Form Designer                                                  | Mask applied to field                                     | ☐   |
| 7   | Open fresh form instance                      | Navigate to template URL                                       | New form created                                          | ☐   |
| 8   | Repeat P6 — verify field config unchanged     | Same filter as P6                                              | Same field name returned                                  | ☐   |
| 9   | Repeat Step 2 — SetFieldValue                 | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`          | Same raw/API as Steps 3-4?                                | ☐   |
| 10  | Capture raw stored value                      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"` (mask should not affect date-only storage) | ☐   |
| 11  | Capture API return value                      | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"` (mask should not affect API return)        | ☐   |
| 12  | Compare Phase A vs Phase C                    | Visual diff of Steps 3-4 vs 10-11                              | Identical values — mask is display-only                   | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Browser timezone was not set correctly — abort and re-check P1/P2.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Test was designed for V1 code path. Verify whether V2 behavior differs before proceeding.

**FAIL-3 (Mask truncation — Phase C):** Phase C raw or API value differs from Phase A. This would mean masks are NOT display-only and actively truncate or transform stored values — critical finding for WADNR production fields.

## Related

| Reference               | Location                                   |
| ----------------------- | ------------------------------------------ |
| Matrix row              | `matrix.md` — row `14-A-SFV`               |
| Category 14 description | `matrix.md` § "14 — Mask Impact"           |
| Config A bugs (BRT)     | None in BRT — FORM-BUG-7 only affects UTC+ |
| Sibling TCs             | `tc-14-C-SFV.md`, `tc-14-D-SFV.md`         |
