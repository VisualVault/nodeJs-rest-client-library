# Case Study: Freshdesk #124697 — postForms Time Mutation in WADNR

> **Status**: DRAFT — updated with John's clarification (2026-04-08). Scope confirmed as all Config D fields, triggered by legacy data migration.

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

Time data written to calendar fields via the `postForms` API is silently overwritten the first time a user opens the form record in the browser. The shift happens on load — before the user makes any changes. Saving the form commits the shifted value to the database. Subsequent opens do not shift the value further.

### Migration Context

John's report was triggered by a **legacy data migration** — importing hundreds of thousands of records from a previous provider into WADNR's VisualVault environment. The affected scope is not a single field but **all calendar fields configured with `enableTime=true` + `ignoreTimezone=true`** (Config D in our classification). After bulk import via `postForms`, John observed that time values in these fields shifted when the form was first opened in the browser.

John is **not aware** of the broader date bug investigation documented in this repository. His analysis was narrowly scoped to the import path: "data goes in correct, comes out shifted after first form open." He did not evaluate whether the field configurations themselves were appropriate, or whether data created natively through the Forms UI exhibits the same or different issues.

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

John clarified (2026-04-08) that the report was **not about a specific field** — it targets **all calendar fields with `enableTime=true` + `ignoreTimezone=true`** (Config D). The ticket phrasing _"a Calendar control that has time enabled and 'Ignore Timezones' enabled"_ describes the configuration class, not a single instance.

The trigger was the legacy data migration: after importing records via `postForms`, John noticed that time values in Config D fields shifted on first form open. He created the `zzzJohnDevTest` harness to isolate and reproduce the behavior cleanly before filing the ticket.

**Important**: John did not analyze this from a holistic perspective. He identified the symptom (import path produces shifted times) but did not consider:
- Whether the field configurations were appropriate in the first place (8 of 12 are likely misconfigured — see below)
- Whether data created natively through the Forms UI has the same or different issues
- Whether the workaround (`forminstance/`) creates a data consistency gap with future UI-created records

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

## 5. What John's Analysis Did Not Cover

John's report correctly identified the `postForms` time mutation and led to a working migration path (`forminstance/`). However, his narrow scope — focused solely on the import path — leaves several systemic issues unaddressed. This is not criticism of John's work; he solved his immediate problem. But it provides context for why the holistic investigation matters.

### 5.1 Configuration Validity

John assumed the Config D setting was correct for all affected fields and blamed the import tool. Our [field inventory](../field-inventory.md) shows **8 of 12 Config D fields are likely misconfigured** — field names like "Date of Receipt", "Received Date", and "Date Created" suggest calendar dates (Model 1), not date+time values. These fields expose a time picker users don't need and store time-stamped values that make date-only queries unreliable. The bug John reported may be a symptom compounded by a configuration error.

### 5.2 Native Data Quality

John compared imported data against what the form displays after open. He did not compare imported data against data **created natively through the Forms UI** — which is how WADNR staff create records day-to-day. Our investigation shows that UI-created data on Config D fields is also subject to:

- [FORM-BUG-1](../../forms-calendar/analysis/bug-1-timezone-stripping.md): Z stripped on form load, value reinterpreted as local time (one-time shift)
- [FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md): `GetFieldValue()` appends fake `[Z]` to local values, corrupting any script round-trip

The imported data (via `forminstance/`) may actually be **more correct** than what the system produces natively. This inverts John's framing: the problem isn't that imported data gets corrupted — it's that the system corrupts data by default, and the import workaround happens to avoid the corruption path.

### 5.3 Post-Migration Data Consistency

After migration completes, the database will contain records from three creation paths with different date accuracy:

| Creation Path | Records | Date Quality |
| --- | --- | --- |
| **Imported** (via `forminstance/`) | Legacy data (hundreds of thousands) | ✅ Correct — bypasses V1 bugs |
| **UI-created** (Forms frontend) | All future records by WADNR staff | ❌ Subject to FORM-BUG-1 shift on first open |
| **Script-created** (via `postForms`) | Any records created by server scripts | ❌ Subject to original time mutation |

This creates a **mixed-quality dataset** that grows more inconsistent over time. Dashboard queries and date-range reports will return different results depending on when and how records were created — not on their logical content.

### 5.4 Script Interactions

Per [script-inventory.md](../script-inventory.md), **11 WADNR scripts** interact with Config D fields. None of the 11 perform GFV→SFV round-trips in template-level code, so FORM-BUG-5 drift from round-trips is not active in template scripts. However, `VV.Form.Global.FillinAndRelateForm` (used in 36 templates) is site-level code not available in template XML — its date handling behavior is unknown and flagged for review.

---

## 6. Risk Profile for WADNR

### Immediate Risk (Migration)

With the `forminstance/` workaround, migrated records will display correct dates on first open. **Risk mitigated for the migration use case**, provided:

