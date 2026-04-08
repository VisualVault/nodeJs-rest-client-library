# TC-9-GDOC-C-BRT-1 — Config C, GDOC Round-Trip, BRT: zero drift; real UTC matches GFV path

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC    |

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
// PASS: output contains "GMT-0300"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console, after form loads):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field6"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                                                | Expected Result                                            | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                                                  | All P1–P6 checks pass                                      | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                           | Field displays `03/15/2026 12:00 AM`                       | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15T00:00:00"`                                    | ☐   |
| 4   | Get GDOC ISO value (DevTools console)       | `var d = VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>'); d.toISOString()`                             | `"2026-03-15T03:00:00.000Z"`                               | ☐   |
| 5   | Execute GDOC round-trip (DevTools console)  | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>').toISOString())` | No error                                                   | ☐   |
| 6   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15T00:00:00"`                                    | ☐   |
| 7   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                  | `"2026-03-15T03:00:00.000Z"` — real UTC (same as GDOC ISO) | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active         | ☐   |

> **Why this is trivially stable**: Config C (`ignoreTimezone=false`) GFV already returns real UTC via `new Date(value).toISOString()`. GDOC's `.toISOString()` produces the same real UTC string. The GDOC round-trip is therefore identical to the GFV round-trip for Config C — both stable. This test confirms GDOC adds no additional risk for Config C.

---

## Fail Conditions

**FAIL-1 (Post-trip raw shifted):** Step 6 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: Unexpected drift in GDOC round-trip. Since GDOC produces the same real UTC as GFV for Config C, drift here would imply a fundamental issue in `normalizeCalValue`'s handling of ISO Z strings for DateTime fields.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config C flags.

---

## Related

| Reference                                         | Location                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Matrix row                                        | `matrix.md` — row `9-GDOC-C-BRT-1`                                                              |
| GFV round-trip sibling: 9-C-BRT-1                 | `matrix.md` — row `9-C-BRT-1` (also 0 drift — Config C GFV = real UTC)                          |
| Config D GDOC: 9-GDOC-D-BRT-1                     | [tc-9-GDOC-D-BRT-1.md](tc-9-GDOC-D-BRT-1.md) — also 0 drift (real UTC)                          |
| Config C near-midnight: 12-config-C-near-midnight | [tc-12-config-C-near-midnight.md](tc-12-config-C-near-midnight.md) — GFV round-trip also stable |
| Field config reference                            | `matrix.md` — Field Configurations table, Config C                                              |
