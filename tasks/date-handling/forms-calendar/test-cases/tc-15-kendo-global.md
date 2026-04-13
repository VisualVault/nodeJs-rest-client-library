# TC-15-kendo-global — kendo Global Object: exists on v1, absent on v2

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

| #   | Action                       | Console Command                                                      | Expected Capture                                             | ✓   |
| --- | ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ | --- |
| 1   | Complete setup on vv5dev     | P1–P4                                                                | Form loads                                                   | ☐   |
| 2   | Check kendo global existence | `typeof kendo`                                                       | Record value (v2: `"undefined"` — ReferenceError)            | ☐   |
| 3   | Attempt kendo.version        | `kendo.version`                                                      | Record value (v2: ReferenceError — kendo is not defined)     | ☐   |
| 4   | Attempt kendo.culture()      | `kendo.culture()`                                                    | Record value (v2: ReferenceError — kendo is not defined)     | ☐   |
| 5   | Search for Kendo in window   | `Object.keys(window).filter(k => k.toLowerCase().includes('kendo'))` | Record any Kendo-related globals (v2: expected empty)        | ☐   |
| 6   | Check jQuery availability    | `typeof $ !== 'undefined' && typeof $.fn.kendoDateTimePicker`        | Record value (v2: jQuery may exist but Kendo plugins absent) | ☐   |

### Phase B — vvdemo (Kendo v1) Capture

| #   | Action                       | Console Command                                                      | Expected Capture                         | ✓   |
| --- | ---------------------------- | -------------------------------------------------------------------- | ---------------------------------------- | --- |
| 7   | Complete setup on vvdemo     | P1–P4                                                                | Form loads                               | ☐   |
| 8   | Check kendo global existence | `typeof kendo`                                                       | Record value (v1: expected `"object"`)   | ☐   |
| 9   | Get kendo version            | `kendo.version`                                                      | Record version string (v1: TBD)          | ☐   |
| 10  | Get kendo culture            | `kendo.culture()`                                                    | Record culture object (v1: TBD)          | ☐   |
| 11  | Search for Kendo in window   | `Object.keys(window).filter(k => k.toLowerCase().includes('kendo'))` | Record Kendo-related globals (v1: TBD)   | ☐   |
| 12  | Check jQuery Kendo plugins   | `typeof $ !== 'undefined' && typeof $.fn.kendoDateTimePicker`        | Record value (v1: expected `"function"`) | ☐   |

### Phase C — Comparison

| #   | Action                             | Test Data | Expected Result                                                    | ✓   |
| --- | ---------------------------------- | --------- | ------------------------------------------------------------------ | --- |
| 13  | Compare kendo global               | v1 vs v2  | v1: present as global object. v2: absent (loaded as module)        | ☐   |
| 14  | Compare kendo version              | v1 vs v2  | v1: version string. v2: N/A (no global)                            | ☐   |
| 15  | Compare culture config             | v1 vs v2  | v1: culture object. v2: N/A                                        | ☐   |
| 16  | Compare jQuery plugin registration | v1 vs v2  | v1: Kendo widgets on $.fn. v2: absent or different mechanism       | ☐   |
| 17  | Document loading mechanism         | v1 vs v2  | Key finding: v2 loads Kendo as ES module, no global `kendo` object | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.
**FAIL-2 (kendo global exists on v2):** If `typeof kendo` is not `"undefined"` on vv5dev, the module loading assumption is wrong — re-investigate.
**FAIL-3 (kendo global absent on v1):** If `typeof kendo` is `"undefined"` on vvdemo, the v1 environment may have been upgraded — verify.

## Related

| Reference      | Location                                                                            |
| -------------- | ----------------------------------------------------------------------------------- |
| Matrix row     | `matrix.md` — row `15-kendo-global`                                                 |
| WADNR run data | `projects/wadnr/testing/.../runs/audit-kendo-version-wadnr-2026-04-10.md` § Phase 3 |
| Siblings       | `tc-15-vv-core.md`, `tc-15-widget-opts-D.md`, `tc-15-widget-opts-A.md`              |
