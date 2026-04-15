# TC-8-H-IST — Config H, GetFieldValue, IST: raw value unchanged; TZ-invariant, same as H-BRT

## Environment Specs

| Parameter               | Required Value                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                               |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST.                                               |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                               |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)               |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15T00:00:00`, IST — set via SetFieldValue, then read via GetFieldValue        |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

**P1 — Set system timezone to `Asia/Calcutta`:**

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
sudo timedatectl set-timezone Asia/Calcutta
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0530
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
            f.ignoreTimezone === true &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["Field13"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set value (DevTools console)                | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')` | Field displays `03/15/2026 12:00 AM`               | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                            | ☐   |
| 4   | Capture GetFieldValue (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — raw value unchanged      | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> Config H GFV is TZ-invariant — returns raw stored value regardless of browser timezone. This IST run confirms the BRT result (tc-8-H-BRT). Unlike Config D (same flags except `useLegacy=false`) where Bug #5 adds fake Z in both BRT and IST, Config H returns raw in both. The `useLegacy=true` flag is the deterministic Bug #5 countermeasure.

---

## Fail Conditions

**FAIL-1 (GFV returns value with Z suffix):**
Step 4 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Legacy DateTime GFV is applying fake Z or UTC conversion in IST. This would contradict H-BRT behavior — escalate immediately.

**FAIL-2 (Wrong timezone):**
Step 5 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-3 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config H flags.

---

## Related

| Reference              | Location                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `8-H-IST`                                                                             |
| Analysis               | `../analysis.md` — useLegacy=true bypasses Bug #5                                                          |
| Sibling (BRT)          | [`tc-8-H-BRT.md`](tc-8-H-BRT.md) — same result, confirms TZ-invariance                                     |
| Config D comparison    | [`tc-8-D-IST.md`](tc-8-D-IST.md) — same flags except useLegacy=false; Bug #5 fake Z                        |
| Config G sibling       | [`tc-8-G-BRT.md`](tc-8-G-BRT.md) — legacy DateTime, ignoreTimezone=false, also raw                         |
| Field config reference | `research/date-handling/CLAUDE.md` — Config H (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`) |
