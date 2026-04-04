# TC-8-F — Config F, GetFieldValue, any TZ: legacy date-only+ignoreTZ returns raw unchanged; same as E/A

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, any TZ — set via SetFieldValue, then read via GetFieldValue               |

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
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["Field11"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set value (DevTools console)                | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 4   | Capture GetFieldValue (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"` — raw value unchanged               | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> Config F (legacy date-only + ignoreTZ) behaves identically to Config E (legacy date-only) and Config A/B (non-legacy date-only). All date-only configs return the raw date string from GFV. The `ignoreTZ` and `useLegacy` flags are inert for date-only GFV.

---

## Fail Conditions

**FAIL-1 (GFV returns modified value):**
Step 4 returns anything other than `"2026-03-15"`.

- Interpretation: Legacy date-only GFV path is not returning raw value.

**FAIL-2 (Wrong timezone):**
Step 5 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config F flags.

---

## Related

| Reference              | Location                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `8-F`                                                                               |
| Analysis               | `../analysis.md` — no bugs for date-only GFV                                                             |
| Config E sibling       | [`tc-8-E.md`](tc-8-E.md) — legacy date-only without ignoreTZ                                             |
| Config A comparison    | [`tc-8-A.md`](tc-8-A.md) — non-legacy date-only, same behavior                                           |
| Config B comparison    | (matrix row `8-B`) — non-legacy date-only + ignoreTZ, same behavior                                      |
| Field config reference | `tasks/date-handling/CLAUDE.md` — Config F (`enableTime=false`, `ignoreTimezone=true`, `useLegacy=true`) |
