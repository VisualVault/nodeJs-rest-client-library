# Temporal Mental Models — Root Cause Framework

Why every date bug in VisualVault exists, and why config flags alone cannot fix them.

Last updated: 2026-04-06

---

## 1. The Four Models

Dates and times serve different purposes. A single `datetime` column cannot faithfully represent all of them without explicit metadata about **which model the value belongs to**. These four models are exhaustive — every real-world date/time use case maps to exactly one.

### Model 1: Calendar Date

A position on the calendar. No time component, no timezone. The same everywhere on Earth simultaneously.

| Property               | Value                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Examples**           | Birthday, due date, contract expiration, holiday, effective date                                             |
| **Core rule**          | March 15 is March 15 in every timezone                                                                       |
| **Correct storage**    | `YYYY-MM-DD` as a string or SQL `date` type. **Never attach a time.**                                        |
| **Correct display**    | Same value everywhere — no conversion                                                                        |
| **Correct comparison** | String or date-only comparison. Never convert to timestamp.                                                  |
| **Anti-pattern**       | Storing as `datetime` with midnight → the "midnight" is in some timezone, making the date timezone-dependent |

### Model 2: Instant

A single point on the universal timeline. Everyone agrees _when_ it happened; the local representation (date, hour) differs by timezone.

| Property               | Value                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Examples**           | Audit trail, `createdAt`, event log, "meeting starts at 2 PM EST"                      |
| **Core rule**          | One moment, many representations                                                       |
| **Correct storage**    | UTC timestamp (with explicit Z or +00:00 marker)                                       |
| **Correct display**    | Convert to viewer's local timezone before rendering                                    |
| **Correct comparison** | Compare UTC values directly                                                            |
| **Anti-pattern**       | Stripping the Z and re-parsing as local → shifts the instant by the viewer's TZ offset |

### Model 3: Pinned DateTime

A date and time anchored to a **specific timezone's wall clock**. Everyone sees the same numbers regardless of where they are. The anchor timezone is part of the value's identity.

| Property               | Value                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Examples**           | "The incident at the São Paulo office happened at 15:30 on March 15", regulatory timestamps, location-specific records        |
| **Core rule**          | One representation, pinned to one zone — all viewers see the same clock reading                                               |
| **Correct storage**    | Naive datetime **plus** the anchor timezone (e.g., `America/Sao_Paulo`), OR convert to UTC with the anchor stored as metadata |
| **Correct display**    | Show the stored value as-is — do not convert to viewer's timezone                                                             |
| **Correct comparison** | Convert to UTC using the anchor timezone, then compare                                                                        |
| **Anti-pattern**       | Storing without the anchor timezone → indistinguishable from Model 4 (Floating), and UTC conversion becomes impossible        |

### Model 4: Floating DateTime

A date and time that means "this time **in your timezone**, wherever you are." No anchor to any specific zone. Each viewer independently interprets the value in their own local context.

| Property               | Value                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Examples**           | "Take medication at 8:00 AM", "office opens at 9 AM local time", store hours, alarms                                      |
| **Core rule**          | Same clock reading, but each viewer's own zone — 8 AM means 8 AM in São Paulo for one user and 8 AM in Mumbai for another |
| **Correct storage**    | Naive datetime with **no** timezone — intentionally ambiguous                                                             |
| **Correct display**    | Show the stored value as-is — do not convert                                                                              |
| **Correct comparison** | Cannot meaningfully compare across timezones — there is no single UTC equivalent                                          |
| **Anti-pattern**       | Appending Z or any timezone marker → forces the value into Model 2 (Instant)                                              |

---

## 2. Models 3 vs 4 — The Critical Distinction

Pinned and Floating look identical in storage (both are naive datetimes) and in display (both show the value as-is). The difference emerges in **three operations**:

| Operation                                   | Model 3 (Pinned)                                                | Model 4 (Floating)                                                                        |
| ------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **"What UTC instant does this represent?"** | Answerable — use the anchor TZ to convert                       | **Unanswerable** — no single UTC equivalent exists                                        |
| **Cross-timezone comparison**               | Convert both to UTC via their anchors, then compare             | Meaningless — "8 AM local" in São Paulo and "8 AM local" in Mumbai are different instants |
| **Filtering by date range**                 | Convert the filter bounds to the anchor TZ, apply to UTC values | Apply the filter as-is to the naive values (no conversion)                                |

