# Case Study: Freshdesk #124697 — postForms Time Mutation in WADNR

> **Status**: DRAFT — pending identification of the specific production field(s) that triggered the report.

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| **Ticket**       | Freshdesk #124697                                                     |
| **Jira**         | WADNR-10407                                                           |
| **Filed**        | 2026-03-27 by John Sevilla                                            |
| **Customer**     | WA Department of Natural Resources (WADNR)                            |
| **Database**     | fpOnline                                                              |
| **Environment**  | vv5dev                                                                |
| **Status**       | Customer Responded — workaround accepted, core bug still open         |
| **Product Team** | Michael Betz, Tyler Wolf (assigned), Karim Kargozar (support updates) |

---

## 1. The Reported Issue

### Summary

Time data written to a calendar field via the `postForms` API is silently overwritten the first time a user opens the form record in the browser. The shift happens on load — before the user makes any changes. Saving the form commits the shifted value to the database. Subsequent opens do not shift the value further.

### Reproduction Environment

John created a test harness (`zzzJohnDevTest` form + `zzzJohnDevTestWebSvc` web service) to isolate the bug from production-specific configurations. The test field `test2` is a calendar control with:

- `enableTime` = true
- `ignoreTimezone` = true
- `useLegacy` = false (assumed — test form on vv5dev)

This is **Config D** in our investigation's classification — the configuration that maps to the Pinned/Floating DateTime model (Model 3/4).

### What the Web Service Does

The `zzzJohnDevTestWebSvc` script creates form records via two endpoints, setting the same date string on both:

```javascript
const dateStr = '03/01/2026 13:00:00';

// Path 1: postForms (VV core API — formtemplates/<id>/forms)
await createFormRecord({ test2: dateStr }, 'zzzJohnDevTest');

// Path 2: forminstance (FormsAPI application)
await createFormRecordAlt({ test2: dateStr }, 'zzzJohnDevTest');
```

### Observed Behavior

1. Both endpoints store the correct value in the database (`03/01/2026 1:00:00 PM`)
2. Opening the `postForms`-created record in the browser → UI shows `1:00 PM` but `VV.Form.GetFieldValue('test2')` returns a **different time**
3. Saving the form without changes → the shifted time is committed to the database
4. Subsequent opens show the shifted time — the original value is permanently lost
5. Opening the `forminstance/`-created record → time is consistent between UI and `GetFieldValue`

### Key Detail from the Ticket

> _"It's also worth noting that any subsequent re-opening and saving of the form record do not change the time further."_

This confirms a one-time corruption on first open — consistent with the `initCalendarValueV1` Z-stripping behavior documented in [FORM-BUG-1](../../forms-calendar/analysis/bug-1-timezone-stripping.md).

---

## 2. Production Field(s)

<!-- PENDING: John Sevilla's response identifying which specific WADNR production form(s) and field(s) originally surfaced the inconsistency. The ticket states "the client noticed an inconsistency" but does not name the form or field. John isolated the issue into a test harness before filing. -->

The original production form and field are unknown. The ticket says: _"Recently, the client noticed an inconsistency with the 'time' value of a Calendar control that has time enabled and 'Ignore Timezones' enabled."_ John then created the `zzzJohnDevTest` harness to reproduce cleanly.

### Potentially Affected WADNR Fields

From the [WADNR Field Inventory](../field-inventory.md), there are **12 Config D fields** across 8 form templates — all of which are vulnerable to this bug:

| Form Template                                | Field Name           | Assessment | Likely Intended Model |
| -------------------------------------------- | -------------------- | :--------: | --------------------- |
| Forest-Practices-Aerial-Chemical-Application | Received Date        |     ❌     | 1 — Calendar Date     |
| Forest-Practices-Application-Notification    | Date of Receipt      |     ❌     | 1 — Calendar Date     |
| FPAN-Amendment-Request                       | Date of Receipt      |     ❌     | 1 — Calendar Date     |
| FPAN-Renewal                                 | Date of Receipt      |     ❌     | 1 — Calendar Date     |
| Long-Term-Application-5-Day-Notice           | Date of Receipt      |     ❌     | 1 — Calendar Date     |
| Multi-purpose                                | Date of Violation    |     ❌     | 1 — Calendar Date     |
| Step-1-Long-Term-FPA                         | Date of Receipt      |     ❌     | 1 — Calendar Date     |
| Task                                         | Date Created         |     ❌     | 1 — Calendar Date     |
| Task                                         | Date Completed       |     ⚠️     | 1 — Calendar Date?    |
| Informal-Conference-Note                     | Meeting Date         |     ⚠️     | 1 or 3                |
| Informal-Conference-Note-SUPPORT-COPY        | Meeting Date         |     ⚠️     | 1 or 3                |
| Notice-to-Comply                             | ViolationDateAndTime |     ✅     | 3 — Pinned DateTime   |

