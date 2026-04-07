# VisualVault Date Handling — Root Cause Analysis

## Why This Document Exists

The VisualVault platform has a systemic problem with how it handles dates and times. Multiple customer projects have reported date-related defects in production, QA teams routinely flag date issues during UAT, and support tickets about incorrect dates have been a recurring pattern for an extended period. This investigation determined that these are not isolated bugs — they are symptoms of an architectural limitation that affects every component that stores, reads, or displays dates.

**Intended audience**: Product and engineering leadership. §1–3 define the framework. §4–5 map every confirmed bug. §6–9 cover propagation, limitations, fix strategy, and anti-patterns.

---

## Investigation Scope

The bug count (14) is a lower bound — tested components do not have exhaustive coverage, and several platform areas remain untested.

| Component                         | Status              | Coverage                                                                                                   | Bugs Found |
| --------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- | :--------: |
| **Forms — Calendar Fields**       | In progress         | ~150 of 242 planned tests. 8 field configs × 2 TZs. V2 code path not exercised end-to-end.                 |     7      |
| **Web Services (REST API)**       | Initial matrix done | 148 tests across 10 categories. Does not cover Custom Queries, bulk operations, or OData advanced filters. |     6      |
| **Analytic Dashboards**           | Initial matrix done | 44 tests across 8 categories. Does not cover drill-down, calculated columns, or grouped aggregations.      |     1      |
| **Reports**                       | Not started         | —                                                                                                          |     —      |
| **Workflows (date triggers)**     | Not started         | —                                                                                                          |     —      |
| **Index Fields / Folder Queries** | Not started         | —                                                                                                          |     —      |
| **Custom Queries**                | Not started         | —                                                                                                          |     —      |
| **Files (document dates)**        | Not started         | —                                                                                                          |     —      |

The Node.js client library (`lib/VVRestApi/`) was confirmed as a transparent passthrough — no date transformation at any layer (see [Web Services Analysis §3](../web-services/analysis/overview.md)). Untested components will inherit the same storage-layer ambiguity (no model discriminator, mixed UTC/local values in the same column), but each has its own rendering and query logic — they may reproduce different subsets of these bugs or introduce component-specific defects not seen in Forms or Web Services.

---

## Executive Summary

### What we found

- **14 confirmed bugs so far** across Forms (7), Web Services (6), Dashboards (1)
- **All 14 trace to one root cause**: date/time values serve different purposes — a due date, a UTC timestamp, and a local clock reading each require different storage, display, and comparison rules. The platform treats them all identically

### Why it happens

- Once a date value is stored, **no component can determine what type it is**. The same SQL `datetime` column holds date-only values, UTC timestamps, and local times — all as bare numbers with no discriminator. Every downstream operation must guess the type, and each component guesses differently
- The 3 field config flags (`enableTime`, `ignoreTimezone`, `useLegacy`) are the only signal about date type, but they exist only in the form template — the database, API serialization, and query engine do not consult them. **No configuration correctly implements its intended behavior across all code paths**

### Why it matters

- The highest-severity pattern causes **permanent data corruption**: local times incorrectly labeled as UTC, shifting values when a user opens a record in Forms
- The problem is architectural — patching individual bugs without making the date type identifiable will leave systemic issues. Any new feature, endpoint, or integration will reintroduce the same defects
- **Developer experience is directly affected**: no format guidance, no validation errors, timezone-dependent correctness that fails silently. Date handling is a recurring source of project delays and support escalations (see § 7.6)

### What needs to happen

- The fix is not 14 isolated patches — it is **4 categories of change** (one per date/time category, § 1), each requiring coordinated fixes across multiple layers (database, API, Forms, query engine)
- **Key design decision**: does VV need to distinguish "same clock for everyone" from "local clock for each viewer"? These share a single config flag today. See § 8

---

## 1. The Four Models

The column stores a number — it carries no information about what that number _means_. Is `2026-03-15 14:30:00` a UTC instant? A local time pinned to São Paulo? A floating time that means "2:30 PM wherever you are"?