**Why this matters for VV**: `ignoreTZ=true` conflates these two models. It stores a naive datetime without an anchor timezone, making it impossible to know whether the value represents "3:00 PM at the data-entry location" (Pinned) or "3:00 PM wherever you are" (Floating). This ambiguity becomes a bug when the system needs to compare, filter, or round-trip these values.

---

## 3. Mapping VV Configurations to Models

Each VV field configuration is an attempt to represent one of these models. The three boolean flags (`enableTime`, `ignoreTimezone`, `useLegacy`) create 8 combinations, but they map to only 2–3 intended models:

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

**Key observations:**

1. **8 configs, but only 3 intended models.** A/B/E/F all want Model 1. C/G want Model 2. D/H want Model 3 or 4. The `ignoreTZ` flag adds no value for date-only fields, and `useLegacy` is an implementation toggle, not a semantic one.

2. **Model 4 (Floating) has no dedicated config.** D/H could serve either Pinned or Floating, but without storing the anchor timezone, the platform cannot distinguish them. In practice, VV treats D/H as Pinned (display as-is), which is also correct for Floating — until you need to filter, sort, or compare across timezones.

3. **No config correctly implements its intended model.** Every configuration has at least one code path that breaks the model's semantics (see § 4).

---

## 4. Current State Per Model

For each mental model: can VV represent it today? What works, what breaks, and where?

### Model 1: Calendar Date — `enableTime=false` (Configs A, B, E, F)

**Can VV represent this correctly today?** No. Broken for UTC+ timezones.

**The fundamental problem**: JavaScript's `Date` object is always an Instant (Model 2). To store a Calendar Date in a `Date`, you must attach a time — and the code picks local midnight. For UTC+ users, local midnight is the previous UTC day. When the value is later extracted as a UTC date string, it's off by one day.

| Layer              | Behavior                                                                                                      |                                    Correct?                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------: |
| **SFV (write)**    | `normalizeCalValue()` → `moment("2026-03-15").toDate()` → local midnight → `getSaveValue()` extracts UTC date |                     BRT: yes. IST: **-1 day** (FORM-BUG-7)                     |
| **Form load (V1)** | `initCalendarValueV1()` → `moment(e).toDate()` → same local-midnight conversion                               |                     BRT: yes. IST: **-1 day** (FORM-BUG-7)                     |
| **GFV (read)**     | Returns raw stored value (no transformation)                                                                  |                        Correct (reads what was stored)                         |
| **DB storage**     | SQL `datetime` with `00:00:00.000` time component                                                             |                    Wrong type — should be `date` or string                     |
| **API write**      | `postForms` stores string as-is                                                                               |                            Correct (no conversion)                             |
| **API read**       | `getForms` returns ISO with Z (`"2026-03-15T00:00:00Z"`)                                                      | Misleading — the Z implies UTC midnight, but the value might be local midnight |
| **Dashboard**      | Shows stored value, no conversion                                                                             |                           Correct (transparent read)                           |
| **Round-trip**     | GFV→SFV: raw date string → `moment().toDate()` → local midnight → extract UTC date                            |          BRT: stable. IST: **-1 day per trip** (FORM-BUG-7 compounds)          |

**Root cause**: Using `Date` / `moment()` for Calendar Dates forces a Model 1 → Model 2 conversion at the JavaScript layer. The conversion is timezone-dependent, so it works in some timezones (UTC-) and fails in others (UTC+).

**What would fix it**: Parse and store date-only strings without ever constructing a `Date` object. Validate the format, store `YYYY-MM-DD`, return `YYYY-MM-DD`. Never call `moment()` or `new Date()` on a date-only value.

---

### Model 2: Instant — `enableTime=true, ignoreTZ=false` (Configs C, G)

**Can VV represent this correctly today?** Approximately — Config C is the safest configuration, but has edge cases.