**8 of 12 are configuration mismatches** — field names like "Date of Receipt" and "Received Date" suggest calendar dates (Model 1), not date+time values. They are configured with `enableTime=true` + `ignoreTimezone=true` (Config D) when they likely should be date-only (Config A or B).

---

## 3. Bug Mapping

The behavior reported in this ticket is a chain of three documented bugs:

### Stage 1 — Write: Record created via `postForms`

Both `postForms` and `forminstance/` store identical values in the SQL Server `datetime` column. The divergence occurs at the **serialization layer** — when the Forms UI later requests the value, the server formats `postForms`-created records differently than `forminstance/`-created records.

**Mapped to**: [WEBSERVICE-BUG-4](../../web-services/analysis/ws-bug-4-endpoint-format-mismatch.md) — Two API endpoints store the same value but produce different behavior in Forms.

### Stage 2 — Load: Form opened in browser

When the Forms UI loads a `postForms`-created record:

1. The `FormInstance/Controls` internal endpoint serializes the stored datetime with a `Z` suffix (marking it as UTC)
2. `initCalendarValueV1()` strips the `Z` and re-parses the value as local time
3. The value shifts by the user's UTC offset

For `forminstance/`-created records, the serialization format does not trigger this stripping, so no shift occurs.

**Mapped to**: [FORM-BUG-1](../../forms-calendar/analysis/bug-1-timezone-stripping.md) — UTC marker stripped during form load, value reinterpreted as local time. Specifically the V1 path for Config D fields.

### Stage 3 — Read: Script calls GetFieldValue

After the shifted value is stored, any script calling `VV.Form.GetFieldValue()` on the field receives the value with a **fake `[Z]` appended** — a literal UTC marker on a local time value. If this value is written back via `SetFieldValue()`, the drift compounds.

**Mapped to**: [FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md) — Developer API returns corrupted date values, causing progressive drift.

### Chain Summary

```
postForms writes correct value to DB
    ↓
FormInstance/Controls serializes with Z suffix       ← WEBSERVICE-BUG-4
    ↓
initCalendarValueV1 strips Z, re-parses as local     ← FORM-BUG-1
    ↓
Value shifted by user's TZ offset (one-time)
    ↓
GetFieldValue returns shifted value with fake Z       ← FORM-BUG-5
    ↓
Any script round-trip compounds the drift further
```

---

## 4. The Workaround and Its Limits

### What Was Proposed

Michael Betz (Product team) suggested switching from `postForms` to `forminstance/`, and changing the date format from ISO (`2026-03-01T13:00:00.000Z`) to US datetime (`03/01/2026 13:00:00`).

### What John Confirmed

- `postForms` with `03/01/2026 13:00:00` → **still shifts** (same bug)
- `forminstance/` with `03/01/2026 13:00:00` → **time retained correctly**
- `forminstance/` was adopted for the legacy data migration

### What the Workaround Fixes

The `forminstance/` endpoint avoids the serialization format that triggers Z-stripping on form load. Records created this way display the correct time when first opened.

### What the Workaround Does NOT Fix

The workaround addresses **Stage 2** (form load shift) only. Every other layer in the system still carries the same bugs, regardless of which endpoint created the record:

| System Layer                                   | Bug Still Active? | What Happens                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | :---------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Form scripts** (GetFieldValue round-trip)    |      **Yes**      | [FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md): `GetFieldValue()` appends fake `[Z]` to Config D values. Any script that reads and writes back a date shifts it by the user's TZ offset. This is independent of the creation endpoint.                                                                    |
| **REST API reads** (getForms, getFormInstance) |      **Yes**      | [WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md): API serialization appends `Z` to stored local times. Any API consumer that trusts the UTC marker will misinterpret the value.                                                                                                                 |
| **Cross-endpoint reads**                       |      **Yes**      | [WEBSERVICE-BUG-4](../../web-services/analysis/ws-bug-4-endpoint-format-mismatch.md): Different read endpoints serialize the same stored value differently. Integrations reading via different endpoints see inconsistent formats.                                                                                           |
| **SQL queries / Dashboard filters**            |      **Yes**      | Mixed storage: records created via `forminstance/`, `postForms`, and the UI may have different internal representations of the same logical date. Query predicates (`WHERE DateOfReceipt > '2026-03-01'`) return inconsistent results across creation paths.                                                                 |
| **Dashboard display**                          |    **Unclear**    | Dashboards read raw DB values and bypass the Forms frontend. If the stored value is correct (as it is for `forminstance/`-created records), display should be correct. But mixed-endpoint datasets will show inconsistent dates for the same logical value.                                                                  |
| **Config mismatch** (8 fields)                 |      **Yes**      | The 8 "Date of Receipt" fields configured as Config D but semantically Calendar Date: `forminstance/` doesn't address the fundamental misconfiguration. These fields expose time pickers users don't need, accept time input with no business meaning, and store time-stamped values that make date-only queries unreliable. |

