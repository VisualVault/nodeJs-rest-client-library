# TC-7-G-isoZ-BRT — Config G, SetFieldValue ISO with Z, BRT: UTC→local shift stored; GFV returns raw (no reconversion)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15T00:00:00.000Z` (ISO with Z), BRT — legacy DateTime field, UTC→local shift   |

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
            f.enableTime === true &&
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["Field14"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

---

## Test Steps

| #   | Action                                      | Test Data                                                           | Expected Result                                                           | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                             | All P1–P6 checks pass                                                     | ☐   |
| 2   | Set value via ISO with Z (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00.000Z')` | Field displays `03/14/2026 09:00 PM`                                      | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`      | `"2026-03-14T21:00:00"` (UTC midnight → BRT = Mar 14 21:00)               | ☐   |
| 4   | Capture GetFieldValue (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                             | `"2026-03-14T21:00:00"` — raw value, no UTC reconversion (useLegacy=true) | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                      | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                        | ☐   |

> The UTC→local shift is **correct behavior** — the Z suffix is honored, and UTC midnight correctly converts to BRT 21:00 the previous day. The shifted stored value is NOT a bug. Key difference from Config C isoZ: Config C GFV would reconvert to UTC `"2026-03-15T00:00:00.000Z"`, but Config G (`useLegacy=true`) returns the raw local value without reconversion.

---

## Fail Conditions

**FAIL-1 (Wrong stored value):**
Step 3 returns a value other than `"2026-03-14T21:00:00"`.

- Interpretation: The Z suffix should trigger UTC→local conversion. UTC midnight minus 3 hours = Mar 14 21:00 BRT. If the value differs, the conversion logic may have changed.

**FAIL-2 (GFV applies UTC reconversion):**
Step 4 returns a value ending in `Z` or different from step 3.

- Interpretation: `useLegacy=true` should bypass `getCalendarFieldValue()` UTC reconversion. If GFV returns a different value than raw, the legacy bypass may not be working.

**FAIL-3 (Wrong timezone):**
Step 5 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

---

## Related

| Reference               | Location                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Matrix row              | `../matrix.md` — row `7-G-isoZ-BRT`                                                 |
| Results index           | `../results.md` § Session 2026-04-03                                                |
| Config G isoNoZ sibling | [`tc-7-G-isoNoZ-BRT.md`](tc-7-G-isoNoZ-BRT.md) — no-Z input: stored as-is           |
| Config C isoZ sibling   | [`tc-7-C-isoZ.md`](tc-7-C-isoZ.md) — non-legacy: GFV reconverts to UTC              |
| Field config reference  | `research/date-handling/CLAUDE.md` — Config G (`enableTime=true`, `useLegacy=true`) |