These four models are exhaustive — every real-world date/time use case maps to exactly one.

|                     | Calendar Date               | Instant                             | Pinned DateTime                         | Floating DateTime                 |
| ------------------- | --------------------------- | ----------------------------------- | --------------------------------------- | --------------------------------- |
| **Example**         | Due date, birthday, holiday | `createdAt`, audit trail, event log | "Incident at 15:30 São Paulo time"      | "Take medication at 8 AM"         |
| **Core rule**       | Same date everywhere        | One moment, many local clocks       | One clock reading, one specific zone    | Same clock reading, viewer's zone |
| **Correct storage** | `YYYY-MM-DD` — no time      | UTC with explicit Z or offset       | Naive datetime + anchor timezone        | Naive datetime — no TZ            |
| **Correct display** | Show as-is — no conversion  | Convert to viewer's local timezone  | Show as-is — do not convert             | Show as-is — do not convert       |
| **Comparison**      | String or date-only         | Compare UTC values directly         | Convert to UTC via anchor, then compare | Undefined across timezones        |
| **Anti-pattern**    | Attaching a midnight time   | Stripping the Z suffix              | Storing without anchor TZ               | Appending Z or any TZ marker      |

**Model 1 — Calendar Date**: Attaching midnight makes it timezone-dependent — "midnight" is a different instant in each zone.

**Model 2 — Instant**: Stripping the Z and re-parsing as local shifts the value by the viewer's offset.

**Model 3 — Pinned DateTime**: Storing without the anchor timezone makes it indistinguishable from Floating.

**Model 4 — Floating DateTime**: Appending Z forces the value into Instant semantics.

---

## 2. Models 3 vs 4 — The Critical Distinction

`ignoreTZ=true` conflates Pinned and Floating. It stores a naive datetime without an anchor timezone, making it impossible to know whether `"15:30"` means "15:30 at the data-entry location" or "15:30 wherever you are." This ambiguity becomes a bug when the system needs to compare, filter, or round-trip these values.

| Operation                                   | Model 3 (Pinned)                                                | Model 4 (Floating)                                                                        |
| ------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **"What UTC instant does this represent?"** | Answerable — use the anchor TZ to convert                       | **Unanswerable** — no single UTC equivalent exists                                        |
| **Cross-timezone comparison**               | Convert both to UTC via their anchors, then compare             | Meaningless — "8 AM local" in São Paulo and "8 AM local" in Mumbai are different instants |
| **Filtering by date range**                 | Convert the filter bounds to the anchor TZ, apply to UTC values | Apply the filter as-is to the naive values (no conversion)                                |

---

## 3. Mapping VV Configurations to Models

The three boolean flags create 8 combinations, but they map to only 2–3 intended models:

| Config | enableTime | ignoreTZ | useLegacy |      Intended Model      | Why                                                         |
| :----: | :--------: | :------: | :-------: | :----------------------: | ----------------------------------------------------------- |
| **A**  |   false    |  false   |   false   |    1 — Calendar Date     | Date-only field, no time, no TZ handling needed             |
| **B**  |   false    |   true   |   false   |    1 — Calendar Date     | Same intent as A (`ignoreTZ` is meaningless without time)   |
| **C**  |    true    |  false   |   false   |       2 — Instant        | DateTime with timezone awareness → store UTC, display local |
| **D**  |    true    |   true   |   false   | 3 or 4 — Pinned/Floating | DateTime ignoring timezone → store local, display as-is     |
| **E**  |   false    |  false   |   true    |    1 — Calendar Date     | Legacy date-only                                            |
| **F**  |   false    |   true   |   true    |    1 — Calendar Date     | Legacy date-only (`ignoreTZ` meaningless)                   |
| **G**  |    true    |  false   |   true    |       2 — Instant        | Legacy DateTime with TZ                                     |
| **H**  |    true    |   true   |   true    | 3 or 4 — Pinned/Floating | Legacy DateTime ignoring TZ                                 |

1. **8 configs, 3 intended models.** A/B/E/F → Model 1. C/G → Model 2. D/H → Model 3 or 4. `ignoreTZ` adds no value for date-only fields; `useLegacy` is an implementation toggle, not a semantic one.

