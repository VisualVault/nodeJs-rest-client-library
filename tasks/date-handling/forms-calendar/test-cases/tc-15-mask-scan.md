# TC-15-mask-scan — Calendar Field Mask Scan: all fields on both envs

## Environment Specs

| Parameter       | Required Value                                                 |
| --------------- | -------------------------------------------------------------- |
| Browser         | Google Chrome, latest stable (V8 engine)                       |
| System Timezone | `America/Sao_Paulo` — UTC-3, BRT                               |
| Environments    | vvdemo (Kendo v1) AND vv5dev (Kendo v2) — run on both, compare |

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
```

**P4 — Open the DateTest form template on the target environment:**

vvdemo (v1): `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939`

vv5dev (v2): `https://vv5dev.visualvault.com/FormViewer/app?hidemenu=true&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d&xcid=WADNR&xcdid=fpOnline`

## Test Steps

### Phase A — vv5dev (Kendo v2) Capture

| #   | Action                               | Console Command                                                                                                                 | Expected Capture                                                | ✓   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --- |
| 1   | Complete setup on vv5dev             | P1–P4                                                                                                                           | Form loads                                                      | ☐   |
| 2   | Count calendar fields                | `VV.Form.fieldMaster.filter(f => f.fieldType === 13).length`                                                                    | Record count (v2: 26 fields)                                    | ☐   |
| 3   | Dump all calendar field names        | `VV.Form.fieldMaster.filter(f => f.fieldType === 13).map(f => f.name)`                                                          | Record full list of field names                                 | ☐   |
| 4   | Dump mask for all calendar fields    | `VV.Form.fieldMaster.filter(f => f.fieldType === 13).map(f => ({name:f.name, mask:f.mask}))`                                    | Record all masks (v2: Field3/4 have `"MM/dd/yyyy"`, rest empty) | ☐   |
| 5   | Dump placeholder for all             | `VV.Form.fieldMaster.filter(f => f.fieldType === 13).map(f => ({name:f.name, placeholder:f.placeholder}))`                      | Record all placeholders                                         | ☐   |
| 6   | Dump enableTime for all              | `VV.Form.fieldMaster.filter(f => f.fieldType === 13).map(f => ({name:f.name, enableTime:f.enableTime}))`                        | Record enableTime flags                                         | ☐   |
| 7   | Check format/displayFormat existence | `VV.Form.fieldMaster.filter(f => f.fieldType === 13).map(f => ({name:f.name, format:f.format, displayFormat:f.displayFormat}))` | Record values (v2: no format/displayFormat exists on any field) | ☐   |

### Phase B — vvdemo (Kendo v1) Capture

| #     | Action                     | Console Command                                              | Expected Capture       | ✓   |
| ----- | -------------------------- | ------------------------------------------------------------ | ---------------------- | --- |
| 8     | Complete setup on vvdemo   | P1–P4                                                        | Form loads             | ☐   |
| 9     | Count calendar fields      | `VV.Form.fieldMaster.filter(f => f.fieldType === 13).length` | Record count (v1: TBD) | ☐   |
| 10-14 | Repeat Steps 3-7 on vvdemo | Same commands                                                | Record v1 values (TBD) | ☐   |

### Phase C — Comparison

| #   | Action                             | Test Data | Expected Result                                                         | ✓   |
| --- | ---------------------------------- | --------- | ----------------------------------------------------------------------- | --- |
| 15  | Compare field counts               | v1 vs v2  | Document if different number of calendar fields                         | ☐   |
| 16  | Compare mask values                | v1 vs v2  | v2: only Field3/4 have masks. v1: TBD — may have more                   | ☐   |
| 17  | Compare format/displayFormat       | v1 vs v2  | v2: absent on all fields. v1: may be present                            | ☐   |
| 18  | Compare enableTime distribution    | v1 vs v2  | Should match between environments                                       | ☐   |
| 19  | Identify fields with masks         | Both envs | Produce a summary table of which fields have non-empty masks            | ☐   |
| 20  | Document missing format properties | v2        | Key finding: v2 fieldMaster lacks format/displayFormat on all 26 fields | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.
**FAIL-2 (Field count mismatch):** If v1 and v2 have different numbers of calendar fields — templates may differ, document carefully.
**FAIL-3 (Unexpected masks on v2):** If fields other than Field3/4 have non-empty masks on v2 — indicates config change since last audit.
**FAIL-4 (format/displayFormat exists on v2):** If any v2 field has format or displayFormat — the platform may have been updated.

## Related

| Reference      | Location                                                                            |
| -------------- | ----------------------------------------------------------------------------------- |
| Matrix row     | `matrix.md` — row `15-mask-scan`                                                    |
| WADNR run data | `projects/wadnr/testing/.../runs/audit-kendo-version-wadnr-2026-04-10.md` § Phase 6 |
| Siblings       | `tc-15-fieldMaster-C.md`, `tc-15-fieldMaster-D.md`                                  |
