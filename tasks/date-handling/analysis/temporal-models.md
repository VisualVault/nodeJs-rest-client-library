# VisualVault Date Handling — Root Cause Analysis

## Why This Document Exists

The VisualVault platform has a systemic problem with how it identifies and handles date/time values. Date defects affect customer projects, QA cycles, and support across the organization. This investigation provides a comprehensive analysis to identify the specific issues and their shared root cause. This investigation determined that these are not isolated bugs — they are symptoms of an architectural limitation that affects every component that stores, reads, or displays dates.

---

## Executive Summary

### What we found

- **14 confirmed bugs so far** across Forms (7), Web Services (6), Dashboards (1)
- **All 14 trace to one root cause**: date/time values serve different purposes — a due date, a UTC timestamp, and a local clock reading each require different storage, display, and comparison rules. The platform attempts to distinguish them through field configuration flags, but this logic is scoped to a single component, inconsistent across layers, and ultimately limited by a storage layer that cannot represent different date types

### Why it happens

- Once a date value is stored, **no component can determine what type it is**. The same SQL `datetime` column holds date-only values, UTC timestamps, and local times — all as bare numbers with no discriminator. Every downstream operation applies its own hardcoded interpretation — based on incidental signals like the presence of a Z suffix or which endpoint wrote the record — rather than the actual field configuration. These interpretations contradict each other, so the same stored value displays differently depending on which layer reads it
- The 3 field config flags (`enableTime`, `ignoreTimezone`, `useLegacy`) are the only signal about date type, but they exist only in the form template — the database, API serialization, and query engine do not consult them. **No configuration correctly implements its intended behavior across all code paths**

### Why it matters

- The highest-severity pattern causes **permanent data corruption**: local times incorrectly labeled as UTC, shifting values when a user opens a record in Forms
- The problem is architectural — patching individual bugs without making the date type identifiable will leave systemic issues. Any new platform feature, endpoint, or integration will reintroduce the same defects, and any date handling or computation in customer project code will face the same ambiguity
- **Developer experience is directly affected**: no format guidance, no validation errors, timezone-dependent correctness that fails silently. Date handling is a recurring source of project delays and support escalations (see § 6.5)

### What needs to happen

- For date handling to be correct, every layer — from database storage through API serialization to each user-facing component — must be able to identify which date type a value represents and handle it according to that type's rules. Today, no layer can make that identification
- The fix is not 14 isolated patches — it is **4 categories of change** (one per date/time category, § 1), each requiring coordinated fixes across all of these layers
- **Key design decision**: does VV need to distinguish "same clock for everyone" from "local clock for each viewer"? These share a single config flag today

---

## Investigation Scope

The bug count (14) is a lower bound — tested components do not have exhaustive coverage, and several platform areas remain untested.

Beyond untested components, these 14 bugs are **core platform defects**. Implementation-layer code (form scripts, scheduled scripts, web service integrations) inherits and amplifies them through standard date handling patterns — the total defect surface for a deployed project extends well beyond these 14 bugs. Implementation-layer impact is detailed in § 6.5.

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

The Node.js client library (`lib/VVRestApi/`) was confirmed as a transparent passthrough — no date transformation at any layer (see Web Services Analysis § 3). Untested components will inherit the same storage-layer ambiguity (no model discriminator, mixed UTC/local values in the same column), but each has its own rendering and query logic — they may reproduce different subsets of these bugs or introduce component-specific defects not seen in Forms or Web Services.

---

## 1. The Four Models

The database column behind every calendar field stores a bare `datetime` value — it carries no information about what that value _means_. Is `2026-03-15 14:30:00` a UTC instant? A local time pinned to São Paulo? A floating time that means "2:30 PM wherever you are"?

These four models are exhaustive — every date/time use case maps to exactly one, and a typical project requires several of them simultaneously. The platform must support all four correctly.

|                     | 1 — Calendar Date           | 2 — Instant                         | 3 — Pinned DateTime                     | 4 — Floating DateTime             |
| ------------------- | --------------------------- | ----------------------------------- | --------------------------------------- | --------------------------------- |
| **Example**         | Due date, birthday, holiday | `createdAt`, audit trail, event log | "Incident at 15:30 São Paulo time"      | "Take medication at 8 AM"         |
| **Core rule**       | Same date everywhere        | One moment, many local clocks       | One clock reading, one specific zone    | Same clock reading, viewer's zone |
| **Correct storage** | `YYYY-MM-DD` — no time      | UTC with explicit Z or offset       | Naive datetime + anchor timezone        | Naive datetime — no TZ            |
| **Correct display** | Show as-is — no conversion  | Convert to viewer's local timezone  | Show as-is — do not convert             | Show as-is — do not convert       |
| **Comparison**      | String or date-only         | Compare UTC values directly         | Convert to UTC via anchor, then compare | Undefined across timezones        |

