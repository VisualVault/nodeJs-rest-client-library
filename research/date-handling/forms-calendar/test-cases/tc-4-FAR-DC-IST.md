# TC-4-FAR-DC-IST — FillinRelate D→C, IST: D→C IST: Source fake Z (IST midnight labeled as UTC) → target C stores IST 05:30 Mar 15; Bug #5

## Environment Specs

| Parameter               | Required Value                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                          |
| **System Timezone**     | `Asia/Kolkata` — UTC+5:30, IST. Fixed offset, no DST.                                             |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                          |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                          |
| **Source Field Config** | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Target Field Config** | Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableQListener=true`    |
| **Scenario**            | Source SFV(`2026-03-15T00:00:00`) → GFV → URL param → Target C, IST                               |

## Preconditions

**P1 — Set system timezone to `Asia/Kolkata`:**

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
sudo timedatectl set-timezone Asia/Kolkata
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT+0530"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the source DateTest form** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active
```

## Test Steps

| #   | Action                                                       | Test Data                                                                                                                                                                                                                                      | Expected Result              | ✓   |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --- |
| 1   | Complete setup                                               | See Preconditions P1–P5                                                                                                                                                                                                                        | All checks pass              | ☐   |
| 2   | Set value on source Config D field                           | `VV.Form.SetFieldValue('Field5', '2026-03-15T00:00:00')`                                                                                                                                                                                       | Field displays date          | ☐   |
| 3   | Capture source raw value                                     | `VV.Form.VV.FormPartition.getValueObjectValue('Field5')`                                                                                                                                                                                       | `"2026-03-15T00:00:00"`      | ☐   |
| 4   | Capture source GFV (this is what FillinAndRelate passes)     | `VV.Form.GetFieldValue('Field5')`                                                                                                                                                                                                              | `"2026-03-15T00:00:00.000Z"` | ☐   |
| 5   | Open TargetDateTest with GFV value as URL param for Config C | Navigate to: `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=203734a0-5433-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939&Field6=<Step 4 value, URL-encoded>` | TargetDateTest form loads    | ☐   |
| 6   | Capture target raw value                                     | `VV.Form.VV.FormPartition.getValueObjectValue('Field6')`                                                                                                                                                                                       | `"2026-03-15T05:30:00"`      | ☐   |
| 7   | Capture target API value                                     | `VV.Form.GetFieldValue('Field6')`                                                                                                                                                                                                              | `"2026-03-15T00:00:00.000Z"` | ☐   |

## Fail Conditions

**FAIL-1 (Source GFV mismatch):** Step 4 returns a value different from `"2026-03-15T00:00:00.000Z"`.

- Interpretation: Source field GFV behavior differs from expected. The chain test depends on the correct source output.

**FAIL-2 (Target raw mismatch):** Step 6 returns a value different from `"2026-03-15T05:30:00"`.

- Bugs exercised: Bug #5
- Interpretation: D→C IST: Source fake Z (IST midnight labeled as UTC) → target C stores IST 05:30 Mar 15. The +5:30h shift turns midnight into early morning.

**FAIL-3 (Target API mismatch):** Step 7 returns a value different from `"2026-03-15T00:00:00.000Z"`.

- Interpretation: Target GFV applies an unexpected transformation.

**FAIL-4 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted.

## Related

| Reference               | Location                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `4-FAR-DC-IST`                                    |
| Run history             | [`summaries/tc-4-FAR-DC-IST.md`](../summaries/tc-4-FAR-DC-IST.md)   |
| Latest run              | [`runs/tc-4-FAR-DC-IST-run-1.md`](../runs/tc-4-FAR-DC-IST-run-1.md) |
| FillinAndRelate example | `examples/fillinandrelated.js` — production pattern                 |
| Bug #1 analysis         | `analysis/bug-1-timezone-stripping.md`                              |
| Bug #5 analysis         | `analysis/bug-5-fake-z-getfieldvalue.md`                            |
| Bug #7 analysis         | `analysis/bug-7-wrong-day-utc-plus.md`                              |
