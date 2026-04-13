# TC-15-widget-opts-D — Kendo Widget Options for Config D: DOM selector comparison

## Environment Specs

| Parameter       | Required Value                                                            |
| --------------- | ------------------------------------------------------------------------- |
| Browser         | Google Chrome, latest stable (V8 engine)                                  |
| System Timezone | `America/Sao_Paulo` — UTC-3, BRT                                          |
| Environments    | vvdemo (Kendo v1) AND vv5dev (Kendo v2) — run on both, compare            |
| Target Field    | Config D (Field5) — enableTime=true, ignoreTimezone=true, useLegacy=false |

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

| #   | Action                               | Console Command                                                                                   | Expected Capture                                                 | ✓   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --- |
| 1   | Complete setup on vv5dev             | P1–P4                                                                                             | Form loads                                                       | ☐   |
| 2   | Find Field5 input via name attribute | `document.querySelector('[name="Field5"]')`                                                       | Record result (v2: `null` — input not found)                     | ☐   |
| 3   | Find Field5 input via id attribute   | `document.querySelector('#Field5')`                                                               | Record result (v2: check if alternate selector works)            | ☐   |
| 4   | Scan all date-related inputs         | `document.querySelectorAll('input[data-role*="date"], input[type="date"], input[class*="date"]')` | Record found elements and their selectors                        | ☐   |
| 5   | Attempt jQuery widget access         | `$('[name="Field5"]').data('kendoDateTimePicker')`                                                | Record result (v2: expected null/undefined — DOM selector fails) | ☐   |
| 6   | If input found, dump widget options  | `$('[name="Field5"]').data('kendoDateTimePicker')?.options`                                       | Record options object or null (v2: null expected)                | ☐   |
| 7   | Inspect DOM structure                | `document.querySelectorAll('[class*="Field5"], [id*="Field5"], [data-field*="Field5"]')`          | Record all DOM elements referencing Field5                       | ☐   |

### Phase B — vvdemo (Kendo v1) Capture

| #   | Action                               | Console Command                                                                                                                                                                                  | Expected Capture                                | ✓   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | --- |
| 8   | Complete setup on vvdemo             | P1–P4                                                                                                                                                                                            | Form loads                                      | ☐   |
| 9   | Find Field5 input via name attribute | `document.querySelector('[name="Field5"]')`                                                                                                                                                      | Record result (v1: TBD)                         | ☐   |
| 10  | Attempt jQuery widget access         | `$('[name="Field5"]').data('kendoDateTimePicker')`                                                                                                                                               | Record result (v1: TBD — expected Kendo widget) | ☐   |
| 11  | Dump widget options                  | `$('[name="Field5"]').data('kendoDateTimePicker')?.options`                                                                                                                                      | Record full options object (v1: TBD)            | ☐   |
| 12  | Dump specific option keys            | `var w = $('[name="Field5"]').data('kendoDateTimePicker'); w && {format:w.options.format, parseFormats:w.options.parseFormats, culture:w.options.culture, min:w.options.min, max:w.options.max}` | Record key configuration values                 | ☐   |

### Phase C — Comparison

| #   | Action                            | Test Data | Expected Result                                                      | ✓   |
| --- | --------------------------------- | --------- | -------------------------------------------------------------------- | --- |
| 13  | Compare DOM selector results      | v1 vs v2  | v1: input found. v2: input not found (different DOM structure)       | ☐   |
| 14  | Compare widget accessibility      | v1 vs v2  | v1: Kendo widget via jQuery .data(). v2: no widget (no global Kendo) | ☐   |
| 15  | Document v2 DOM structure         | v2 only   | Record how v2 renders date fields without classic Kendo inputs       | ☐   |
| 16  | Document widget options (v1 only) | v1        | Record format, parseFormats, culture from v1 widget options          | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.
**FAIL-2 (Field5 found on v2):** If `document.querySelector('[name="Field5"]')` returns non-null on vv5dev, the v2 DOM structure assumption is wrong — document the actual selector.
**FAIL-3 (No widget on v1):** If jQuery widget access fails on vvdemo, verify Kendo is loaded and field name is correct.

## Related

| Reference      | Location                                                                            |
| -------------- | ----------------------------------------------------------------------------------- |
| Matrix row     | `matrix.md` — row `15-widget-opts-D`                                                |
| WADNR run data | `projects/wadnr/testing/.../runs/audit-kendo-version-wadnr-2026-04-10.md` § Phase 4 |
| Siblings       | `tc-15-kendo-global.md`, `tc-15-widget-opts-A.md`, `tc-15-sfv-widget.md`            |
