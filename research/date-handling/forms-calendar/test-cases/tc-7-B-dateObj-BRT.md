# TC-7-B-dateObj-BRT — Config B, SetFieldValue Date object, BRT: stored as-is; ignoreTZ inert on date-only

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `new Date(2026, 2, 15)` = `2026-03-15T03:00:00.000Z` UTC    |

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
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["Field10"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

---

## Test Steps

| #   | Action                                       | Test Data                                                      | Expected Result                                    | ✓   |
| --- | -------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                               | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set value via Date object (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', new Date(2026, 2, 15))` | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture raw stored value (DevTools console)  | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 4   | Capture GetFieldValue (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"` — date string, no transformation    | ☐   |
| 5   | Confirm browser timezone (DevTools console)  | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> Date object input safe in BRT. `moment(Date).toDate()` preserves local midnight → `getSaveValue()` extracts `"2026-03-15"`. Identical to Config A dateObj-BRT. In IST, this same input causes a double-shift (-2 days) — see `tc-7-B-dateObj-IST.md`.

---

## Fail Conditions

**FAIL-1 (Wrong date stored):**
Step 3 returns a value other than `"2026-03-15"`.

- Interpretation: Bug #7 should NOT fire in BRT. If it stores `"2026-03-14"`, the timezone may not be BRT or a regression has occurred.

**FAIL-2 (Wrong timezone):**
Step 5 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

---

## Related

| Reference              | Location                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `7-B-dateObj-BRT`                                                    |
| Results index          | `../results.md` § Session 2026-04-03                                                      |
| Config A sibling       | [`tc-7-A-dateObj-BRT.md`](tc-7-A-dateObj-BRT.md) — identical behavior (ignoreTZ inert)    |
| IST sibling            | [`tc-7-B-dateObj-IST.md`](tc-7-B-dateObj-IST.md) — Bug #7 double-shift, stores -2 days    |
| Date string sibling    | [`tc-7-B-dateOnly-BRT.md`](tc-7-B-dateOnly-BRT.md) — same Config B with date string input |
| Field config reference | `research/date-handling/CLAUDE.md` — Config B (`enableTime=false`, `ignoreTimezone=true`) |