2. **D/H cannot distinguish Pinned from Floating** — no anchor timezone is stored (see § 2).

3. **No config correctly implements its intended model.** Every configuration has at least one code path that breaks the model's semantics (see § 4).

---

## 4. Current State Per Model

In the tables below, **SFV** = `SetFieldValue()` (write path), **GFV** = `GetFieldValue()` (read path).

### Status at a Glance

| Model             | VV Configs | Works? | Key Issue                              | Confirmed Bugs |
| ----------------- | ---------- | :----: | -------------------------------------- | :------------: |
| 1 — Calendar Date | A, B, E, F |   ❌   | JS `Date` forces TZ-dependent midnight |       2        |
| 2 — Instant       | C, G       |   ⚠️   | Approximately correct; edge cases      |       2        |
| 3 — Pinned        | D, H       |   ❌   | Literal Z + no anchor TZ               |       3        |
| 4 — Floating      | (none)     |   ⚠️   | No dedicated config; shares D/H        |   Same as 3    |

_The subsections below detail each model's behavior at every platform layer — intended for developers investigating or fixing specific code paths._

---

### Model 1: Calendar Date — `enableTime=false` (Configs A, B, E, F)

**Can VV represent this correctly today?** No. Broken for UTC+ timezones.

JavaScript's `Date` object is always an Instant (Model 2). The code stores Calendar Dates via local midnight, which for UTC+ users is the previous UTC day — off by one day.

| Layer              | Behavior                                                                                                      | OK? | Notes                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | :-: | ------------------------------------------------------------- |
| **SFV (write)**    | `normalizeCalValue()` → `moment("2026-03-15").toDate()` → local midnight → `getSaveValue()` extracts UTC date | ⚠️  | BRT: correct. IST: **-1 day** (FORM-BUG-7)                    |
| **Form load (V1)** | `initCalendarValueV1()` → `moment(e).toDate()` → same local-midnight conversion                               | ⚠️  | BRT: correct. IST: **-1 day** (FORM-BUG-7)                    |
| **GFV (read)**     | Returns raw stored value (no transformation)                                                                  | ✅  | Reads what was stored                                         |
| **DB storage**     | SQL `datetime` with `00:00:00.000` time component                                                             | ❌  | Wrong type — should be `date` or string                       |
| **API write**      | `postForms` stores string as-is                                                                               | ✅  | No conversion                                                 |
| **API read**       | `getForms` returns ISO with Z (`"2026-03-15T00:00:00Z"`)                                                      | ⚠️  | Z implies UTC midnight, but the value might be local midnight |
| **Dashboard**      | Shows stored value, no conversion                                                                             | ✅  | Transparent read                                              |
| **Round-trip**     | GFV→SFV: raw date string → `moment().toDate()` → local midnight → extract UTC date                            | ⚠️  | BRT: stable. IST: **-1 day per trip** (FORM-BUG-7 compounds)  |

**Root cause**: Model 1 → Model 2 conversion at the JavaScript layer. Timezone-dependent — works in UTC-, fails in UTC+.

---

### Model 2: Instant — `enableTime=true, ignoreTZ=false` (Configs C, G)

**Can VV represent this correctly today?** Approximately — Config C is the safest configuration, but has edge cases.