| Layer                               | Behavior                                                                             |                             Correct?                             |
| ----------------------------------- | ------------------------------------------------------------------------------------ | :--------------------------------------------------------------: |
| **SFV (write)**                     | `calChange()` → `toISOString()` (UTC) → `getSaveValue()` strips Z → stores naive UTC |               Loses the Z marker, but value IS UTC               |
| **Form load (V1)**                  | `parseDateString()` → strips Z → `new Date(local)` → reconverts                      |             Net effect: correct display in user's TZ             |
| **GFV (read)**                      | `new Date(value).toISOString()` → real UTC conversion                                |                             Correct                              |
| **GFV empty field**                 | Returns `"Invalid Date"` string (truthy)                                             |                       **Bug** (FORM-BUG-6)                       |
| **DB storage**                      | SQL `datetime` — UTC value without marker                                            |                  Correct value, missing marker                   |
| **API write**                       | `postForms` stores input as-is                                                       |                             Correct                              |
| **API read (postForms record)**     | `FormInstance/Controls` serializes with Z suffix                                     |                 Z is correct here (value IS UTC)                 |
| **API read (forminstance/ record)** | `FormInstance/Controls` serializes as US format (no Z)                               |    WEBSERVICE-BUG-1 — same DB value, different serialization     |
| **Dashboard**                       | Shows stored UTC value without conversion                                            | Shows UTC time, not local — potentially confusing but consistent |
| **Round-trip**                      | GFV returns real UTC → SFV stores real UTC                                           |                   Stable across all timezones                    |

**Root cause of remaining issues**: The DB stores UTC but **without a marker** (SQL `datetime` is timezone-unaware). Everything downstream must assume UTC, but the assumption can break when values from other code paths (Model 3/4) land in the same column.

**Legacy (Config G)**: `useLegacy=true` bypasses GFV transformation → returns raw stored value instead of `toISOString()`. This is actually more transparent (no conversion), but it means the return format differs from Config C, breaking consumer code that expects ISO format.

---

### Model 3: Pinned DateTime — `enableTime=true, ignoreTZ=true` (Configs D, H)

**Can VV represent this correctly today?** No. Config D has the highest bug density of any configuration.

| Layer                               | Behavior                                                                                                       |                             Correct?                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------: |
| **SFV (write)**                     | `calChange()` → `toISOString()` (UTC) → `getSaveValue()` strips Z → stores local time                          |  Stores local time correctly (for Pinned: this is what you want)  |
| **Form load (V1)**                  | `parseDateString()` → strips Z → local parse                                                                   |     Correct for Pinned — preserves the stored wall-clock time     |
| **GFV (read)**                      | `moment(value).format("....[Z]")` → appends **literal** character Z                                            |        **FORM-BUG-5** — consumers treat local time as UTC         |
| **GFV empty field**                 | Returns `"Invalid Date"` string (truthy)                                                                       |                          **FORM-BUG-6**                           |
| **DB storage**                      | SQL `datetime` — local value without TZ marker or anchor                                                       |      **Missing anchor TZ** — can't distinguish from Floating      |
| **API write**                       | `postForms` stores input as-is                                                                                 |                              Correct                              |
| **API read (postForms record)**     | Serialized with Z suffix → Forms treats as UTC                                                                 |       **WEBSERVICE-BUG-1** — local value falsely marked UTC       |
| **API read (forminstance/ record)** | Serialized as US format (no Z) → Forms preserves                                                               |                       Correct (no false Z)                        |
| **Dashboard**                       | Shows stored value, no conversion                                                                              |                   Correct (Pinned: show as-is)                    |
| **Round-trip**                      | GFV returns fake-Z local time → SFV interprets as UTC → converts to local → **shifts by TZ offset each cycle** | **FORM-BUG-5 drift**: BRT -3h/trip, IST +5:30h/trip, UTC0 0h/trip |

**Root cause**: The `[Z]` in the moment.js format string is a **literal escape** (square brackets = emit character verbatim), not a timezone directive. The developer likely intended `Z` (UTC offset) or `ZZ` (offset with colon). This single character transforms a correct Model 3 value into a misidentified Model 2 value, triggering UTC conversion in every downstream consumer.

**Compounding factor**: Even without the fake Z, the DB stores no anchor timezone. A Pinned value of "3:00 PM" is stored identically to a Floating value of "3:00 PM" — the system cannot tell them apart.

**Legacy (Config H)**: `useLegacy=true` bypasses the fake-Z path → GFV returns raw value. **Config H is the only DateTime+ignoreTZ configuration that survives round-trips.** It accidentally implements Model 3 more correctly than Config D.

---

### Model 4: Floating DateTime — No dedicated config

**Can VV represent this correctly today?** Partially, by accident.

No VV configuration is explicitly designed for Floating DateTime. However, Config D/H behavior (store naive datetime, display as-is) happens to be correct for Floating **in the display path** — the viewer sees the stored time without conversion, which is exactly what Floating requires.

The problems arise at the boundaries:

