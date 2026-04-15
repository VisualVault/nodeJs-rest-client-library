# TC-1-H-IST — Config H, Calendar Popup, IST: legacy popup stores UTC datetime; ignoreTZ no-op; GFV same (no fake Z)

## Environment Specs

| Parameter               | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST (India Standard Time). No DST (India does not observe DST). |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`      |
| **Scenario**            | 2026-03-15, IST midnight — 2026-03-15T00:00:00+05:30 = 2026-03-14T18:30:00Z UTC             |

## Preconditions

**P1 — Set system timezone to `Asia/Calcutta`:**

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

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```
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

## Test Steps

| #   | Action                                                              | Test Data                                                                                      | Expected Result                                                                                      | ✓   |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                                                        | All P1–P6 checks pass                                                                                | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6) | Calendar icon (`.k-icon.k-i-calendar`) in `.fd-cal-container` adjacent to `<FIELD_NAME>` input | Calendar popup opens; March 2026 visible                                                             | ☐   |
| 3   | Navigate popup to March 2026 if not already shown                   | —                                                                                              | Month header reads "March 2026"                                                                      | ☐   |
| 4   | Click day 15                                                        | Cell with title "Sunday, March 15, 2026"                                                       | Popup closes immediately (no Time tab — see note); target field input displays `03/15/2026 12:00 AM` | ☐   |
| 5   | Capture raw stored value                                            | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` ``                           | `"2026-03-15T00:00:00"`                                                                              | ☐   |
| 6   | Capture GetFieldValue                                               | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                                                  | `"2026-03-15T00:00:00"`                                                                              | ☐   |
| 7   | Capture isoRef and confirm timezone                                 | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                                           | `"2026-03-14T18:30:00.000Z"` — confirms IST active                                                   | ☐   |

> Unlike modern DateTime configs (C/D), the legacy DateTime popup (`useLegacy=true`, `enableTime=true`) closes immediately on day click — **there is no Time tab**. The time is forced to midnight local time (00:00 IST). If the popup does not close after clicking the day and instead advances to a Time tab, the field is not using the legacy popup path — verify P6 returned the correct field name and that `useLegacy=true` is set in the field config.

> The field input display shows `03/15/2026 12:00 AM` — the time component is shown because `enableTime=true`, but it is always forced to midnight since the popup does not provide time selection.

> Config H adds `ignoreTimezone=true` compared to Config G. On the legacy popup path, this flag has no effect — the popup stores the raw `toISOString()` of the Date object regardless of the `ignoreTimezone` setting. The Expected values are identical to tc-1-G-IST.

## Fail Conditions

**FAIL-1 (Legacy UTC datetime stored — prev-day UTC date):**
Raw value is `"2026-03-14T18:30:00.000Z"` instead of `"2026-03-15T00:00:00"`. GetFieldValue also returns `"2026-03-14T18:30:00.000Z"`.

- Interpretation: Legacy popup bypasses `getSaveValue()` and stores raw `toISOString()` of the Date object. IST midnight (2026-03-15 00:00 IST) = 2026-03-14T18:30:00Z in UTC — the UTC date is the previous calendar day. Two failure modes compound: (1) legacy format stores full UTC datetime with Z instead of local-time format without Z, and (2) for UTC+ timezones the UTC date portion shifts to the previous day. Identical to tc-1-G-IST — `ignoreTimezone=true` has no effect on the legacy popup storage path. The correct storage would be `"2026-03-15T00:00:00"` — local midnight without Z, same as Config D (non-legacy equivalent) stores in IST.

**FAIL-2 (TZ not IST):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns a value other than `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not `Asia/Calcutta`. BRT would return `"2026-03-15T03:00:00.000Z"`, UTC+0 would return `"2026-03-15T00:00:00.000Z"`. Abort, re-run P1 and P2 in full.

**FAIL-3 (Time tab appeared — legacy path not active):**
Popup did not close after clicking day 15 — it advanced to a Time tab instead.

- Interpretation: The field is not using the legacy DateTime popup path. Either `useLegacy=true` is not set on this field, or the field lookup in P6 resolved to a non-legacy field. Verify P6 returned the correct field name and that `useLegacy=true` is confirmed in the field config.

**FAIL-4 (V2 active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 code path is active. This test was written for V1 behavior. Check that the form URL has no `?ObjectID=` parameter and re-verify the account's server flag.

**FAIL-5 (ignoreTZ caused divergence from Config G):**
Raw value differs from `"2026-03-14T18:30:00.000Z"` AND from `"2026-03-15T00:00:00"` — e.g., a value like `"2026-03-15T00:00:00.000Z"` or `"2026-03-15T00:00:00"`.

- Interpretation: The `ignoreTimezone=true` flag IS affecting the legacy popup path — contrary to all previous observations (1-F-IST, 1-F-BRT, 1-H-BRT all confirmed ignoreTZ as a no-op). Document the exact value and compare with tc-1-G-IST to isolate the effect. Escalate to analysis.md.

**FAIL-6 (invalid or empty value):**
Raw value is `""`, `null`, `"Invalid Date"`, or `undefined`.

- Interpretation: The day click did not register or was intercepted. Close the popup, clear the field if needed, and retry from step 2.

## Related

| Reference                                           | Location                                              |
| --------------------------------------------------- | ----------------------------------------------------- |
| Matrix row                                          | `../matrix.md` — row `1-H-IST`                        |
| Run 1 results                                       | `runs/tc-1-H-IST-run-1.md`                            |
| Summary                                             | `summaries/tc-1-H-IST.md`                             |
| Bug #2 (inconsistent popup vs typed handlers)       | `analysis.md` § Bug #2                                |
| Bug #4 (legacy save format strips Z)                | `analysis.md` § Bug #4                                |
| Sibling — Config H, BRT                             | `tc-1-H-BRT.md`                                       |
| Sibling — Config G, IST (ignoreTZ=false equivalent) | `tc-1-G-IST.md`                                       |
| Sibling — Config E, IST (date-only legacy)          | `tc-1-E-IST.md`                                       |
| Sibling — Config F, IST (date-only + ignoreTZ)      | `tc-1-F-IST.md`                                       |
| Field config reference                              | `research/date-handling/CLAUDE.md` § Test Form Fields |