| Layer                               | Behavior                                                                             | OK? | Notes                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------ | :-: | ---------------------------------------------------------------- |
| **SFV (write)**                     | `calChange()` → `toISOString()` (UTC) → `getSaveValue()` strips Z → stores naive UTC | ⚠️  | Loses the Z marker, but value IS UTC                             |
| **Form load (V1)**                  | `parseDateString()` → strips Z → `new Date(local)` → reconverts                      | ✅  | Net effect: correct display in user's TZ                         |
| **GFV (read)**                      | `new Date(value).toISOString()` → real UTC conversion                                | ✅  |                                                                  |
| **GFV empty field**                 | Returns `"Invalid Date"` string (truthy)                                             | ❌  | FORM-BUG-6                                                       |
| **DB storage**                      | SQL `datetime` — UTC value without marker                                            | ⚠️  | Correct value, missing marker                                    |
| **API write**                       | `postForms` stores input as-is                                                       | ✅  |                                                                  |
| **API read (postForms record)**     | `FormInstance/Controls` serializes with Z suffix                                     | ✅  | Z is correct here (value IS UTC)                                 |
| **API read (forminstance/ record)** | `FormInstance/Controls` serializes as US format (no Z)                               | ❌  | WEBSERVICE-BUG-1 — same DB value, different serialization        |
| **Dashboard**                       | Shows stored UTC value without conversion                                            | ⚠️  | Shows UTC time, not local — consistent but potentially confusing |
| **Round-trip**                      | GFV returns real UTC → SFV stores real UTC                                           | ✅  | Stable across all timezones                                      |

**Root cause**: DB stores UTC without a marker. The assumption breaks when values from Model 3/4 code paths land in the same column.

**Legacy (Config G)**: `useLegacy=true` bypasses GFV transformation → returns raw value instead of `toISOString()`. Return format differs from Config C, breaking consumer code that expects ISO.

---

### Model 3: Pinned DateTime — `enableTime=true, ignoreTZ=true` (Configs D, H)

**Can VV represent this correctly today?** No. Config D is affected by the most confirmed bugs of any configuration.

| Layer                               | Behavior                                                                                                          | OK? | Notes                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | :-: | --------------------------------------------------------------- |
| **SFV (write)**                     | `calChange()` → `toISOString()` (UTC) → `getSaveValue()` strips Z → stores local time                             | ✅  | Stores local time correctly (for Pinned: this is what you want) |
| **Form load (V1)**                  | `parseDateString()` → strips Z → local parse                                                                      | ✅  | Preserves the stored wall-clock time                            |
| **GFV (read)**                      | `moment(value).format("....[Z]")` → appends **literal** character Z                                               | ❌  | FORM-BUG-5 — consumers treat local time as UTC                  |
| **GFV empty field**                 | Returns `"Invalid Date"` string (truthy)                                                                          | ❌  | FORM-BUG-6                                                      |
| **DB storage**                      | SQL `datetime` — local value without TZ marker or anchor                                                          | ⚠️  | Missing anchor TZ — can't distinguish from Floating             |
| **API write**                       | `postForms` stores input as-is                                                                                    | ✅  |                                                                 |
| **API read (postForms record)**     | Serialized with Z suffix → Forms treats as UTC                                                                    | ❌  | WEBSERVICE-BUG-1 — local value incorrectly marked UTC           |
| **API read (forminstance/ record)** | Serialized as US format (no Z) → Forms preserves                                                                  | ✅  | No incorrect Z                                                  |
| **Dashboard**                       | Shows stored value, no conversion                                                                                 | ✅  | Pinned: show as-is                                              |
| **Round-trip**                      | GFV returns literal-Z local time → SFV interprets as UTC → converts to local → **shifts by TZ offset each cycle** | ❌  | FORM-BUG-5 drift: BRT -3h/trip, IST +5:30h/trip, UTC0 0h/trip   |

**Root cause**: The `[Z]` in the moment.js format string is a literal escape (brackets emit the character verbatim), not a timezone directive like `Z` (UTC offset). A correct Model 3 value is presented with a literal `Z` suffix, causing every downstream consumer to misidentify it as Model 2 and apply timezone conversion.

**Legacy (Config H)**: Bypasses the literal-Z path → GFV returns raw value. **Config H is the only DateTime+ignoreTZ configuration that survives round-trips** — as a side effect of bypassing the GFV transformation, not by design.

---

### Model 4: Floating DateTime — No dedicated config

**Can VV represent this correctly today?** Partially. Config D/H display path is correct (show as-is). The problems arise at the boundaries:

