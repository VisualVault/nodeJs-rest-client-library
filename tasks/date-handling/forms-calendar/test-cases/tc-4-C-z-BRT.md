# TC-4-C-z-BRT — Config C, URL Parameter, BRT: Config C with Z; Bug #1

## Environment Specs

| Parameter               | Required Value                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                         |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                                                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                         |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                         |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`, `enableQListener=true` |
| **Scenario**            | URL param `Field6=2026-03-15T14:30:00.000Z`, BRT                                                                 |

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

**P4 — Open the TargetDateTest form with URL parameter** (creates a fresh instance with pre-filled field):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=203734a0-5433-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939&Field6=2026-03-15T14%3A30%3A00.000Z
```

> Note: This uses the **TargetDateTest** form (`enableQListener=true` on all fields), not the regular DateTest form.

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Verify enableQListener is active on target field** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter((f) => f.fieldType === 13 && f.name === 'Field6')
    .map((f) => ({ name: f.name, enableQListener: f.enableQListener }));
// Expected: [{ name: "Field6", enableQListener: true }]
```

## Test Steps

| #   | Action                                          | Test Data                                                | Expected Result                                  | ✓   |
| --- | ----------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ | --- |
| 1   | Complete setup                                  | See Preconditions P1–P6                                  | All P1–P6 checks pass                            | ☐   |
| 2   | Capture raw stored value (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('Field6')` | `"2026-03-15T11:30:00"`                          | ☐   |
| 3   | Capture GetFieldValue return (DevTools console) | `VV.Form.GetFieldValue('Field6')`                        | `"2026-03-15T14:30:00.000Z"`                     | ☐   |
| 4   | Confirm browser timezone (DevTools console)     | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`           | "2026-03-15T03:00:00.000Z" — confirms BRT active | ☐   |

## Fail Conditions

**FAIL-1 (Wrong raw value):** Step 2 returns a value different from `"2026-03-15T11:30:00"`.

- Bugs exercised: Bug #1
- Interpretation: Config C with Z. Raw shifts -3h (Z stripped, re-parsed as local). API recovers correct UTC via toISOString(). FORM-BUG-1 on raw, but API correct.

**FAIL-2 (Wrong API value):** Step 3 returns a value different from `"2026-03-15T14:30:00.000Z"`.

- Interpretation: GetFieldValue applies an unexpected transformation to the URL-param-sourced value.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted after the change.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 code path is active. This test was designed for V1.

## Related

| Reference              | Location                                                      |
| ---------------------- | ------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `4-C-z-BRT`                                 |
| Run history            | [`summaries/tc-4-C-z-BRT.md`](../summaries/tc-4-C-z-BRT.md)   |
| Latest run             | [`runs/tc-4-C-z-BRT-run-1.md`](../runs/tc-4-C-z-BRT-run-1.md) |
| Bug #1 analysis        | `analysis/bug-1-timezone-stripping.md`                        |
| Bug #5 analysis        | `analysis/bug-5-fake-z-getfieldvalue.md`                      |
| Field config reference | `matrix.md` — Field Configurations table, Config C            |
