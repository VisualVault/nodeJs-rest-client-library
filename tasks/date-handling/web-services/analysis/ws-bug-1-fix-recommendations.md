# WEBSERVICE-BUG-1: Fix Recommendations

## Workarounds

### Use the `forminstance/` Endpoint Instead of `postForms`

The `forminstance/` endpoint stores datetime values in a format that the Forms frontend parses without timezone conversion. Records created through `forminstance/` display correctly in all timezones — zero shift, zero corruption.

```javascript
// forminstance/ payload (direct HTTP to the FormsAPI server):
const payload = {
    formTemplateId: '<revision-id>', // The template's revision ID, not the template GUID
    formName: '',
    fields: [{ key: 'Field5', value: '2026-03-15T14:30:00' }],
};
// POST to https://preformsapi.visualvault.com/forminstance/
```

**Limitations**:

- No SDK wrapper — requires direct HTTP calls to a different server than the main VV API
- Only supports new record creation — there is no `forminstance/` equivalent for updating existing records
- Requires FormsAPI registration for the form template on the target environment

**Important finding**: The `ignoreTimezone` field setting does not affect what gets stored in the database. Both `ignoreTimezone=true` and `ignoreTimezone=false` fields store identical database values for the same input. This was verified by comparing records created through all write paths (`postForms`, `forminstance/`, Forms UI). This means the `forminstance/` workaround works for all date/time field configurations.

### Use Date-Only Fields When Time Is Not Needed

Fields configured to store only a date (no time component) display correctly in all timezones regardless of which endpoint created the record. If the use case only requires a date, switching to a date-only field eliminates this bug entirely.

### Keep Records API-Only (No Human Opens Them in Forms)

If the date/time field is only read by scripts via the `getForms` API (never opened in the Forms UI by a human), no corruption occurs. The `getForms` API normalizes all serialization formats consistently, and the API round-trip is drift-free. The shift only manifests when the value crosses from the API layer to the Forms UI.

---

## Proposed Fix

### Recommended: Fix the Controls Serialization (Server-Side)

Remove the creation-path-dependent serialization logic in the `FormInstance/Controls` endpoint. All records should be serialized the same way, regardless of which endpoint created them:

```
Current (broken):
  postForms record:     Controls returns "2026-03-15T14:30:00Z"     (Z added — incorrect)
  forminstance/ record: Controls returns "03/15/2026 2:30:00 PM"    (no Z — correct)
  Forms UI record:      Controls returns "03/15/2026 2:30:00 PM"    (no Z — correct)

Fixed:
  ALL records:          Controls returns "03/15/2026 2:30:00 PM"    (no Z — consistent)
```

**Why this is the right fix:**

- The Z is incorrect — the `datetime` column has no timezone context
- The `forminstance/` and Forms UI serialization (US format, no Z) is already correct and consistent
- One change in one server code path fixes all existing and future records
- No client-side changes needed — the FormViewer already handles the US format correctly
- No developer-side changes needed — existing scripts work as-is

**What needs to happen:**

1. Identify the metadata or code path that Controls uses to decide the serialization format (it's not in the form data table — likely in VV's internal revision/instance tracking tables)
2. Remove or bypass that branching logic
3. Apply consistent serialization (US format, no Z) for all records

### Alternative: Fix the Forms Frontend (Defensive)

If the Controls serialization cannot be changed, the FormViewer could be modified to strip the Z before parsing, treating all values as local time regardless of the Z suffix. This addresses the symptom but does not resolve the inconsistent serialization, and requires regression testing across all form load scenarios.

### Not Recommended: Require Developers to Send Timezone Offsets

Requiring scripts to include offsets (e.g., `"T14:30:00-03:00"`) places the burden on developers and does not help with existing records already stored without offsets.

---

## Fix Impact Assessment

### What Changes If Fixed (Controls Serialization Fix)

- All records display consistently in Forms regardless of which endpoint created them
- Freshdesk #124697 behavior eliminated for all future form opens
- The `forminstance/` workaround becomes unnecessary
- No developer-side changes needed — existing scripts work as-is

### Backwards Compatibility Risk: LOW

The database values are correct — only the serialization was wrong. After the fix, existing `postForms` records that were **never opened in Forms** will now display correctly. Records that **were already opened and saved** have the shifted value permanently in the database (e.g., `11:30:00` instead of `14:30:00`). These cannot be automatically fixed because the system cannot distinguish "shifted by this bug" from "intentionally entered as 11:30."

**Risk area**: Applications that read `FormInstance/Controls` directly (not through the Forms UI) and parse the ISO+Z format would need to handle the US format instead. This is an uncommon pattern but should be checked.

### Regression Risk

- **Low for Forms UI**: The FormViewer already handles the US date format correctly (it's what `forminstance/` and Forms UI records use today)
- **Medium for direct Controls consumers**: Any automation that parses the Controls response and expects ISO+Z format would need updating
- **No data migration needed**: The fix is in the serialization layer, not in the database. Existing database values are correct (for records never opened in Forms) or already permanently shifted (for records that were opened and saved). No data changes are required.