---

## 2. How VV Configurations Map to Models

The three boolean flags (`enableTime`, `ignoreTimezone`, `useLegacy`) create 8 combinations, but they map to only 2–3 intended models:

| Configuration                                       | Intended Model                   |
| --------------------------------------------------- | -------------------------------- |
| `enableTime=false` (any combination of other flags) | 1 — Calendar Date                |
| `enableTime=true`, `ignoreTimezone=false`           | 2 — Instant                      |
| `enableTime=true`, `ignoreTimezone=true`            | 3 or 4 — Pinned/Floating (§ 6.3) |

- `ignoreTimezone` has no effect on date-only fields (`enableTime=false`)
- `useLegacy` changes code paths but does not define a different date model
- **No config correctly implements its intended model.** Every configuration has at least one code path that breaks the model's semantics (see § 3)

---

## 3. Current State Per Model

| Model             | VV Configuration                            | Works? | Key Issue                              | Confirmed Bugs |
| ----------------- | ------------------------------------------- | :----: | -------------------------------------- | :------------: |
| 1 — Calendar Date | `enableTime=false` (all date-only variants) |   ❌   | JS `Date` forces TZ-dependent midnight |       2        |
| 2 — Instant       | `enableTime=true`, `ignoreTimezone=false`   |   ⚠️   | Approximately correct; edge cases      |       2        |
| 3 — Pinned        | `enableTime=true`, `ignoreTimezone=true`    |   ❌   | Local times incorrectly marked as UTC  |       3        |
| 4 — Floating      | (none — shares Pinned config)               |   ⚠️   | No dedicated config (§ 6.3)            |   Same as 3    |

Per-model layer-by-layer behavior is documented in the individual bug reports under the Forms Calendar Analysis and Web Services Analysis.

---

## 4. Bug-to-Model-Confusion Map

### Pattern Summary

The 14 confirmed bugs are not independent — they cluster into four patterns where one date model is misinterpreted as another:

| Model Confusion                                              | Count | Severity | Impact                                      |
| ------------------------------------------------------------ | :---: | -------- | ------------------------------------------- |
| **Calendar Date → Instant** (date-only treated as timestamp) |   2   | HIGH     | Wrong date stored for UTC+ users            |
| **Pinned/Floating → Instant** (local time labeled as UTC)    |   3   | HIGH     | Progressive drift, cross-layer shift        |
| **Instant → Pinned/Floating** (UTC marker stripped on load)  |   2   | MEDIUM   | Correct UTC value re-parsed as local        |
| **Pinned ≡ Floating conflation** (no anchor timezone stored) |   —   | MEDIUM   | Filtering and comparison behavior undefined |

Three additional bugs are format parsing failures (not model confusion): silent data loss for non-US dates, unsupported compact/epoch formats.

### Detail by Component

**Forms (7 bugs):**

| Bug            | What Happens                                                            | Root Cause Category                                |
| -------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| **FORM-BUG-1** | UTC marker removed during form load — value reinterpreted as local time | Instant → Pinned/Floating                          |
| **FORM-BUG-2** | Popup and typed input store different formats (legacy only)             | Inconsistent serialization                         |
| **FORM-BUG-3** | Alternate init path ignores actual field flags                          | Hardcoded Instant assumptions on other field types |
| **FORM-BUG-4** | UTC marker removed on save — value stored as naive datetime             | Instant → Pinned/Floating                          |
| **FORM-BUG-5** | `GetFieldValue` appends false UTC marker to local time                  | Pinned/Floating → Instant                          |
| **FORM-BUG-6** | `GetFieldValue` returns `"Invalid Date"` for empty DateTime fields      | Empty value forced through formatting path         |
| **FORM-BUG-7** | Date-only string parsed as local midnight → wrong day in UTC+           | Calendar Date → Instant                            |

**Web Services (6 bugs):**

| Bug                  | What Happens                                                | Root Cause Category        |
| -------------------- | ----------------------------------------------------------- | -------------------------- |
| **WEBSERVICE-BUG-1** | Serialization endpoint adds false UTC marker to local times | Pinned/Floating → Instant  |
| **WEBSERVICE-BUG-2** | DD/MM dates silently stored as null                         | Format parsing failure     |
| **WEBSERVICE-BUG-3** | Ambiguous dates parsed as MM/DD                             | Locale assumption          |
| **WEBSERVICE-BUG-4** | Two endpoints serialize the same stored value differently   | Inconsistent serialization |
| **WEBSERVICE-BUG-5** | Compact ISO and epoch formats rejected                      | Format support gap         |
| **WEBSERVICE-BUG-6** | Date-only fields accept and store time components           | Calendar Date not enforced |

