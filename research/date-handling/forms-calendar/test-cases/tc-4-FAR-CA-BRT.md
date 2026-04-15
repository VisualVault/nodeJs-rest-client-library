# TC-4-FAR-CA-BRT — FillinRelate C→A, BRT: C→A BRT: Source C returns "2026-03-15T03:00:00

## Environment Specs

| Parameter               | Required Value                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                           |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                                  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                           |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                           |
| **Source Field Config** | Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Target Field Config** | Config A: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableQListener=true`    |
| **Scenario**            | Source SFV(`2026-03-15T00:00:00`) → GFV → URL param → Target A, BRT                                |

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
// PASS: output contains "GMT-0300"
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
| 2   | Set value on source Config C field                           | `VV.Form.SetFieldValue('Field6', '2026-03-15T00:00:00')`                                                                                                                                                                                       | Field displays date          | ☐   |
| 3   | Capture source raw value                                     | `VV.Form.VV.FormPartition.getValueObjectValue('Field6')`                                                                                                                                                                                       | `"2026-03-15T00:00:00"`      | ☐   |
| 4   | Capture source GFV (this is what FillinAndRelate passes)     | `VV.Form.GetFieldValue('Field6')`                                                                                                                                                                                                              | `"2026-03-15T03:00:00.000Z"` | ☐   |
| 5   | Open TargetDateTest with GFV value as URL param for Config A | Navigate to: `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=203734a0-5433-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939&Field7=<Step 4 value, URL-encoded>` | TargetDateTest form loads    | ☐   |
| 6   | Capture target raw value                                     | `VV.Form.VV.FormPartition.getValueObjectValue('Field7')`                                                                                                                                                                                       | `"2026-03-15"`               | ☐   |
| 7   | Capture target API value                                     | `VV.Form.GetFieldValue('Field7')`                                                                                                                                                                                                              | `"2026-03-15"`               | ☐   |

## Fail Conditions

**FAIL-1 (Source GFV mismatch):** Step 4 returns a value different from `"2026-03-15T03:00:00.000Z"`.

- Interpretation: Source field GFV behavior differs from expected. The chain test depends on the correct source output.

**FAIL-2 (Target raw mismatch):** Step 6 returns a value different from `"2026-03-15"`.

- Bugs exercised: none
- Interpretation: C→A BRT: Source C returns "2026-03-15T03:00:00.000Z". Target A (date-only) truncates at T → "2026-03-15". Correct date preserved despite UTC time.

**FAIL-3 (Target API mismatch):** Step 7 returns a value different from `"2026-03-15"`.

- Interpretation: Target GFV applies an unexpected transformation.

**FAIL-4 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted.

## Related

| Reference               | Location                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `4-FAR-CA-BRT`                                    |
| Run history             | [`summaries/tc-4-FAR-CA-BRT.md`](../summaries/tc-4-FAR-CA-BRT.md)   |
| Latest run              | [`runs/tc-4-FAR-CA-BRT-run-1.md`](../runs/tc-4-FAR-CA-BRT-run-1.md) |
| FillinAndRelate example | `examples/fillinandrelated.js` — production pattern                 |
| Bug #1 analysis         | `analysis/bug-1-timezone-stripping.md`                              |
| Bug #5 analysis         | `analysis/bug-5-fake-z-getfieldvalue.md`                            |
| Bug #7 analysis         | `analysis/bug-7-wrong-day-utc-plus.md`                              |
