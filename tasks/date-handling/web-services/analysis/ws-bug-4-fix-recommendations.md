# WEBSERVICE-BUG-4: Fix Recommendations

## Workarounds

### Use `forminstance/` for Date+Time Fields Viewed in Forms

The `forminstance/` endpoint stores dates in a format that the Forms frontend parses without timezone conversion. Records created through `forminstance/` display correctly in all timezones.

**Key differences between the two endpoints:**

| Aspect         | `postForms` (standard SDK)          | `forminstance/` (FormsAPI)                     |
| -------------- | ----------------------------------- | ---------------------------------------------- |
| Server         | Main VV API server                  | Separate FormsAPI server                       |
| SDK method     | `vvClient.forms.postForms()`        | None — direct HTTP only                        |
| Field format   | `{ Field5: "value" }` (flat object) | `[{ key: "Field5", value: "value" }]` (array)  |
| Template ID    | Template GUID                       | **Revision ID** (different from template GUID) |
| Update support | `postFormRevision()`                | **No equivalent** — new records only           |
| Authentication | Same OAuth token                    | Same OAuth token                               |

**Limitations:**

- No SDK wrapper — requires manual HTTP request construction
- No update/revision endpoint — only supports new record creation
- Requires the form template to be registered in FormsAPI on the target environment
- Must use the revision ID (not template GUID) as `formTemplateId`

### Use `postForms` for API-Only Workflows

If the date+time field is only consumed by scripts via the `getForms` API and never opened in Forms by a user, `postForms` is safe. The API read path normalizes both formats identically. The serialization mismatch only matters when the value crosses to the Forms UI.

### Endpoint Selection Guide

| Use Case                                  | Recommended Endpoint | Why                                             |
| ----------------------------------------- | :------------------: | ----------------------------------------------- |
| Date+time fields viewed in Forms          |   `forminstance/`    | Avoids the cross-layer shift (WEBSERVICE-BUG-1) |
| Date-only fields                          |        Either        | Both produce correct display                    |
| Date+time fields consumed only by scripts |        Either        | API read path normalizes both formats           |
| Updating existing records                 |  `postFormRevision`  | `forminstance/` has no revision/update support  |

---

## Proposed Fix

The database values are correct — only the Controls serialization is inconsistent. The fix is in the `FormInstance/Controls` layer. See [WEBSERVICE-BUG-1 fix recommendations](ws-bug-1-fix-recommendations.md) for the full recommendation.

**Summary**: Remove the creation-path-dependent serialization logic in Controls. All records should be serialized the same way (US format, no Z) regardless of which endpoint created them. This is a single server-side code path change — no database migration, no client-side changes, no developer-side changes.

**What needs to happen:**

1. Identify the hidden metadata that Controls uses to decide the serialization format (not in the form data table — likely in VV's internal revision/instance tracking tables)
2. Remove or bypass that branching logic
3. Apply consistent serialization for all records

### Workaround Dependency Consideration

Customers who followed the Freshdesk #124697 workaround (switch to `forminstance/`) are relying on this inconsistency. The fix must either:

- Unify to the `forminstance/` format (US, no Z) — workaround becomes unnecessary, existing setup preserved. **This is the recommended approach.**
- Unify to the `postForms` format (ISO+Z) — workaround would no longer help, must be combined with a Forms frontend fix to strip Z before parsing.

---

## Fix Impact Assessment

### What Changes If Fixed

- Controls serializes all records consistently — no format depends on creation path
- [WEBSERVICE-BUG-1](ws-bug-1-cross-layer-shift.md) (cross-layer shift) is eliminated as a direct consequence
- The `forminstance/` workaround for Freshdesk #124697 becomes unnecessary
- Developers can choose endpoints based on API preference, not date handling side effects

### Backwards Compatibility Risk: LOW

The database values are not changing — only the Controls serialization. Records already opened and saved by users (with shifted values permanently in the database) will continue to display their shifted values. Records not yet opened in Forms will now display correctly.

**Risk area**: Applications that read `FormInstance/Controls` directly (not through the Forms UI) and parse the ISO+Z format would need to handle the US format. This is an uncommon pattern but should be checked.

### Open Question for the Product Team

The metadata that Controls uses to decide the serialization format is not in the form data table. It is likely in VV's internal revision or instance tracking tables. The product team needs to identify where this branching logic lives before the fix can be implemented.