| Layer                   | Behavior                                                   | OK? | Notes                                |
| ----------------------- | ---------------------------------------------------------- | :-: | ------------------------------------ |
| **Display**             | Shows stored value as-is (when not corrupted by literal Z) | ✅  |                                      |
| **Filtering**           | SQL queries compare naive datetime values directly         | ✅  | No TZ conversion needed for Floating |
| **Cross-TZ comparison** | No mechanism to recognize that comparison is meaningless   | ⚠️  | Should warn or prevent               |
| **API serialization**   | Some paths add Z, some don't                               | ❌  | Z implies UTC (Model 2)              |
| **Round-trip**          | Same FORM-BUG-5 issue as Pinned (Config D)                 | ❌  |                                      |

Any code path that touches GFV (Config D) or any API response that adds Z will corrupt the value by forcing it into Model 2 semantics.

---

## 5. Bug-to-Model-Confusion Map

### Pattern Summary

| Model Confusion                                          | Count | Severity | Impact                                      |
| -------------------------------------------------------- | :---: | -------- | ------------------------------------------- |
| **Model 1 → Model 2** (Calendar Date treated as Instant) |   2   | HIGH     | Wrong date stored for UTC+ users            |
| **Model 3/4 → Model 2** (Pinned/Floating labeled as UTC) |   3   | HIGH     | Progressive drift, cross-layer shift        |
| **Model 2 → Model 3/4** (Instant stripped of UTC marker) |   2   | MEDIUM   | Correct UTC value re-parsed as local        |
| **Model 3 ≡ Model 4 conflation** (no anchor TZ stored)   |   —   | MEDIUM   | Filtering and comparison behavior undefined |

Three additional bugs are format parsing failures (not model confusion): silent data loss for non-US dates, unsupported compact/epoch formats.

### Detail by Component

**Forms (7 bugs):**

| Bug            | What Happens                                                  | Root Cause Category                                  |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| **FORM-BUG-1** | Z stripped from UTC datetime during form load                 | Model 2 → 3/4: Instant loses UTC anchor              |
| **FORM-BUG-2** | Popup and typed input store different formats (legacy only)   | Inconsistent serialization                           |
| **FORM-BUG-3** | V2 init path ignores actual field flags                       | Hardcoded Model 2 assumptions on Model 1/3/4 fields  |
| **FORM-BUG-4** | Z stripped on save                                            | Model 2 → 3/4: UTC instant becomes naive in DB       |
| **FORM-BUG-5** | GFV appends literal `[Z]` to local time                       | Model 3/4 → 2: local datetime falsely labeled as UTC |
| **FORM-BUG-6** | GFV returns `"Invalid Date"` for empty DateTime fields        | Empty value forced through formatting path           |
| **FORM-BUG-7** | Date-only string parsed as local midnight → wrong day in UTC+ | Model 1 → 2: Calendar Date forced into JS `Date`     |

**Web Services (6 bugs):**

| Bug                  | What Happens                                      | Root Cause Category                                   |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| **WEBSERVICE-BUG-1** | Controls endpoint adds Z to `postForms` records   | Model 3/4 → 2: naive datetime incorrectly marked UTC  |
| **WEBSERVICE-BUG-2** | DD/MM dates silently stored as null               | Format parsing failure (not model confusion)          |
| **WEBSERVICE-BUG-3** | Ambiguous dates parsed as MM/DD                   | Locale assumption (not model confusion)               |
| **WEBSERVICE-BUG-4** | Two endpoints serialize same DB value differently | Inconsistent model labeling (ISO+Z vs US format)      |
| **WEBSERVICE-BUG-5** | Compact ISO and epoch formats rejected            | Format support gap (not model confusion)              |
| **WEBSERVICE-BUG-6** | Date-only fields accept and store time components | Model 1 erasure: Calendar Date forced into `datetime` |

---

## 6. Cross-Layer Propagation

**The bug is in the serialization layer, not the storage layer.** The database stores correct values regardless of endpoint. The `FormInstance/Controls` endpoint adds an incorrect UTC marker to `postForms` records only, causing the Forms frontend to shift the time. The dashboard reads the DB directly and is always correct.

