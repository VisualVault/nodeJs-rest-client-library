# TC-15-fieldMaster-C — Config C fieldMaster: cross-env property comparison

## Environment Specs

| Parameter       | Required Value                                                    |
| --------------- | ----------------------------------------------------------------- |
| Browser         | Google Chrome, latest stable (V8 engine)                          |
| System Timezone | `America/Sao_Paulo` — UTC-3, BRT                                  |
| Environments    | vvdemo (Kendo v1) AND vv5dev (Kendo v2) — run on both, compare    |
| Target Field    | Config C — enableTime=true, ignoreTimezone=false, useLegacy=false |

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

| #   | Action                      | Console Command                                                                                                                                                | Expected Capture                            | ✓   |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --- |
| 1   | Complete setup on vv5dev    | P1–P4                                                                                                                                                          | Form loads                                  | ☐   |
| 2   | Locate Config C fieldMaster | `VV.Form.fieldMaster.filter(f => f.enableTime && !f.ignoreTimezone && !f.useLegacy)`                                                                           | Array of Config C fields                    | ☐   |
| 3   | Dump mask                   | `VV.Form.fieldMaster.filter(f => f.enableTime && !f.ignoreTimezone && !f.useLegacy).map(f => ({name:f.name, mask:f.mask}))`                                    | Record value (v2: mask=`""`)                | ☐   |
| 4   | Dump placeholder            | `VV.Form.fieldMaster.filter(f => f.enableTime && !f.ignoreTimezone && !f.useLegacy).map(f => ({name:f.name, placeholder:f.placeholder}))`                      | Record value                                | ☐   |
| 5   | Dump format/displayFormat   | `VV.Form.fieldMaster.filter(f => f.enableTime && !f.ignoreTimezone && !f.useLegacy).map(f => ({name:f.name, format:f.format, displayFormat:f.displayFormat}))` | Record values (v2: no format/displayFormat) | ☐   |
| 6   | Check enableQListener       | `VV.Form.fieldMaster.filter(f => f.enableTime && !f.ignoreTimezone && !f.useLegacy).map(f => ({name:f.name, enableQListener:f.enableQListener}))`              | Record value                                | ☐   |

### Phase B — vvdemo (Kendo v1) Capture

| #    | Action                     | Console Command | Expected Capture       | ✓   |
| ---- | -------------------------- | --------------- | ---------------------- | --- |
| 7    | Complete setup on vvdemo   | P1–P4           | Form loads             | ☐   |
| 8-12 | Repeat Steps 2-6 on vvdemo | Same commands   | Record v1 values (TBD) | ☐   |

### Phase C — Comparison

| #   | Action                       | Test Data                      | Expected Result                                      | ✓   |
| --- | ---------------------------- | ------------------------------ | ---------------------------------------------------- | --- |
| 13  | Compare mask values          | v1 vs v2                       | Document difference (v2: empty string)               | ☐   |
| 14  | Compare placeholder values   | v1 vs v2                       | Document difference                                  | ☐   |
| 15  | Compare format/displayFormat | v1 vs v2                       | Document difference (v2: properties absent)          | ☐   |
| 16  | Compare enableQListener      | v1 vs v2                       | Document difference                                  | ☐   |
| 17  | Compare full property set    | v1 vs v2                       | List any properties present in one but not the other | ☐   |
| 18  | Compare C vs D fieldMaster   | This TC vs tc-15-fieldMaster-D | Only ignoreTimezone should differ                    | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.
**FAIL-2 (No Config C fields found):** fieldMaster filter returns empty array — verify field configuration flags.
**FAIL-3 (C and D differ beyond ignoreTimezone):** Unexpected structural differences between Config C and D fieldMaster entries.

## Related

| Reference      | Location                                                                            |
| -------------- | ----------------------------------------------------------------------------------- |
| Matrix row     | `matrix.md` — row `15-fieldMaster-C`                                                |
| WADNR run data | `projects/wadnr/testing/.../runs/audit-kendo-version-wadnr-2026-04-10.md` § Phase 2 |
| Siblings       | `tc-15-vv-core.md`, `tc-15-fieldMaster-D.md`, `tc-15-kendo-global.md`               |