---

## 5. How Bugs Compound Across Layers

The storage layer is part of the root cause: all date types share a single SQL `datetime` column with no discriminator, and different code paths store the same logical value differently — one as UTC, another as local time — both without timezone metadata. The database preserves whatever it receives, but cannot distinguish between these representations afterward.

The serialization layer compounds this. The same stored value (`2026-03-15 14:30:00.000`) is serialized as `"2026-03-15T14:30:00Z"` (marked as UTC) or `"3/15/2026 2:30:00 PM"` (unmarked, treated as local) depending on which endpoint originally **wrote** the record — not on the field configuration or the endpoint reading it. When Forms loads the UTC-marked value, it converts it to local time and shifts it. The unmarked value is not converted, so it displays as stored.

The dashboard bypasses the serialization layer entirely — it reads raw `datetime` values directly from the database and displays them as stored. This avoids the cross-layer shift, but also means any upstream storage inconsistency (UTC vs local) is displayed without correction.

This is why per-component fixes are insufficient — a fix in the serialization layer does not address the mixed storage, and a fix in storage does not prevent serialization from misidentifying values. The bugs interact across layers because no layer carries the information needed to handle the values correctly.

---

## 6. Architectural Limitations

### 6.1 No Calendar Date storage type

`enableTime=false` is the closest to Calendar Date, but the backend stores it in SQL `datetime` with a time component, and JavaScript processes it via `moment()` / `new Date()`, which treat all values as timestamps. **There is no code path that treats a date-only value as a pure calendar date from input to storage to output.**

### 6.2 No anchor timezone for Pinned DateTime

`ignoreTimezone=true` says "don't convert" — but doesn't store _which_ timezone the value belongs to. Without an anchor, SQL queries across timezones produce undefined results, stored values cannot be converted to UTC, and API consumers cannot know whether to convert or display as-is.

### 6.3 Pinned and Floating DateTime share a single flag value

`ignoreTimezone=true` handles both "show everyone the same clock" (Pinned) and "show everyone their own clock" (Floating). These require different comparison/query behavior, but the flag cannot distinguish them.

### 6.4 No model identification at any layer

The config flags exist only in the form template and are read only by the Forms frontend. No other layer has access:

| Layer                 | Knows the type? | Consequence                                                                                                                 |
| --------------------- | :-------------: | --------------------------------------------------------------------------------------------------------------------------- |
| **SQL Server**        |       ❌        | All fields use `datetime`. A Calendar Date, UTC instant, and local time are stored identically.                             |
| **API write path**    |       ❌        | Stores any valid date string as-is. Datetime sent to a date-only field is accepted without error.                           |
| **API serialization** |       ❌        | Output format based on creation-path metadata, not field config. Same value gets a UTC marker or not depending on endpoint. |
| **API read path**     |       ❌        | Returns all values with UTC marker appended. All date types look the same to the consumer.                                  |
| **Query engine**      |       ❌        | Compares raw `datetime` values. Cannot detect meaningless cross-model comparisons.                                          |
| **Dashboard**         |       ❌        | Displays as stored — no conversion applied.                                                                                 |
| **Forms frontend**    |       ⚠️        | Reads config flags but applies them inconsistently across code paths.                                                       |

### 6.5 Developer experience

Developers implementing customer projects face the same ambiguity:

- **No format guidance**: The API accepts 20+ formats silently — some store correctly, some store null, some store the wrong date. No validation error on wrong format.
- **Timezone-dependent correctness**: Code that works in one timezone silently fails in another. No way to know without multi-timezone testing.
- **8 configurations, non-obvious interactions**: Workarounds for one bug often trigger another. Interactions between flags are undocumented.
- **Debugging by trial and error**: Field config × timezone × endpoint × component × code path = dozens of variables. No model identification, no error feedback.
- **JS `Date` pitfalls amplify platform bugs**: Implementation scripts using standard patterns (`new Date()`, `moment()`, `toISOString()`) silently produce wrong results because the platform's return values carry ambiguous timezone semantics — the developer has no way to know which format or timezone marker `GetFieldValue` will return.

These issues are a direct consequence of the architectural limitations above — without model identification at any layer, correct date handling requires knowledge that is not available to the developer at the point where decisions must be made.

---

## References

This analysis is backed by a dedicated test repository with automated regression pipelines (Forms, Web Services, Dashboards), cross-timezone Playwright infrastructure (4 timezones × 3 browsers), structured test matrices tracking 430+ test slots, per-bug analysis with fix-recommendation companions, and a customer impact assessment (WADNR — 137 calendar fields across 35 form templates). The repository, including all execution records and reproduction scripts, is maintained by the Solution Architecture team.