```
                                  Model 3/4 value: "14:30 local"
                                           │
                     ┌─────────────────────┤
                     │                     │
              postForms write         forminstance/ write
                     │                     │
                     ▼                     ▼
              DB: 2026-03-15          DB: 2026-03-15
                  14:30:00.000            14:30:00.000
              (identical)             (identical)
                     │                     │
                     ▼                     ▼
         FormInstance/Controls    FormInstance/Controls
         serializes as:          serializes as:
         "2026-03-15T14:30:00Z"  "3/15/2026 2:30:00 PM"
         (Model 2 — WRONG)      (Model 3/4 — correct)
                     │                     │
                     ▼                     ▼
              Forms V1 load:         Forms V1 load:
              Z → UTC → local        local parse → local
              14:30 - 3h = 11:30     14:30 preserved
              (SHIFTED)              (CORRECT)
                     │
                     ▼
              Dashboard (both):
              Shows DB value: 2:30 PM
              (CORRECT — dashboard ignores Forms serialization)
```

---

## 7. Architectural Limitations

### 7.1 No Model 1 storage type

`enableTime=false` is the closest to Model 1, but the backend stores it in SQL `datetime` with a time component, and JavaScript processes it via `moment()` / `new Date()` (Instant-native). **There is no code path that treats a date-only value as a pure calendar date from input to storage to output.**

### 7.2 No anchor timezone for Model 3

`ignoreTimezone=true` says "don't convert" — but doesn't store _which_ timezone the value belongs to. Without an anchor, SQL queries across timezones produce undefined results, stored values cannot be converted to UTC, and API consumers cannot know whether to convert or display as-is.

### 7.3 Model 3 and Model 4 share a single flag value

`ignoreTimezone=true` handles both "show everyone the same clock" (Pinned) and "show everyone their own clock" (Floating). These require different comparison/query behavior, but the flag cannot distinguish them.

### 7.4 The `useLegacy` side effect

`useLegacy=true` bypasses the GFV literal-Z transformation (FORM-BUG-5), making Config H more correct than Config D — as a side effect of skipping code, not by design. Legacy configs have their own format inconsistencies (FORM-BUG-2).

### 7.5 No model identification at any layer

The config flags exist only in the form template and are read only by the Forms frontend. No other layer has access:

| Layer                 | Knows the type? | Consequence                                                                                                      |
| --------------------- | :-------------: | ---------------------------------------------------------------------------------------------------------------- |
| **SQL Server**        |       ❌        | All fields use `datetime`. A Calendar Date, UTC instant, and local time are stored identically.                  |
| **API write path**    |       ❌        | Stores any valid date string as-is. Datetime sent to a date-only field is accepted without error.                |
| **API serialization** |       ❌        | Output format based on creation-path metadata, not field config. Same value gets Z or not depending on endpoint. |
| **API read path**     |       ❌        | Returns all values as ISO+Z. All date types look the same to the consumer.                                       |
| **Query engine**      |       ❌        | Compares raw `datetime` values. Cannot detect meaningless cross-model comparisons.                               |
| **Dashboard**         |       ❌        | Formats raw DB value. Correct only because it never converts.                                                    |
| **Forms frontend**    |       ⚠️        | Reads config flags but applies them inconsistently across code paths.                                            |

Each layer encounters the same bare value, guesses independently, and guesses differently. Fixing one layer does not prevent the next from guessing wrong.

### 7.6 Developer experience

Developers implementing customer projects face the same identification gap:

- **No format guidance**: The API accepts 20+ formats silently — some store correctly, some store null, some store the wrong date. No validation error on wrong format.
- **Timezone-dependent correctness**: Code that works in one timezone silently fails in another. No way to know without multi-timezone testing.
- **8 configurations, non-obvious interactions**: `useLegacy=true` avoids one bug but introduces a different format inconsistency. Interactions are undocumented.
- **Debugging by trial and error**: Field config × timezone × endpoint × component × code path = dozens of variables. No model identification, no error feedback.

Date handling is a recurring source of project delays, QA cycles, and support escalations — not because developers write incorrect code, but because the platform does not give them the information to write correct code.

---

