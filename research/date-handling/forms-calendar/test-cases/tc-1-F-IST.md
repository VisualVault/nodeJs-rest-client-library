# TC-1-F-IST — Config F, Calendar Popup, IST: UTC datetime stored, IST midnight = prev-day UTC; GetFieldValue same (ignoreTZ no-op)

## Environment Specs

| Parameter               | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST (India Standard Time). No DST (India does not observe DST). |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`     |
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
            f.enableTime === false &&
            f.ignoreTimezone === true &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField11"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                                              | Test Data                                                                                      | Expected Result                                                                                       | ✓   |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                                                        | All P1–P6 checks pass                                                                                 | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6) | Calendar icon (`.k-icon.k-i-calendar`) in `.fd-cal-container` adjacent to `<FIELD_NAME>` input | Calendar popup opens; March 2026 visible                                                              | ☐   |
| 3   | Navigate popup to March 2026 if not already shown                   | —                                                                                              | Month header reads "March 2026"                                                                       | ☐   |
| 4   | Click day 15                                                        | Cell with title "Sunday, March 15, 2026"                                                       | Popup closes immediately (no time tab — `enableTime=false`); target field input displays `03/15/2026` | ☐   |
| 5   | Capture raw stored value                                            | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` ``                           | `"2026-03-14T18:30:00.000Z"`                                                                          | ☐   |
| 6   | Capture GetFieldValue                                               | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                                                  | `"2026-03-14T18:30:00.000Z"`                                                                          | ☐   |
| 7   | Capture isoRef and confirm timezone                                 | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                                           | `"2026-03-14T18:30:00.000Z"` — confirms IST active                                                    | ☐   |

> The legacy popup path closes immediately on day selection for `enableTime=false` fields — there is no time tab. If the popup does not close after clicking the day, the wrong field or wrong config is being tested.

> The raw stored value is a full UTC ISO datetime string representing IST midnight — not the date-only string produced by the modern path (Configs A/B). The UTC representation of 2026-03-15 00:00 IST is 2026-03-14T18:30:00Z — the UTC date is the previous calendar day. The form display (`03/15/2026`) shows the correct local date because the display layer re-converts to local time.

> `ignoreTimezone=true` (Config F) produces identical storage to `ignoreTimezone=false` (Config E) on the legacy popup path. The `ignoreTZ` flag has no effect on how the legacy calendar popup stores the selected date.

## Fail Conditions

**FAIL-1 (TZ not IST):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns a value other than `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not `Asia/Calcutta`. BRT would return `"2026-03-15T03:00:00.000Z"`, UTC+0 would return `"2026-03-15T00:00:00.000Z"`. Abort, re-run P1 and P2 in full.

**FAIL-2 (V2 active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 code path is active. This test was written for V1 behavior. Check that the form URL has no `?ObjectID=` parameter and re-verify the account's server flag.

**FAIL-3 (modern path stored date-only):**
Raw value is `"2026-03-14"` or `"2026-03-15"` — date-only string with no time component.

- Interpretation: The `useLegacy=true` flag is not active on this field, or the field lookup in P6 resolved to a modern-path field. Verify P6 returned `["DataField11"]` and that `useLegacy=true` is confirmed in `fieldMaster`.

**FAIL-4 (ignoreTZ divergence from E-IST):**
Raw value differs from `"2026-03-14T18:30:00.000Z"` in a way consistent with a `ignoreTimezone` effect — e.g., `"2026-03-15T00:00:00.000Z"` (UTC midnight, as if `ignoreTZ=true` caused UTC storage instead of local).

- Interpretation: `ignoreTimezone=true` is affecting the legacy popup path in a way not seen for Config E. Document the actual value, update the analysis for the legacy path, and add a finding note that the legacy code path diverges between `ignoreTZ=false` (E) and `ignoreTZ=true` (F).

**FAIL-5 (Z stripped):**
Raw value is `"2026-03-14T18:30:00.000"` — full datetime present but Z suffix absent.

- Interpretation: Bug #4 (Legacy Save Format — `getSaveValue()` strips Z) is interacting with this path. Document the actual value and note this in the session log.

**FAIL-6 (wrong UTC date):**
Raw value contains `"2026-03-15"` as the date portion (e.g., `"2026-03-15T18:30:00.000Z"`).

- Interpretation: The stored value represents a different instant. If the date portion is `2026-03-15` (same as local), the browser may be running in UTC+0 despite the P3 check. Verify isoRef returns `"2026-03-14T18:30:00.000Z"` before investigating further.

**FAIL-7 (invalid or empty value):**
Raw value is `""`, `null`, `"Invalid Date"`, or `undefined`.

- Interpretation: The day click did not register. Close the popup, clear the field if needed, and retry from step 2.

## Related

| Reference                                          | Location                                              |
| -------------------------------------------------- | ----------------------------------------------------- |
| Matrix row                                         | `../matrix.md` — row `1-F-IST`                        |
| Run and summary                                    | `summaries/tc-1-F-IST.md`                             |
| Bug #2 (inconsistent popup vs typed handlers)      | `analysis.md` § Bug #2                                |
| Bug #4 (legacy save format strips Z)               | `analysis.md` § Bug #4                                |
| Bug #7 (SetFieldValue wrong day UTC+)              | `analysis.md` § Bug #7                                |
| Sibling — Config E same TZ (direct comparison)     | `tc-1-E-IST.md`                                       |
| Sibling — Config F BRT (same config, different TZ) | `tc-1-F-BRT.md`                                       |
| Field config reference                             | `research/date-handling/CLAUDE.md` § Test Form Fields |
