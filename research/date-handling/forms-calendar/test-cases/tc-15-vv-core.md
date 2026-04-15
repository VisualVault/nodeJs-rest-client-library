# TC-15-vv-core — VV.Form Core Properties: cross-env framework comparison

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

| #   | Action                            | Console Command                                             | Expected Capture                 | ✓   |
| --- | --------------------------------- | ----------------------------------------------------------- | -------------------------------- | --- |
| 1   | Complete setup on vv5dev          | P1–P4                                                       | Form loads                       | ☐   |
| 2   | Check formId                      | `typeof VV.Form.formId`                                     | Record value (v2: `"undefined"`) | ☐   |
| 3   | Check V1/V2 flag                  | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | Record value (v2: `false`)       | ☐   |
| 4   | List calendarValueService methods | `Object.keys(VV.Form.calendarValueService)`                 | Record list (v2: 4 methods)      | ☐   |
| 5   | Check LocalizationResources       | `VV.Form.LocalizationResources`                             | Record value (v2: `{}` empty)    | ☐   |
| 6   | Count VV.Form properties          | `Object.keys(VV.Form).length`                               | Record count (v2: 28)            | ☐   |

### Phase B — vvdemo (Kendo v1) Capture

| #    | Action                     | Console Command | Expected Capture       | ✓   |
| ---- | -------------------------- | --------------- | ---------------------- | --- |
| 7    | Complete setup on vvdemo   | P1–P4           | Form loads             | ☐   |
| 8-12 | Repeat Steps 2-6 on vvdemo | Same commands   | Record v1 values (TBD) | ☐   |

### Phase C — Comparison

| #   | Action                  | Test Data | Expected Result          | ✓   |
| --- | ----------------------- | --------- | ------------------------ | --- |
| 13  | Compare formId          | v1 vs v2  | Document difference      | ☐   |
| 14  | Compare V1/V2 flag      | v1 vs v2  | Both should be `false`   | ☐   |
| 15  | Compare method sets     | v1 vs v2  | Document any differences | ☐   |
| 16  | Compare property counts | v1 vs v2  | Document difference      | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.
**FAIL-2 (V2 code path active):** `useUpdatedCalendarValueLogic` differs between envs — investigate.

## Related

| Reference      | Location                                                                            |
| -------------- | ----------------------------------------------------------------------------------- |
| Matrix row     | `matrix.md` — row `15-vv-core`                                                      |
| WADNR run data | `projects/wadnr/testing/.../runs/audit-kendo-version-wadnr-2026-04-10.md` § Phase 1 |
| Siblings       | `tc-15-fieldMaster-D.md`, `tc-15-kendo-global.md`                                   |
