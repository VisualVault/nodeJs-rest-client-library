# TC-9-GDOC-A-BRT-1 — Config A, GDOC Round-Trip, BRT: zero drift; date-only round-trips safely via real UTC

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                         |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC     |

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field7"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                                                | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                                                  | All P1–P6 checks pass                              | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                           | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15"`                                     | ☐   |
| 4   | Get GDOC ISO value (DevTools console)       | `var d = VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>'); d.toISOString()`                             | `"2026-03-15T03:00:00.000Z"`                       | ☐   |
| 5   | Execute GDOC round-trip (DevTools console)  | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>').toISOString())` | No error                                           | ☐   |
| 6   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15"`                                     | ☐   |
| 7   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                  | `"2026-03-15"`                                     | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Key contrast with IST**: In IST (UTC+5:30), the same GDOC round-trip on Config A causes -1 day shift because `normalizeCalValue` parses the ISO Z string → IST midnight = previous UTC day → date-only stores previous day (FORM-BUG-7). In BRT (UTC-3), local midnight falls on the same UTC day, so no date shift occurs.

---

## Fail Conditions

**FAIL-1 (Date shifted after round-trip):** Step 6 returns `"2026-03-14"` or any value other than `"2026-03-15"`.

- Interpretation: `normalizeCalValue` failed to preserve the date when parsing the ISO Z string from GDOC. In BRT this should not happen because `moment("2026-03-15T03:00:00.000Z").toDate()` produces Mar 15 00:00 BRT (same day). If the date shifts, there is an unexpected parsing issue.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config A flags.

---

## Related

| Reference                        | Location                                                                   |
| -------------------------------- | -------------------------------------------------------------------------- |
| Matrix row                       | `matrix.md` — row `9-GDOC-A-BRT-1`                                         |
| GDOC value source: 8B-A-BRT      | `matrix.md` — row `8B-A-BRT` (GDOC returns correct Date for Config A)      |
| IST sibling: 9-GDOC-A-IST-1      | `matrix.md` — row `9-GDOC-A-IST-1` (-1 day shift expected from FORM-BUG-7) |
| Config D sibling: 9-GDOC-D-BRT-1 | [tc-9-GDOC-D-BRT-1.md](tc-9-GDOC-D-BRT-1.md) — also 0 drift in BRT         |
| Bug #7 analysis                  | `analysis/overview.md` — FORM-BUG-7: date-only midnight parsing in UTC+    |
| Field config reference           | `matrix.md` — Field Configurations table, Config A                         |