| Layer                   | Behavior                                                 |             Correct for Floating?              |
| ----------------------- | -------------------------------------------------------- | :--------------------------------------------: |
| **Display**             | Shows stored value as-is (when not corrupted by fake Z)  |                    Correct                     |
| **Filtering**           | SQL queries compare naive datetime values directly       | Correct for Floating — no TZ conversion needed |
| **Cross-TZ comparison** | No mechanism to recognize that comparison is meaningless |        Missing — should warn or prevent        |
| **API serialization**   | Some paths add Z, some don't                             |        Wrong — Z implies UTC (Model 2)         |
| **Round-trip**          | Same FORM-BUG-5 issue as Pinned (Config D)               |                     Broken                     |

**Bottom line**: VV can store Floating values in Config D/H, and the dashboard will display them correctly. But any code path that touches GFV (Config D), or any API response that adds Z, will corrupt the value by forcing it into Model 2 semantics.

---

## 5. Bug-to-Model-Confusion Map

Every confirmed bug traces to a specific point where the code treats a value as the wrong model.

### Forms Bugs

| Bug            | What happens                                                  | Model confusion                                                                                                                      | Where in code                                                            |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **FORM-BUG-1** | `parseDateString()` strips Z from UTC datetime                | Model 2 → Model 3/4: an Instant loses its UTC anchor, becoming a naive local value                                                   | `parseDateString()` ~line 104126                                         |
| **FORM-BUG-2** | Popup and typed input store different formats (legacy only)   | Inconsistent serialization — same user input yields different DB representations                                                     | `getSaveValue()` vs legacy popup path                                    |
| **FORM-BUG-3** | V2 `initCalendarValueV2()` ignores actual field flags         | Hardcoded Model 2 assumptions applied to Model 1/3/4 fields                                                                          | `initCalendarValueV2()`                                                  |
| **FORM-BUG-4** | `getSaveValue()` strips Z on save                             | Model 2 → Model 3/4: UTC instant becomes naive datetime in DB                                                                        | `getSaveValue()` ~line 104100                                            |
| **FORM-BUG-5** | GFV appends literal `[Z]` to local time                       | **Model 3/4 → Model 2**: Pinned/Floating datetime falsely labeled as UTC Instant. Every consumer assumes UTC; round-trips drift.     | `getCalendarFieldValue()` ~line 104114                                   |
| **FORM-BUG-6** | GFV returns `"Invalid Date"` for empty Config C/D             | Empty value forced through Model 2/3 formatting path → invalid output                                                                | `getCalendarFieldValue()`                                                |
| **FORM-BUG-7** | Date-only string parsed as local midnight → wrong day in UTC+ | **Model 1 → Model 2**: Calendar Date forced into JavaScript `Date` (Instant). Local midnight conversion creates timezone dependency. | `normalizeCalValue()` ~line 102793, `initCalendarValueV1()` ~line 102886 |

### Web Services Issues

| Issue                | What happens                                                   | Model confusion                                                                                                                                            | Where                                      |
| -------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **WEBSERVICE-BUG-1** | `FormInstance/Controls` adds Z to postForms records            | **Model 3/4 → Model 2**: Server serialization marks naive datetime as UTC. Forms V1 trusts the Z and converts, shifting the value by the user's TZ offset. | FormsAPI serialization layer (server-side) |
| **WEBSERVICE-BUG-2** | DD/MM/YYYY input silently stored as null                       | Not model confusion — **format parsing failure** (silent data loss)                                                                                        | Server date parser                         |
| **WEBSERVICE-BUG-3** | Ambiguous dates (e.g., 01/02/2026) parsed as MM/DD             | Not model confusion — **locale assumption** (US convention imposed)                                                                                        | Server date parser                         |
| **WEBSERVICE-BUG-4** | postForms vs forminstance/ serialize same DB value differently | **Inconsistent model labeling**: same value is presented as Model 2 (ISO+Z) via one path and Model 3/4 (US format) via another                             | FormsAPI `FormInstance/Controls` endpoint  |
| **WEBSERVICE-BUG-5** | Compact/epoch formats rejected                                 | Not model confusion — **format support gap**                                                                                                               | Server date parser                         |
| **WEBSERVICE-BUG-6** | No date-only column type; all fields store time component      | **Model 1 erasure**: Calendar Date forced into `datetime` storage, silently gaining a time component that can cause comparison/filter issues               | DB schema design                           |

### Pattern Summary

