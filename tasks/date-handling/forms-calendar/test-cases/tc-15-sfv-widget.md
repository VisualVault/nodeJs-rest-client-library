# TC-15-sfv-widget — Widget Value After SetFieldValue: v1 vs v2 comparison

## Environment Specs

| Parameter       | Required Value                                                            |
| --------------- | ------------------------------------------------------------------------- |
| Browser         | Google Chrome, latest stable (V8 engine)                                  |
| System Timezone | `America/Sao_Paulo` — UTC-3, BRT                                          |
| Environments    | vvdemo (Kendo v1) AND vv5dev (Kendo v2) — run on both, compare            |
| Target Field    | Config D (Field5) — enableTime=true, ignoreTimezone=true, useLegacy=false |
| Test Value      | `"2026-03-15T14:30:00"`                                                   |

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

| #   | Action                      | Console Command                                             | Expected Capture                                 | ✓   |
| --- | --------------------------- | ----------------------------------------------------------- | ------------------------------------------------ | --- |
| 1   | Complete setup on vv5dev    | P1–P4                                                       | Form loads                                       | ☐   |
| 2   | Set Field5 value            | `VV.Form.SetFieldValue('Field5', '2026-03-15T14:30:00')`    | No error                                         | ☐   |
| 3   | Read raw value              | `VV.Form.GetFieldValue('Field5')`                           | Record value (v2: raw value should be correct)   | ☐   |
| 4   | Read API value              | `VV.Form.GetFieldValue('Field5', {approveAction:'api'})`    | Record value (v2: may show Bug #5 mutation)      | ☐   |
| 5   | Attempt DOM widget read     | `document.querySelector('[name="Field5"]')`                 | Record result (v2: `null` — DOM selector fails)  | ☐   |
| 6   | Attempt jQuery widget value | `$('[name="Field5"]').data('kendoDateTimePicker')?.value()` | Record result (v2: `null` — widget inaccessible) | ☐   |
| 7   | Check visual display        | Manual inspection of the form field                         | Record what the user sees in the date field      | ☐   |

### Phase B — vvdemo (Kendo v1) Capture

| #   | Action                    | Console Command                                                         | Expected Capture                       | ✓   |
| --- | ------------------------- | ----------------------------------------------------------------------- | -------------------------------------- | --- |
| 8   | Complete setup on vvdemo  | P1–P4                                                                   | Form loads                             | ☐   |
| 9   | Set Field5 value          | `VV.Form.SetFieldValue('Field5', '2026-03-15T14:30:00')`                | No error                               | ☐   |
| 10  | Read raw value            | `VV.Form.GetFieldValue('Field5')`                                       | Record value (v1: TBD)                 | ☐   |
| 11  | Read API value            | `VV.Form.GetFieldValue('Field5', {approveAction:'api'})`                | Record value (v1: TBD)                 | ☐   |
| 12  | Read DOM widget value     | `$('[name="Field5"]').data('kendoDateTimePicker')?.value()`             | Record Date object (v1: TBD)           | ☐   |
| 13  | Read DOM widget formatted | `$('[name="Field5"]').data('kendoDateTimePicker')?.value()?.toString()` | Record string representation (v1: TBD) | ☐   |
| 14  | Read input element value  | `document.querySelector('[name="Field5"]')?.value`                      | Record raw input value (v1: TBD)       | ☐   |

### Phase C — Comparison

| #   | Action                   | Test Data | Expected Result                                                           | ✓   |
| --- | ------------------------ | --------- | ------------------------------------------------------------------------- | --- |
| 15  | Compare VV raw values    | v1 vs v2  | Both should preserve `2026-03-15T14:30:00`                                | ☐   |
| 16  | Compare VV API values    | v1 vs v2  | Both may show Bug #5 time mutation — document                             | ☐   |
| 17  | Compare widget layer     | v1 vs v2  | v1: Kendo Date object accessible. v2: widget=null (DOM failed)            | ☐   |
| 18  | Compare visual display   | v1 vs v2  | Document any display differences                                          | ☐   |
| 19  | Assess observability gap | v1 vs v2  | v1: 3 layers (VV API, DOM input, Kendo widget). v2: 1 layer (VV API only) | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** GMT offset is not -0300. Abort.
**FAIL-2 (SetFieldValue error):** If SFV throws an error on either environment — document the error.
**FAIL-3 (Raw value mutated):** If GetFieldValue raw return does not preserve the input string — this is a new bug beyond Bug #5.
**FAIL-4 (Widget accessible on v2):** If DOM widget access succeeds on vv5dev — the v2 DOM assumption is wrong, document the working selector.

## Related

| Reference        | Location                                                                            |
| ---------------- | ----------------------------------------------------------------------------------- |
| Matrix row       | `matrix.md` — row `15-sfv-widget`                                                   |
| WADNR run data   | `projects/wadnr/testing/.../runs/audit-kendo-version-wadnr-2026-04-10.md` § Phase 5 |
| Bug #5 reference | `tasks/date-handling/forms-calendar/bugs.md` — FORM-BUG-5                           |
| Siblings         | `tc-15-widget-opts-D.md`, `tc-15-widget-opts-A.md`                                  |
