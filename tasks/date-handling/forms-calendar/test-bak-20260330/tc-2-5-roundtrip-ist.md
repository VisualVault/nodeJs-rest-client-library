# TC-2.5 — Config D, Round-Trip, IST: date shifts +5:30h per trip; Bug #5 fake Z drifts forward

---

## Environment Specs

| Parameter               | Value                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, India Standard Time. No DST (India does not observe DST).   |
| **Platform**            | VisualVault FormViewer, Build `20260304.1`                                              |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | 2026-03-15, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00` UTC      |

> **IST verification note**: The live IST session (results.md Test 2.9) was conducted via Chrome DevTools Sensors → Timezone ID override set to `Asia/Calcutta`. This overrides JavaScript `Date` behavior per-tab without requiring a system restart. The IST values in this TC were also independently verified arithmetically in BRT (UTC-3): `new Date("2026-03-15T00:00:00.000Z")` UTC midnight + 330min = `2026-03-15T05:30:00` IST local. Both methods produce identical expected values.

---

## Preconditions

**P1 — Set browser/system timezone to `Asia/Calcutta`:**

**Option A — Chrome DevTools timezone override (no restart needed, tab-scoped):**

1. Open DevTools (F12)
2. Click ⋮ → More tools → Sensors
3. Under "Location", find the "Timezone ID" field
4. Enter `Asia/Calcutta` and press Enter
5. Reload the form tab — the override takes effect on reload

**Option B — System timezone change (recommended for full reproducibility):**

macOS:

```bash
sudo systemsetup -settimezone Asia/Calcutta
```

Windows (run as Administrator):

```bat
tzutil /s "India Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "India Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone Asia/Calcutta
```

**P2 — Restart Chrome** (only required if using Option B — system timezone change).

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0530
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

| #   | Action                                                   | Test Data                                                                      | Expected Result                                    | ✓   |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                                           | See Preconditions P1–P6                                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set initial value on the target field (identified in P6) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | No error returned                                  | ☐   |
| 3   | Verify initial display                                   | Read the target field input                                                    | `03/15/2026 12:00 AM`                              | ☐   |
| 4   | Capture initial raw stored value                         | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                            | ☐   |
| 5   | Capture initial GetFieldValue                            | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00.000Z"` — fake Z (Bug #5)     | ☐   |
| 6   | Execute round-trip                                       | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error returned                                  | ☐   |
| 7   | Verify display after round-trip                          | Read the target field input                                                    | `03/15/2026 05:30 AM`                              | ☐   |
| 8   | Capture raw stored value after round-trip                | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T05:30:00"`                            | ☐   |
| 9   | Capture GetFieldValue after round-trip                   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T05:30:00.000Z"` — fake Z (Bug #5)     | ☐   |
| 10  | Verify environment (isoRef)                              | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Drift mechanism in IST**: `GetFieldValue` appends a literal `Z` to the stored local midnight (`"2026-03-15T00:00:00"` → `"2026-03-15T00:00:00.000Z"`). In IST, `new Date("2026-03-15T00:00:00.000Z")` = UTC midnight = **March 15 05:30 AM IST** (UTC+5:30 ahead). Each round-trip advances the stored time by 5 hours and 30 minutes. After ~4–5 trips the time crosses midnight and the **calendar date shifts to March 16**.
>
> **Direction contrast**: In BRT (UTC-3) the same bug drifts _backward_ by 3 hours per trip (see tc-2-3-roundtrip-brt.md). In IST (UTC+5:30) it drifts _forward_ by 5.5 hours. In London (UTC+0) there is no drift — see tc-2-4-cross-tz-brt.md for the full cross-timezone analysis.

---

## Fail Conditions

**FAIL-1 (No drift — Bug #5 absent or fixed):**
Step 8 returns `"2026-03-15T00:00:00"` (unchanged). Step 7 display still reads `03/15/2026 12:00 AM`.

- Interpretation: `getCalendarFieldValue()` no longer appends fake Z. Verify build matches `20260304.1` and re-run P5.

**FAIL-2 (Drift is backward, not forward):**
Step 8 returns a value earlier than `"2026-03-15T00:00:00"` — e.g., `"2026-03-14T21:00:00"` (-3h).

- Interpretation: Browser is running in a UTC- timezone (e.g., BRT), not IST. In UTC- timezones, Bug #5 drift is backward. Verify P3 shows `GMT+0530`. If you see `GMT-0300`, the DevTools override was not applied or Chrome was not reloaded after P1.

**FAIL-3 (Wrong drift magnitude):**
Step 8 returns a time other than `"2026-03-15T05:30:00"` — e.g., `"2026-03-15T09:00:00"` (+9h for JST) or `"2026-03-15T01:00:00"` (+1h for CET).

- Interpretation: Browser is in a different UTC+ timezone. The drift equals the active offset, not IST's +5:30. Verify P3 shows `GMT+0530`.

**FAIL-4 (V2 active — wrong code path):**
P5 returns `true`.

- Interpretation: V2 (`useUpdatedCalendarValueLogic=true`) is active. This TC documents V1 behavior. Verify the form is opened via the template URL in P4, not an Object View URL with `?ObjectID=`.

**FAIL-5 (Wrong isoRef — BRT or UTC detected):**
Step 10 returns `"2026-03-15T03:00:00.000Z"` (BRT) or `"2026-03-15T00:00:00.000Z"` (UTC) instead of `"2026-03-14T18:30:00.000Z"`.

- Interpretation: The DevTools timezone override (Option A) was not applied or did not take effect. If `"2026-03-15T03:00:00.000Z"` appears, the form is still in BRT — re-apply the DevTools Sensors override and reload the form tab. If `"2026-03-15T00:00:00.000Z"` appears, UTC is active.

---

## Related

| Reference                                 | Location                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block                         | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.5 (LIVE Cross-Timezone Test — Mumbai UTC+5:30)                           |
| Bug #5 analysis                           | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Field config reference                    | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| BRT round-trip (opposite drift direction) | `tasks/date-handling/forms-calendar/test/tc-2-3-roundtrip-brt.md`                                                                      |
| Cross-timezone drift analysis             | `tasks/date-handling/forms-calendar/test/tc-2-4-cross-tz-brt.md`                                                                       |
| Sibling TC (calendar popup base state)    | `tasks/date-handling/forms-calendar/test/tc-2-2-calendar-popup-brt.md`                                                                 |
