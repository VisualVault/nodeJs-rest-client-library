# TC-7-A-dateOnly — Config A, SetFieldValue date string, BRT: stored as-is; no bugs in UTC- timezone

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                         |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT — date-only field, no time component                                    |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

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
// PASS: output contains GMT-0300
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before proceeding.

**P5 — Verify V1 is the active code path** (run in DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 behavior before continuing
```

**P6 — Locate the target field by configuration** (run in DevTools console):

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
// Expected on current test form: ["DataField7"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                       | Test Data                                                      | Expected Result                                    | ✓   |
| --- | -------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                               | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set value via date string (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture raw stored value (DevTools console)  | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 4   | Capture GetFieldValue (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"` — date string, no transformation    | ☐   |
| 5   | Confirm browser timezone (DevTools console)  | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> Config A date-only fields store correctly in BRT (UTC-). Bug #7 only manifests in UTC+ timezones (IST, etc.). This test serves as the BRT control for the IST sibling `tc-7-A-dateOnly-IST.md`.

---

## Fail Conditions

**FAIL-1 (Wrong date stored):**
Step 3 returns a value other than `"2026-03-15"`.

- Interpretation: Bug #7 should NOT fire in BRT. If it stores `"2026-03-14"`, the timezone may not be BRT or a regression has occurred.

**FAIL-2 (Wrong timezone):**
Step 5 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active. Verify this test applies to V2 behavior before continuing.

**FAIL-4 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config A flags.

---

## Related

| Reference              | Location                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Matrix row             | `../matrix.md` — row `7-A-dateOnly`                                                        |
| Bug #7 analysis        | `../analysis.md` — Bug #7 absent in BRT (UTC-), fires in UTC+ only                         |
| IST sibling            | `tc-7-A-dateOnly-IST.md` — Bug #7 fires, stores previous day                               |
| ISO+Z sibling          | [`tc-7-A-isoZ.md`](tc-7-A-isoZ.md) — same Config A with ISO+Z input                        |
| Field config reference | `research/date-handling/CLAUDE.md` — Config A (`enableTime=false`, `ignoreTimezone=false`) |
