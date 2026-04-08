# TC-4-FAR-AA-IST — FillinRelate A→A, IST: A→A IST: FORM-BUG-7 at source shifts to Mar 14; Bug #7

## Environment Specs

| Parameter               | Required Value                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                            |
| **System Timezone**     | `Asia/Kolkata` — UTC+5:30, IST. Fixed offset, no DST.                                               |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                            |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                            |
| **Source Field Config** | Config A: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Target Field Config** | Config A: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableQListener=true`     |
| **Scenario**            | Source SFV(`2026-03-15`) → GFV → URL param → Target A, IST                                          |

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

| #   | Action                                                       | Test Data                                                                                                                                                                                                                                      | Expected Result           | ✓   |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --- |
| 1   | Complete setup                                               | See Preconditions P1–P5                                                                                                                                                                                                                        | All checks pass           | ☐   |
| 2   | Set value on source Config A field                           | `VV.Form.SetFieldValue('Field7', '2026-03-15')`                                                                                                                                                                                                | Field displays date       | ☐   |
| 3   | Capture source raw value                                     | `VV.Form.VV.FormPartition.getValueObjectValue('Field7')`                                                                                                                                                                                       | `"2026-03-14"`            | ☐   |
| 4   | Capture source GFV (this is what FillinAndRelate passes)     | `VV.Form.GetFieldValue('Field7')`                                                                                                                                                                                                              | `"2026-03-14"`            | ☐   |
| 5   | Open TargetDateTest with GFV value as URL param for Config A | Navigate to: `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=203734a0-5433-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939&Field7=<Step 4 value, URL-encoded>` | TargetDateTest form loads | ☐   |
| 6   | Capture target raw value                                     | `VV.Form.VV.FormPartition.getValueObjectValue('Field7')`                                                                                                                                                                                       | `"2026-03-14"`            | ☐   |
| 7   | Capture target API value                                     | `VV.Form.GetFieldValue('Field7')`                                                                                                                                                                                                              | `"2026-03-14"`            | ☐   |

## Fail Conditions

**FAIL-1 (Source GFV mismatch):** Step 4 returns a value different from `"2026-03-14"`.

- Interpretation: Source field GFV behavior differs from expected. The chain test depends on the correct source output.

**FAIL-2 (Target raw mismatch):** Step 6 returns a value different from `"2026-03-14"`.

- Bugs exercised: Bug #7
- Interpretation: A→A IST: FORM-BUG-7 at source shifts to Mar 14. Target receives and preserves the wrong date. URL path itself is safe — damage is upstream.

**FAIL-3 (Target API mismatch):** Step 7 returns a value different from `"2026-03-14"`.

- Interpretation: Target GFV applies an unexpected transformation.

**FAIL-4 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted.

## Related

| Reference               | Location                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `4-FAR-AA-IST`                                    |
| Run history             | [`summaries/tc-4-FAR-AA-IST.md`](../summaries/tc-4-FAR-AA-IST.md)   |
| Latest run              | [`runs/tc-4-FAR-AA-IST-run-1.md`](../runs/tc-4-FAR-AA-IST-run-1.md) |
| FillinAndRelate example | `examples/fillinandrelated.js` — production pattern                 |
| Bug #1 analysis         | `analysis/bug-1-timezone-stripping.md`                              |
| Bug #5 analysis         | `analysis/bug-5-fake-z-getfieldvalue.md`                            |
| Bug #7 analysis         | `analysis/bug-7-wrong-day-utc-plus.md`                              |
