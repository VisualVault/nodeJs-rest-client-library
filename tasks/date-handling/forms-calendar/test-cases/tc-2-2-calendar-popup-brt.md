# TC-2.2 — Config D, Calendar Popup, BRT: local midnight stored; GetFieldValue appends fake Z (Bug #5)

---

## Environment Specs

| Parameter               | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, Brasilia Standard Time. No DST (Brazil abolished DST in 2019). |
| **Platform**            | VisualVault FormViewer, Build `20260304.1`                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`     |
| **Scenario**            | 2026-03-15, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00` UTC          |

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
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField5"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

---

## Test Steps

| #   | Action                                                              | Test Data                                                      | Expected Result                                                                 | ✓   |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                        | All P1–P6 checks pass                                                           | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6) | Calendar icon button to the right of the `<FIELD_NAME>` input  | Calendar popup opens; Date tab is active (blue); March 2026 calendar is visible | ☐   |
| 3   | Verify calendar month header                                        | —                                                              | Header reads `March 2026`                                                       | ☐   |
| 4   | Click day 15 in the calendar                                        | Day cell labeled `15`                                          | Popup auto-advances to Time tab; time header displays `12:00 AM`                | ☐   |
| 5   | Verify time header before clicking Set                              | —                                                              | Header reads `12:00 AM` with Hour=`12`, Minute=`00`, AM/PM=`AM` selected        | ☐   |
| 6   | Click Set                                                           | Set button at bottom of time picker                            | Popup closes; target field input shows `03/15/2026 12:00 AM`                    | ☐   |
| 7   | Verify display value                                                | Screenshot or read the field input                             | `03/15/2026 12:00 AM`                                                           | ☐   |
| 8   | Capture raw stored value                                            | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                                         | ☐   |
| 9   | Capture GetFieldValue                                               | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — same as raw, no transformation                        | ☐   |
| 10  | Verify environment (isoRef)                                         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                              | ☐   |

> **Set button visibility**: The Set button is at the bottom of the time picker modal. If the viewport is short, the button may be cut off. Do NOT scroll inside the time picker columns (that changes the selected time). Instead, scroll the PAGE using the browser scrollbar or by clicking outside the modal area and scrolling, then click Set. Alternatively, use DevTools console: `document.querySelector('kendo-popup button[class*="set"], kendo-popup button').click()` to click Set without scrolling.

---

## Fail Conditions

**FAIL-1 (Bug #5 active — fake Z in GetFieldValue):**
Step 9 returns `"2026-03-15T00:00:00.000Z"` — fake Z appended to local time.

- Interpretation: `getCalendarFieldValue()` is appending a literal `[Z]` to the local time string. Correct return is `"2026-03-15T00:00:00"` matching the raw stored value. This is Bug #5. Round-trip drift will occur if this value is fed back via `SetFieldValue()` — each trip shifts the stored time by -3h (BRT offset).

**FAIL-2 (V2 active — wrong code path):**
P5 returns `true`.

- Interpretation: `useUpdatedCalendarValueLogic` is `true`; the form is running V2 (`initCalendarValueV2`). This TC documents V1 behavior. Verify the form is opened via the template URL in P4 (not an Object View URL with `?ObjectID=`). If V2 is confirmed active, this TC does not apply — create a separate V2 TC.

**FAIL-3 (Wrong timezone — isoRef shows UTC midnight):**
Step 10 returns `"2026-03-15T00:00:00.000Z"` (midnight UTC, no offset).

- Interpretation: The browser is running in UTC, not BRT. The timezone change in P1 did not take effect or Chrome was not restarted per P2. Abort, re-do P1–P3, and restart the test from the beginning.

**FAIL-4 (No value stored — raw returns empty string):**
Step 8 returns `""`.

- Interpretation: The Set button click did not register and the popup was dismissed without committing a value. Re-do the popup interaction from step 2. If the Set button is not reachable due to viewport clipping, use the DevTools workaround noted in the Test Steps blockquote.

---

## Related

| Reference              | Location                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block      | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.2 (Scenario 1 — Calendar Popup)                                          |
| Bug #5 analysis        | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Field config reference | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| Sibling TC (form load) | `tasks/date-handling/forms-calendar/test/tc-2-1-form-load-brt.md`                                                                      |
