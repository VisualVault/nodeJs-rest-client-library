# TC-14-C-API — Config C, API Read, BRT: server returns ISO+Z uniformly

## Environment Specs

| Parameter           | Required Value                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                    |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                             |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                    |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                                 |
| Target Field Config | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`    |
| Scenario            | API read of saved Config C value — verify server returns `"2026-03-15T00:00:00Z"` uniformly |

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
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field6"]
```

**P7 — Prerequisite: saved form record exists.** Complete `tc-14-C-save.md` Phase A first (Steps 1-5). Note the saved record's `revisionId` or `formId` for the API call.

## Test Steps

### Phase A — Unmasked Baseline (API Read)

| #   | Action                                       | Test Data                                                                          | Expected Result                                                     | ✓   |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --- |
| 1   | Complete setup                               | See Preconditions P1–P7                                                            | All preconditions pass; saved record ID available                   | ☐   |
| 2   | Call getForms API for the saved record       | `GET /api/v1/{customerAlias}/{databaseAlias}/forminstances/{formId}` or equivalent | API returns JSON with field values                                  | ☐   |
| 3   | Extract target field value from API response | Locate Field6 value in response JSON                                               | `"2026-03-15T00:00:00Z"`                                            | ☐   |
| 4   | Verify ISO format with Z suffix              | Inspect the string format                                                          | Matches pattern `YYYY-MM-DDTHH:mm:ssZ` — server appends Z uniformly | ☐   |
| 5   | Verify BRT active                            | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                     | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                  | ☐   |

> **Step 3 explanation:** The VV server returns all datetime values with a Z suffix via the REST API, regardless of how they were stored. For Config C, the form save pipeline stores the value using `getSaveValue()` which produces a timezone-ambiguous local string. The server then reads the SQL Server `datetime` column and formats it as ISO with Z. The Z here means "this is how the server formats it" — not necessarily that the value is truly UTC.

### Phase C — With Mask (future)

| #   | Action                                       | Test Data                                                            | Expected Result                                                    | ✓   |
| --- | -------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | --- |
| 6   | Save a masked form instance                  | Complete `tc-14-C-save.md` Phase C (Steps 10-14)                     | Masked form saved, record ID available                             | ☐   |
| 7   | Call getForms API for the masked record      | `GET /api/v1/{customerAlias}/{databaseAlias}/forminstances/{formId}` | API returns JSON                                                   | ☐   |
| 8   | Extract target field value from API response | Locate Field6 value in response JSON                                 | `"2026-03-15T00:00:00Z"` — same as Phase A                         | ☐   |
| 9   | Compare Phase A vs Phase C                   | Steps 3 vs 8                                                         | Identical — mask should not affect server-side API response format | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (API format differs):** Server returns a format other than `"2026-03-15T00:00:00Z"` (e.g., `"2026-03-15T00:00:00"` without Z, or `"03/15/2026"` US format, or `"2026-03-15T03:00:00Z"` with UTC conversion applied). Document the actual format — this reveals server-side formatting behavior.

**FAIL-4 (Mask changes API response — Phase C):** API response for the masked record differs from the unmasked record. This would mean the mask influenced what was stored in the database, not just the display. Critical finding.

## Related

| Reference               | Location                                              |
| ----------------------- | ----------------------------------------------------- |
| Matrix row              | `matrix.md` — row `14-C-API`                          |
| Category 14 description | `matrix.md` § "14 — Mask Impact"                      |
| Prerequisite TC         | `tc-14-C-save.md` (must complete Phase A first)       |
| Sibling TCs             | `tc-14-D-API.md`, `tc-14-C-save.md`, `tc-14-C-SFV.md` |