- No form button scripts on the affected forms read Config D values with `GetFieldValue` and write them back ([FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md) drift)
- No downstream integrations read the values via the standard `getForms` API and trust the UTC marker ([WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md))

**Script analysis result** (2026-04-08): Per [script-inventory.md](../script-inventory.md), **no template-level scripts** perform GFV→SFV round-trips on Config D fields. The 11 Config D script interactions are either SetFieldValue-only (writes) or GetFieldValue-only (reads for validation). FORM-BUG-5 drift from round-trips is **not active** in template scripts. Caveat: `VV.Form.Global.FillinAndRelateForm` (site-level, 36 templates) is uninspected.

### Ongoing Risk (Post-Migration) — Data Divergence

After migration, the data lives in a system where imported and future records have **different date quality** (see Section 5.3). The gap widens over time:

1. **UI-created records** (how WADNR staff work daily) go through the V1 init path → subject to FORM-BUG-1 Z-stripping on first open. Every new record will carry a shifted time value.
2. **Script-created records** via `postForms` (the standard SDK method) are subject to the original time mutation bug — the `forminstance/` workaround only applies to the migration scripts, not to production code paths.
3. **Any form script** using `GetFieldValue` → `SetFieldValue` on Config D fields will introduce FORM-BUG-5 drift — though no template-level scripts currently do this (see above).
4. **Any API integration** reading dates from the standard endpoint will receive false UTC markers ([WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md)).
5. **Dashboard queries and date-range reports** across records from different creation eras will return inconsistent results — queries cannot distinguish correct imported values from shifted native values in the same `datetime` column.

### Configuration Risk (The 8 Mismatched Fields)

Eight of the 12 Config D fields should probably be Config B (date-only + `ignoreTimezone`). If these fields are reconfigured:

- **Benefit**: Removes exposure to FORM-BUG-1, FORM-BUG-5, and the postForms time shift (date-only fields are immune to the Z-stripping shift)
- **New exposure**: Config B date-only fields are vulnerable to [FORM-BUG-7](../../forms-calendar/analysis/bug-7-wrong-day-utc-plus.md) (wrong day stored for UTC+ users). WADNR users in Pacific time (UTC-8/UTC-7) would not be affected, but any users in UTC+ timezones would see dates shift by one day
- **Data migration impact**: Existing records with time components stored in Config D fields would display differently after reconfiguration — the time component would be hidden but still present in the DB

<!-- John confirmed (2026-04-08) the report covers ALL Config D fields. He did not evaluate whether individual fields carry meaningful time data. This question remains critical for reconfiguration decisions. -->

---

## 7. Open Questions

1. ~~**Which production field(s) triggered the original report?**~~ — **ANSWERED** (2026-04-08): Not a specific field. John's report covers all Config D fields, triggered by legacy data migration across the entire field class.
2. ~~**Do any WADNR form scripts perform GFV→SFV round-trips on Config D fields?**~~ — **ANSWERED** (2026-04-08): No template-level round-trips found. 11 scripts interact with Config D fields but none perform GFV→SFV on the same field. `VV.Form.Global.FillinAndRelateForm` (site-level) is uninspected.
3. **Do the 8 mismatched "Date of Receipt" fields carry meaningful time data?** — **CRITICAL**: Determines whether reconfiguration to Config B is safe. John did not evaluate this — he assumed Config D was correct for all fields.
4. **Are WADNR users exclusively in Pacific timezone?** — If yes, FORM-BUG-7 risk is zero for a Config B migration; if any users operate from UTC+ (e.g., remote workers, international stakeholders), FORM-BUG-7 applies
5. **Does any WADNR integration read form data via the standard REST API?** — Determines WEBSERVICE-BUG-1 exposure beyond the Forms UI
6. **Does John's migration script import data into all 12 Config D fields, or only a subset?** — Determines which fields have correct imported data vs. which were never touched by the migration

---

## 8. References

| Document                                                                             | Relationship                                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [FORM-BUG-1](../../forms-calendar/analysis/bug-1-timezone-stripping.md)              | Z stripped on form load — direct cause of the one-time shift            |
| [FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md)                    | Fake Z on GetFieldValue — compounds the damage via script round-trips   |
| [WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md)        | Cross-layer shift — the full chain from API write to form display       |
| [WEBSERVICE-BUG-4](../../web-services/analysis/ws-bug-4-endpoint-format-mismatch.md) | Endpoint divergence — why postForms and forminstance behave differently |
| [WADNR Field Inventory](../field-inventory.md)                                       | 137 calendar fields across 35 templates, 12 Config D                    |
| [Root Cause Analysis](../../analysis/temporal-models.md)                             | 14 bugs, 4 temporal models, architectural limitations                   |
| [Fix Strategy](../../analysis/fix-strategy.md)                                       | Categories of change needed per temporal model                          |