| Model Confusion                                          | Bugs Caused                                    | Severity                                      |
| -------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| **Model 1 → Model 2** (Calendar Date treated as Instant) | FORM-BUG-7, WEBSERVICE-BUG-6                   | HIGH — wrong date stored for UTC+ users       |
| **Model 3/4 → Model 2** (Pinned/Floating labeled as UTC) | FORM-BUG-5, WEBSERVICE-BUG-1, WEBSERVICE-BUG-4 | HIGH — progressive drift, cross-layer shift   |
| **Model 2 → Model 3/4** (Instant stripped of UTC marker) | FORM-BUG-1, FORM-BUG-4                         | MEDIUM — correct UTC value re-parsed as local |
| **Model 3 ≡ Model 4 conflation** (no anchor TZ stored)   | DB query ambiguity, no dedicated config        | MEDIUM — filtering/comparison undefined       |

---

## 6. Cross-Layer Propagation

Model confusion at the write layer cascades through every downstream component. The diagram below traces a single scenario — storing `"2026-03-15T14:30:00"` in Config D (Pinned/Floating) via postForms, then reading it in Forms and Dashboard:

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

**Key insight**: The dashboard is always correct because it reads the DB directly (server-rendered). Forms is only correct when the serialization path doesn't falsely label the value as UTC. The bug lives in the **serialization layer**, not the storage layer.

---

## 7. Why Config Flags Cannot Fix This

The current flag space (`enableTime` × `ignoreTimezone` × `useLegacy`) has three structural limitations:

### 7.1 No Model 1 storage type

`enableTime=false` is the closest to Model 1 (Calendar Date), but the backend stores it in a SQL `datetime` column with a time component. JavaScript code then processes it via `moment()` / `new Date()`, which are Instant-native (Model 2). **There is no code path that treats a date-only value as a pure calendar date from input to storage to output.**

### 7.2 No anchor timezone for Model 3

`ignoreTimezone=true` says "don't convert between timezones" — but it doesn't store _which_ timezone the value belongs to. A Pinned DateTime without its anchor is indistinguishable from a Floating DateTime. This means:

- SQL queries across timezones produce undefined results
- There is no way to convert a stored value to UTC for comparison
- API consumers cannot know whether to convert or display as-is

### 7.3 Model 3 and Model 4 share a single flag value

`ignoreTimezone=true` handles both "show everyone the same clock" (Pinned) and "show everyone their own clock" (Floating). These require different behavior at the comparison/query layer, but the flag cannot distinguish them.

### 7.4 The `useLegacy` accident

`useLegacy=true` bypasses the buggy GFV transformation (FORM-BUG-5), making Config H accidentally more correct than Config D for Model 3/4. But this is a side effect of skipping code, not a design choice. Legacy configs have their own format inconsistencies (FORM-BUG-2) and store raw `toISOString()` format, which is a different kind of model confusion.

---

## 8. Implications for Fix Strategy

Any fix must address the root cause — **model confusion** — not just the individual symptoms. A patch that fixes FORM-BUG-5 (the fake Z) without addressing the missing anchor timezone will still leave Model 3 and Model 4 conflated.

**Minimum viable fix set:**

| Model       | What must change                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Model 1** | Date-only strings must never enter `Date` / `moment()`. Parse → validate → store as `YYYY-MM-DD` string. Return as string. |
| **Model 2** | Config C is approximately correct. Fix FORM-BUG-6 (empty field), ensure getSaveValue preserves Z for UTC values.           |
| **Model 3** | Fix FORM-BUG-5 (use real `Z`/`ZZ` format token or omit timezone entirely). Store anchor timezone as field metadata.        |
| **Model 4** | If needed: ensure naive datetime is never tagged with Z or any offset. Accept that cross-TZ comparison is undefined.       |

**Design question to resolve**: Does VV need to distinguish Model 3 from Model 4? If all `ignoreTZ=true` use cases are Pinned (which is likely for enterprise document management), then storing the server timezone as the implicit anchor may be sufficient. If Floating use cases exist, they need a separate flag or field property.

---

## References

- [Forms Calendar Analysis](../forms-calendar/analysis/overview.md) — 7 bugs, ~202/242 tests, V1/V2 comparison
- [Web Services Analysis](../web-services/analysis/overview.md) — 6 issues, 148/148 tests, serialization evidence
- [Dashboards Analysis](../dashboards/analysis.md) — 44/44 tests, zero dashboard bugs, 4 platform defects
- [Form Fields Reference](../../../docs/reference/form-fields.md) — Config properties, VV.Form API