### Net Assessment

The `forminstance/` workaround is a **write-path band-aid** that prevents corruption at the moment of first form open. It is sufficient for John's immediate migration need (get correct dates into the DB and display them correctly on first view). It does not make the data safe across the rest of the system.

---

## 5. Risk Profile for WADNR

### Immediate Risk (Migration)

With the `forminstance/` workaround, migrated records will display correct dates on first open. **Risk mitigated for the migration use case**, provided:

- No form button scripts on the affected forms read Config D values with `GetFieldValue` and write them back ([FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md) drift)
- No downstream integrations read the values via the standard `getForms` API and trust the UTC marker ([WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md))

<!-- PENDING: Identify which WADNR form scripts, if any, perform GetFieldValue → SetFieldValue round-trips on Config D fields. This determines whether FORM-BUG-5 drift is a theoretical or active risk. -->

### Ongoing Risk (Post-Migration)

After migration, the data lives in a system where:

1. **Any form script** using the standard `GetFieldValue` → `SetFieldValue` pattern on Config D fields will introduce drift
2. **Any API integration** reading dates from the standard endpoint will receive false UTC markers
3. **Any new records** created via `postForms` (the standard SDK method) will be subject to the original time shift bug — the workaround only applies to records created via `forminstance/`
4. **Dashboard queries** across records from different creation paths may return inconsistent results

### Configuration Risk (The 8 Mismatched Fields)

Eight of the 12 Config D fields should probably be Config B (date-only + `ignoreTimezone`). If these fields are reconfigured:

- **Benefit**: Removes exposure to FORM-BUG-1, FORM-BUG-5, and the postForms time shift (date-only fields are immune to the Z-stripping shift)
- **New exposure**: Config B date-only fields are vulnerable to [FORM-BUG-7](../../forms-calendar/analysis/bug-7-wrong-day-utc-plus.md) (wrong day stored for UTC+ users). WADNR users in Pacific time (UTC-8/UTC-7) would not be affected, but any users in UTC+ timezones would see dates shift by one day
- **Data migration impact**: Existing records with time components stored in Config D fields would display differently after reconfiguration — the time component would be hidden but still present in the DB

<!-- PENDING: Confirm with John whether these 8 fields actually carry meaningful time data in production, or if the time component is always midnight/zero (which would indicate the fields are used as date-only in practice despite the Config D setting). -->

---

## 6. Open Questions

1. **Which production field(s) triggered the original report?** — Pending John Sevilla's response
2. **Do any WADNR form scripts perform GFV→SFV round-trips on Config D fields?** — Determines FORM-BUG-5 exposure
3. **Do the 8 mismatched "Date of Receipt" fields carry meaningful time data?** — Determines whether reconfiguration to Config B is safe
4. **Are WADNR users exclusively in Pacific timezone?** — If yes, FORM-BUG-7 risk is zero for a Config B migration; if any users operate from UTC+ (e.g., remote workers, international stakeholders), FORM-BUG-7 applies
5. **Does any WADNR integration read form data via the standard REST API?** — Determines WEBSERVICE-BUG-1 exposure beyond the Forms UI

---

## 7. References

| Document                                                                             | Relationship                                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [FORM-BUG-1](../../forms-calendar/analysis/bug-1-timezone-stripping.md)              | Z stripped on form load — direct cause of the one-time shift            |
| [FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md)                    | Fake Z on GetFieldValue — compounds the damage via script round-trips   |
| [WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md)        | Cross-layer shift — the full chain from API write to form display       |
| [WEBSERVICE-BUG-4](../../web-services/analysis/ws-bug-4-endpoint-format-mismatch.md) | Endpoint divergence — why postForms and forminstance behave differently |
| [WADNR Field Inventory](../field-inventory.md)                                       | 137 calendar fields across 35 templates, 12 Config D                    |
| [Root Cause Analysis](../../analysis/temporal-models.md)                             | 14 bugs, 4 temporal models, architectural limitations                   |
| [Fix Strategy](../../analysis/fix-strategy.md)                                       | Categories of change needed per temporal model                          |
