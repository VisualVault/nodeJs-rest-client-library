# TC-14-D-API — Config D, API Read, BRT: server returns ISO+Z identically to Config C

## Environment Specs

| Parameter           | Required Value                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                                  |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                                           |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                                  |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                                               |
| Target Field Config | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`                   |
| Scenario            | API read of saved Config D value — verify server returns `"2026-03-15T00:00:00Z"` identically to Config C |

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
// PASS: output contains GMT-0300
// FAIL: any other offset — abort
```

**P4 — Open the DateTest form template:**

```
/FormViewer/app?hidemenu=true&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d&xcid=WADNR&xcdid=fpOnline
```

**P5 — Verify code path:**

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1
```

**P6 — Locate the target field by configuration** (DevTools console):

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

**P7 — Prerequisite: saved form record exists.** Complete `tc-14-D-save.md` Phase A first (Steps 1-5). Note the saved record's `revisionId` or `formId` for the API call.

## Test Steps

### Phase A — Unmasked Baseline (API Read)

| #   | Action                                       | Test Data                                                                          | Expected Result                                    | ✓   |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                               | See Preconditions P1–P7                                                            | All preconditions pass; saved record ID available  | ☐   |
| 2   | Call getForms API for the saved record       | `GET /api/v1/{customerAlias}/{databaseAlias}/forminstances/{formId}` or equivalent | API returns JSON with field values                 | ☐   |
| 3   | Extract target field value from API response | Locate Field5 value in response JSON                                               | `"2026-03-15T00:00:00Z"`                           | ☐   |
| 4   | Verify format identical to Config C          | Compare with `tc-14-C-API.md` Step 3 result                                        | Identical format — `"2026-03-15T00:00:00Z"`        | ☐   |
| 5   | Verify BRT active                            | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                     | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Key insight:** The VV server stores Config C and Config D values uniformly in SQL Server `datetime` columns. The `ignoreTimezone` flag is a client-side Angular concept — it affects how `GetFieldValue()` formats the return in the browser, but the server has no awareness of it. Both configs produce the same API response format. This is why FORM-BUG-5 (fake Z in the browser) does not manifest at the API level — the server applies its own formatting independently.

### Phase C — With Mask (future)

| #   | Action                                       | Test Data                                                            | Expected Result                                                    | ✓   |
| --- | -------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | --- |
| 6   | Save a masked form instance                  | Complete `tc-14-D-save.md` Phase C (Steps 10-14)                     | Masked form saved, record ID available                             | ☐   |
| 7   | Call getForms API for the masked record      | `GET /api/v1/{customerAlias}/{databaseAlias}/forminstances/{formId}` | API returns JSON                                                   | ☐   |
| 8   | Extract target field value from API response | Locate Field5 value in response JSON                                 | `"2026-03-15T00:00:00Z"` — same as Phase A                         | ☐   |
| 9   | Compare Phase A vs Phase C                   | Steps 3 vs 8                                                         | Identical — mask should not affect server-side API response format | ☐   |
| 10  | Compare with Config C masked                 | `tc-14-C-API.md` Phase C Step 8 vs this Step 8                       | Identical — Config C and D produce same API output, masked or not  | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (API format differs from Config C):** Server returns a different format for Config D than Config C. This would mean `ignoreTimezone` somehow affects server-side storage or retrieval — unexpected and significant finding. Document the actual format and compare with `tc-14-C-API.md` results.

**FAIL-4 (Mask changes API response — Phase C):** API response for the masked record differs from the unmasked record. Critical finding — mask influenced database storage.

## Related

| Reference               | Location                                              |
| ----------------------- | ----------------------------------------------------- |
| Matrix row              | `matrix.md` — row `14-D-API`                          |
| Category 14 description | `matrix.md` § "14 — Mask Impact"                      |
| Prerequisite TC         | `tc-14-D-save.md` (must complete Phase A first)       |
| Config C counterpart    | `tc-14-C-API.md` (must compare results)               |
| Sibling TCs             | `tc-14-C-API.md`, `tc-14-D-save.md`, `tc-14-D-SFV.md` |
| FORM-BUG-5              | `forms-calendar/analysis/bug-5-fake-z-drift.md`       |
