# TC-1-H-BRT — Config H, Calendar Popup, BRT: UTC datetime with Z (legacy); no fake Z in GetFieldValue (useLegacy=true)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT (Brasilia Standard Time). No DST active in March 2026. |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`  |
| **Scenario**            | Mar 15, 2026, BRT midnight — 2026-03-15T00:00:00-03:00 = 2026-03-15T03:00:00 UTC        |

---

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

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before continuing.

**P5 — Verify code path** (DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField13"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                               | Test Data                                                                                     | Expected Result                                           | ✓   |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --- |
| 1   | Complete setup                                       | See Preconditions P1–P6                                                                       | All P1–P6 checks pass                                     | ☐   |
| 2   | Scroll the target field (identified in P6) into view | `document.getElementById('<FIELD_NAME>').scrollIntoView({behavior:'instant',block:'center'})` | Field visible in viewport                                 | ☐   |
| 3   | Click the calendar icon adjacent to the target field | `.k-icon.k-i-calendar` inside `.fd-cal-container` for `<FIELD_NAME>`                          | Calendar popup opens showing "March 2026"                 | ☐   |
| 4   | Confirm current month shown in popup header          | —                                                                                             | `"March 2026"`                                            | ☐   |
| 5   | Click the March 15 cell                              | Cell with `title="Sunday, March 15, 2026"`                                                    | Popup closes immediately; no time tab appears             | ☐   |
| 6   | Observe field display value                          | —                                                                                             | `03/15/2026 12:00 AM`                                     | ☐   |
| 7   | Capture raw stored value                             | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` ``                          | `"2026-03-15T03:00:00.000Z"`                              | ☐   |
| 8   | Capture GetFieldValue return                         | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                                                 | `"2026-03-15T03:00:00.000Z"` — no fake Z (useLegacy=true) | ☐   |
| 9   | Capture isoRef and confirm TZ                        | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                                          | `"2026-03-15T03:00:00.000Z"` — confirms BRT active        | ☐   |

> **Legacy popup behavior**: The target field is a plain HTML text input (not Kendo DateTimePicker). Despite `enableTime=true`, the legacy calendar popup does **not** show a time selection tab — it closes immediately after the date is clicked, defaulting time to 12:00 AM. This is distinct from the non-legacy (`useLegacy=false`) DateTime popup which shows a time column and a Set button. Do not scroll inside the popup or attempt to find a Set button; the value is committed on date click.

> **Calendar icon click method**: The target field is near the bottom of the form. If the calendar icon does not respond to a direct click, scroll the field into view first (step 2), then trigger `.click()` on the icon element via DevTools console.

---

## Fail Conditions

**FAIL-1 (wrong TZ active):** `isoRef` (step 9) returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is UTC, not BRT. BRT midnight must equal UTC+3h. Abort, verify P1 and P2, restart Chrome, and re-run from P3.

**FAIL-2 (V2 code path active):** `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true` at P5.

- Interpretation: V2 is active (Object View or server flag). This test was verified under V1. Re-check the URL — remove `?ObjectID=` if present — or confirm V2 behavior is intentional before proceeding.

**FAIL-3 (raw value differs from GetFieldValue):** Step 8 returns a value different from step 7.

- Interpretation: The `getCalendarFieldValue()` function is transforming the stored value. For `useLegacy=true`, the fake-Z branch in Bug #5 should be inactive. A discrepancy here means either the useLegacy flag is not being read correctly or the field config has changed. Stop and compare field config against P6 output.

**FAIL-4 (wrong date stored):** Raw stored value (step 7) is `"2026-03-14T..."` or any date other than March 15.

- Interpretation: Date shift on the legacy popup path. Not expected for BRT (UTC-3) since local midnight is the same UTC day. Check for system clock errors or TZ misconfiguration.

---

## Related

| Reference                    | Location                                                  |
| ---------------------------- | --------------------------------------------------------- |
| Matrix row                   | `../matrix.md` — row `1-H-BRT`                            |
| Live test evidence           | `../results.md § Test 9.4`                                |
| Bug #2 (popup vs typed)      | `analysis.md § Bug #2 — Inconsistent User Input Handlers` |
| Bug #5 (fake Z — not active) | `analysis.md § Bug #5 — Inconsistent Developer API`       |
| Sibling: Config E popup BRT  | `tc-1-E-BRT.md`                                           |
| Sibling: Config F popup BRT  | `tc-1-F-BRT.md`                                           |
| Sibling: Config G popup BRT  | `tc-1-G-BRT.md` (pending)                                 |
| Configs A/B/C/D BRT popup    | `tc-1-1-calendar-popup-brt.md`                            |
| Field config reference       | `research/date-handling/CLAUDE.md § Test Form Fields`     |
