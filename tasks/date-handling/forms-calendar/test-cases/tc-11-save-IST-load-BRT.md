# TC-11-save-IST-load-BRT — Config A+D, Cross-TZ Reload, IST→BRT: raw preserved; Config A shows IST save-time corruption

## Environment Specs

| Parameter               | Required Value                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                                                                                                               |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                                                                                                                                      |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                                                                                                               |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                                                                                                               |
| **Target Field Config** | Config A: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`; Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | IST-saved record reloaded in BRT — Config A stored `"2026-03-14"` (FORM-BUG-7 at IST save time); Config D stored `"2026-03-15T00:00:00"` correctly                                                     |

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

**P4 — Open the IST-saved record** (DateTest-000084):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=28e371b7-e4e2-456a-94ab-95105ad97d0e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record (DateTest-000084) was saved from IST (UTC+5:30, 2026-04-01). Config A was set to `03/15/2026` but FORM-BUG-7 at IST save time stored `"2026-03-14"` (-1 day). Config D stored `"2026-03-15T00:00:00"` correctly. This test verifies the BRT load path faithfully renders whatever was stored — it does not re-corrupt.

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target fields by configuration** (DevTools console, after form loads):

Config A:

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

Config D:

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
// Expected: ["Field5"]
```

> If either P6 returns no fields, the test form does not have a field with that configuration — stop and report.

---

## Test Steps

| #   | Action                                      | Test Data                                                          | Expected Result                                      | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                            | All P1–P6 checks pass                                | ☐   |
| 2   | Verify record loaded                        | Tab title or form header                                           | Title contains `DateTest-000084`                     | ☐   |
| 3   | Capture Config A raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<CONFIG_A_FIELD>')` | `"2026-03-15"` — correct: original intent was Mar 15 | ☐   |
| 4   | Capture Config A GFV (DevTools console)     | `VV.Form.GetFieldValue('<CONFIG_A_FIELD>')`                        | `"2026-03-15"`                                       | ☐   |
| 5   | Capture Config D raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<CONFIG_D_FIELD>')` | `"2026-03-15T00:00:00"`                              | ☐   |
| 6   | Capture Config D GFV (DevTools console)     | `VV.Form.GetFieldValue('<CONFIG_D_FIELD>')`                        | `"2026-03-15T00:00:00"` — correct: no fake Z         | ☐   |
| 7   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                     | `"2026-03-15T03:00:00.000Z"` — confirms BRT active   | ☐   |

---

## Fail Conditions

**FAIL-1 (Config A shows "2026-03-14"):** Steps 3–4 return `"2026-03-14"` instead of `"2026-03-15"`.

- Interpretation: This is the value stored at IST save time when FORM-BUG-7 corrupted Mar 15 → Mar 14. The BRT load faithfully shows the pre-existing corruption — the load path itself is correct. The original intent was Mar 15, but IST save-time FORM-BUG-7 already shifted it to Mar 14 in the database. This is not a load-time bug.

**FAIL-2 (Config D fake Z):** Step 6 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: FORM-BUG-5 fake Z appended by `getCalendarFieldValue()`. The `.000Z` suffix makes the value appear to be UTC when it is actually local time. Expected for Config D under V1 — this is a known GFV transformation bug.

**FAIL-3 (Wrong timezone):** Step 7 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-4 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-5 (Field not found):** Either P6 query returns no matching fields.

- Interpretation: DateTest form does not have a field with the expected configuration flags.

---

## Related

| Reference                               | Location                                                                |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Matrix row                              | `matrix.md` — row `11-save-IST-load-BRT`                                |
| IST save record                         | DateTest-000084 Rev 1, saved from IST 2026-04-01                        |
| BRT→IST sibling: 11-A-save-BRT-load-IST | [tc-11-A-save-BRT-load-IST.md](tc-11-A-save-BRT-load-IST.md)            |
| Bug #7 analysis                         | `analysis/overview.md` — FORM-BUG-7: date-only midnight parsing in UTC+ |
| Bug #5 analysis                         | `analysis/overview.md` — FORM-BUG-5: Fake [Z] in GetFieldValue          |
| Field config reference                  | `matrix.md` — Field Configurations table, Config A and Config D         |
