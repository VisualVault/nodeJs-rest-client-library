# VisualVault Date Handling — Root Cause Analysis

## Why This Document Exists

The VisualVault platform has a systemic problem with how it handles dates and times. Multiple customer projects have reported date-related defects in production, QA teams routinely flag date issues during UAT, and support tickets about incorrect dates have been a recurring pattern for an extended period. This investigation determined that these are not isolated bugs — they are symptoms of an architectural limitation that affects every component that stores, reads, or displays dates.

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
- The problem is architectural — patching individual bugs without making the date type identifiable will leave systemic issues. Any new platform feature, endpoint, or integration will reintroduce the same defects, and any date handling or computation in customer project code will face the same ambiguity
- **Developer experience is directly affected**: no format guidance, no validation errors, timezone-dependent correctness that fails silently. Date handling is a recurring source of project delays and support escalations (see § 6.5)

### What needs to happen

- For date handling to be correct, every layer — from database storage through API serialization to each user-facing component — must be able to identify which date type a value represents and handle it according to that type's rules. Today, no layer can make that identification
- The fix is not 14 isolated patches — it is **4 categories of change** (one per date/time category, § 1), each requiring coordinated fixes across all of these layers
- **Key design decision**: does VV need to distinguish "same clock for everyone" from "local clock for each viewer"? These share a single config flag today. See § 7

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

> **Models 3 vs 4 — why this matters**: The platform uses a single setting for both Pinned and Floating, with no way to distinguish them. Without knowing which timezone the value belongs to, the system cannot determine whether `"15:30"` means "15:30 at the data-entry location" (Pinned — convertible to UTC) or "15:30 wherever you are" (Floating — no single UTC equivalent, cross-timezone comparison is meaningless). This ambiguity becomes a bug whenever the system needs to compare, filter, or round-trip these values.

---

## 2. How VV Configurations Map to Models

The three boolean flags (`enableTime`, `ignoreTimezone`, `useLegacy`) create 8 combinations, but they map to only 2–3 intended models:

1. **8 configs, 3 intended models.** 4 date-only configs → Model 1 (Calendar Date). 2 DateTime+TZ configs → Model 2 (Instant). 2 DateTime+ignoreTZ configs → Model 3 or 4 (Pinned/Floating). `ignoreTZ` adds no value for date-only fields; `useLegacy` is an implementation toggle, not a semantic one.

2. **The ignoreTZ configs cannot distinguish Pinned from Floating** — no anchor timezone is stored (see § 1).

3. **No config correctly implements its intended model.** Every configuration has at least one code path that breaks the model's semantics (see § 3).

---

## 3. Current State Per Model

| Model             | VV Configs | Works? | Key Issue                              | Confirmed Bugs |
| ----------------- | ---------- | :----: | -------------------------------------- | :------------: |
| 1 — Calendar Date | A, B, E, F |   ❌   | JS `Date` forces TZ-dependent midnight |       2        |
| 2 — Instant       | C, G       |   ⚠️   | Approximately correct; edge cases      |       2        |
| 3 — Pinned        | D, H       |   ❌   | Literal Z + no anchor TZ               |       3        |
| 4 — Floating      | (none)     |   ⚠️   | No dedicated config; shares D/H        |   Same as 3    |

Per-model layer-by-layer behavior is documented in the individual bug reports under [Forms Calendar Analysis](../forms-calendar/analysis/overview.md) and [Web Services Analysis](../web-services/analysis/overview.md).

---

## 4. Bug-to-Model-Confusion Map

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

## 5. Cross-Layer Propagation

**The bug is in the serialization layer, not the storage layer.** The database stores correct values regardless of which endpoint wrote them. The `FormInstance/Controls` serialization endpoint adds an incorrect UTC marker (`Z`) to `postForms` records only — causing the Forms frontend to interpret local times as UTC and shift them. Records written via `forminstance/` serialize without the `Z` and load correctly. The dashboard reads the DB directly and is always correct.

The same DB value (`2026-03-15 14:30:00.000`) becomes `"2026-03-15T14:30:00Z"` (wrong — treated as UTC, shifted on load) or `"3/15/2026 2:30:00 PM"` (correct — preserved as local) depending solely on which endpoint originally created the record.

---

## 6. Architectural Limitations

### 6.1 No Model 1 storage type

`enableTime=false` is the closest to Model 1, but the backend stores it in SQL `datetime` with a time component, and JavaScript processes it via `moment()` / `new Date()` (Instant-native). **There is no code path that treats a date-only value as a pure calendar date from input to storage to output.**

### 6.2 No anchor timezone for Model 3

`ignoreTimezone=true` says "don't convert" — but doesn't store _which_ timezone the value belongs to. Without an anchor, SQL queries across timezones produce undefined results, stored values cannot be converted to UTC, and API consumers cannot know whether to convert or display as-is.

### 6.3 Model 3 and Model 4 share a single flag value

`ignoreTimezone=true` handles both "show everyone the same clock" (Pinned) and "show everyone their own clock" (Floating). These require different comparison/query behavior, but the flag cannot distinguish them.

### 6.4 No model identification at any layer

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

### 6.5 Developer experience

Developers implementing customer projects face the same identification gap:

- **No format guidance**: The API accepts 20+ formats silently — some store correctly, some store null, some store the wrong date. No validation error on wrong format.
- **Timezone-dependent correctness**: Code that works in one timezone silently fails in another. No way to know without multi-timezone testing.
- **8 configurations, non-obvious interactions**: `useLegacy=true` avoids one bug but introduces a different format inconsistency. Interactions are undocumented.
- **Debugging by trial and error**: Field config × timezone × endpoint × component × code path = dozens of variables. No model identification, no error feedback.

Date handling is a recurring source of project delays, QA cycles, and support escalations — not because developers write incorrect code, but because the platform does not give them the information to write correct code.

---

## 7. Fix Strategy

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

## 8. Traps to Avoid When Fixing

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