## 8. Fix Strategy

**Categories of change:**

| Category    | What Must Change Across All Layers                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Model 1** | Date-only strings must never enter `Date` / `moment()`. Parse → validate → store as `YYYY-MM-DD` string. Return as string. Every layer must treat these as calendar positions, not timestamps.         |
| **Model 2** | Approximately correct today. Fix empty-field error, ensure the save path preserves the UTC marker. Every layer must consistently treat these as UTC instants.                                          |
| **Model 3** | Fix the incorrect UTC marker on local times (use a real timezone token or omit it entirely). Store anchor timezone as field metadata. Every layer must know the anchor and never apply UTC conversion. |
| **Model 4** | If needed: ensure naive datetime is never tagged with Z or any offset. Every layer must accept that cross-timezone comparison is undefined.                                                            |

> ### Design Decision Required
>
> Does VV need to distinguish Model 3 from Model 4? If all `ignoreTZ=true` use cases are Pinned (likely for enterprise document management), then storing the server timezone as the implicit anchor may be sufficient. If Floating use cases exist, they need a separate flag or field property. **This decision determines whether the fix is a targeted cross-layer effort or a broader schema extension.**

---

## 9. Anti-Patterns and Traps

### Observed in the current platform

| Anti-pattern                                                                      | Why it is wrong                                                                                            | Models affected |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------- |
| Using `moment(dateString).toDate()` or `new Date(dateString)` on date-only values | Forces a calendar date into a JS `Date` (always a UTC instant). Local midnight in UTC+ = previous UTC day. | Model 1         |
| Storing all date fields as SQL `datetime` with no `date` type                     | Date-only values gain a spurious time component, making equality queries unreliable                        | Model 1         |
| Stripping the `Z` suffix from UTC values before parsing                           | UTC instant loses its anchor, re-parsed as local time, shifted by viewer's offset                          | Model 2         |
| Appending a literal `Z` via `moment.format("...[Z]")`                             | Local time misidentified as UTC. Progressive drift on round-trips                                          | Model 3/4       |
| Serializing same DB value differently by creation endpoint                        | Consumers cannot predict the format. Same value treated as UTC or local depending on path                  | All             |
| Accepting any date format silently, storing null on failure                       | No feedback on wrong format. Data loss discovered only when record is opened                               | All             |
| No model discriminator in storage or transport                                    | Every layer guesses the date type independently                                                            | All             |

### Traps to avoid when fixing

| Approach                                            | Why it fails                                                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "Convert everything to UTC"                         | Destroys Model 3/4. A local 15:30 in São Paulo is not 18:30 UTC — converting loses wall-clock meaning.   |
| "Add Z to everything"                               | Forces all values into Model 2. This is the anti-pattern that causes the highest-severity bug.           |
| "Normalize date-only to midnight UTC"               | Still TZ-dependent. Midnight UTC is the previous day in UTC+. Date-only values should never have a time. |
| "Store the offset (-03:00) as metadata"             | Offsets change with DST. Store the timezone _name_ (`America/Sao_Paulo`), not the offset.                |
| "Use `Date.parse()` for server parsing"             | Parsing is implementation-dependent and locale-sensitive. Use explicit format-aware parsing.             |
| "Treat `ignoreTimezone` as 'no TZ handling needed'" | The opposite — it means the timezone IS the value's identity. Requires _more_ metadata, not less.        |
| "Compare dates from different configs in queries"   | A UTC instant and a local time in the same column cannot be meaningfully compared.                       |

---

## References

- [Forms Calendar Analysis](../forms-calendar/analysis/overview.md) — 7 bugs, V1/V2 comparison
- [Web Services Analysis](../web-services/analysis/overview.md) — 6 bugs, 148 tests (initial matrix), serialization evidence
- [Dashboards Analysis](../dashboards/analysis/overview.md) — 1 bug, 44 tests (initial matrix), server-rendered display
- [Form Fields Reference](../../../docs/reference/form-fields.md) — Config properties, VV.Form API

This analysis is backed by a supporting test repository containing automation scripts, per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.
