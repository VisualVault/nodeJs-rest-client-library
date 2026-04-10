# Cross-Layer Consistency Matrix

**Purpose:** Track how the same date value behaves across VV platform layers. Bugs document _wrong_ behavior. This matrix documents _different_ behavior between layers for the same data -- inconsistencies that may or may not be bugs depending on which layer is considered correct.

**Layers tracked:**

- **Forms UI** -- Angular/Kendo frontend (FormViewer)
- **API: postForms** -- REST endpoint for creating form records
- **API: forminstance/** -- REST endpoint for creating form records (alternative)
- **API: getForms** -- REST endpoint for reading form records
- **Dashboard** -- Telerik server-rendered analytics view
- **Document Library** -- Index field API and RadDateTimePicker UI
- **GetFieldValue** -- JavaScript API available in form button scripts
- **Database** -- SQL Server `datetime` column (ground truth)

---

## 1. Date-Only Input: `"2026-03-15"` (Calendar Date)

### Configs A, B (non-legacy, date-only)

| Layer                      | Write Path          | Stored Value              | Read/Display Value        |      Model Implied       |
| :------------------------- | :------------------ | :------------------------ | :------------------------ | :----------------------: |
| Forms UI (popup, UTC-3)    | User selects Mar 15 | `2026-03-15T00:00:00.000` | `03/15/2026`              |         Calendar         |
| Forms UI (popup, UTC+5:30) | User selects Mar 15 | `2026-03-14T00:00:00.000` | `03/14/2026`              | **Instant** (FORM-BUG-7) |
| API postForms              | `"2026-03-15"`      | `2026-03-15T00:00:00.000` | `"2026-03-15T00:00:00Z"`  |  **Instant** (Z added)   |
| API forminstance/          | `"2026-03-15"`      | `2026-03-15T00:00:00.000` | `"3/15/2026 12:00:00 AM"` |        Calendar ~        |
| API getForms               | --                  | --                        | `"2026-03-15T00:00:00Z"`  |  **Instant** (Z added)   |
| Dashboard                  | --                  | --                        | `3/15/2026`               |         Calendar         |
| Document Library API       | `"2026-03-15"`      | `2026-03-15T00:00:00`     | `2026-03-15T00:00:00`     |        Calendar ~        |
| GetFieldValue (UTC-3)      | --                  | --                        | `"03/15/2026"`            |         Calendar         |
| GetFieldValue (UTC+5:30)   | --                  | --                        | `"03/14/2026"`            | **Instant** (FORM-BUG-7) |

**Inconsistencies:**

- `XLAYER-1`: API adds Z suffix to a value that has no timezone in the database
- `XLAYER-2`: Forms UI in UTC+ stores the previous day; other layers store the correct day
- `XLAYER-3`: getForms and postForms serialize as ISO+Z; forminstance/ serializes as US format; Dashboard shows short US format -- three different representations of the same DB value

### Configs E, F (legacy, date-only)

Same behavior as A, B for most paths. Legacy code path in Forms UI uses different `getSaveValue()` logic but produces equivalent results for date-only fields. FORM-BUG-7 still applies.

---

## 2. DateTime Input: `"2026-03-15T14:30:00"` (Business DateTime / Pinned)

### Config D (non-legacy, enableTime=true, ignoreTimezone=true)

| Layer                   | Write Path                   | Stored Value              | Read/Display Value         |          Model Implied          |
| :---------------------- | :--------------------------- | :------------------------ | :------------------------- | :-----------------------------: |
| Forms UI (popup, UTC-3) | User selects Mar 15, 2:30 PM | `2026-03-15T14:30:00.000` | `03/15/2026 02:30 PM`      |             Pinned              |
| API postForms           | `"2026-03-15T14:30:00"`      | `2026-03-15T14:30:00.000` | `"2026-03-15T14:30:00Z"`   |      **Instant** (Z added)      |
| API forminstance/       | `"2026-03-15T14:30:00"`      | `2026-03-15T14:30:00.000` | `"3/15/2026 2:30:00 PM"`   |             Pinned              |
| API getForms            | --                           | --                        | `"2026-03-15T14:30:00Z"`   |      **Instant** (Z added)      |
| Dashboard               | --                           | --                        | `3/15/2026 2:30 PM`        |      Pinned (passthrough)       |
| Document Library API    | `"2026-03-15T14:30:00"`      | `2026-03-15T14:30:00`     | `2026-03-15T14:30:00`      |      Pinned (passthrough)       |
| GetFieldValue (UTC-3)   | --                           | --                        | `"03/15/2026 02:30 PM[Z]"` | **Broken** (FORM-BUG-5: fake Z) |

**Inconsistencies:**

- `XLAYER-4`: postForms and getForms add Z suffix, implying UTC. forminstance/ and Dashboard do not. Same DB value, different timezone semantics.
- `XLAYER-5`: GetFieldValue appends literal `[Z]` -- neither valid ISO nor matching any other layer's format

### Config C (non-legacy, enableTime=true, ignoreTimezone=false -- Instant)

| Layer                   | Write Path                   | Stored Value                    | Read/Display Value            |                      Model Implied                       |
| :---------------------- | :--------------------------- | :------------------------------ | :---------------------------- | :------------------------------------------------------: |
| Forms UI (popup, UTC-3) | User selects Mar 15, 2:30 PM | `2026-03-15T17:30:00.000` (UTC) | `03/15/2026 02:30 PM` (local) |                         Instant                          |
| API postForms           | `"2026-03-15T14:30:00"`      | `2026-03-15T14:30:00.000`       | `"2026-03-15T14:30:00Z"`      | **Ambiguous**: server stored as-is but serializes with Z |
| API forminstance/       | `"2026-03-15T14:30:00"`      | `2026-03-15T14:30:00.000`       | `"3/15/2026 2:30:00 PM"`      |                      Pinned (no Z)                       |
| API getForms            | --                           | --                              | `"2026-03-15T14:30:00Z"`      |                         Instant                          |
| Dashboard               | --                           | --                              | `3/15/2026 2:30 PM`           |           Pinned (passthrough, no conversion)            |

**Inconsistencies:**

- `XLAYER-6`: Forms UI converts to UTC on save (correct for Instant). API stores as-is (incorrect for Instant -- no UTC conversion). Same config, different write behavior.
- `XLAYER-7`: Dashboard displays raw stored value without timezone conversion, but Config C intends Instant behavior (should convert to viewer's TZ). Dashboard and Forms disagree on whether to convert.

### Config H (legacy, enableTime=true, ignoreTimezone=true)

Same as Config D except: GetFieldValue does NOT append `[Z]` (legacy code path). This means Config D and H differ on GetFieldValue output despite both having `ignoreTimezone=true`.

- `XLAYER-8`: Config D `GetFieldValue` → `"03/15/2026 02:30 PM[Z]"`. Config H `GetFieldValue` → `"03/15/2026 02:30 PM"`. Same flags except `useLegacy`, different output.

---

## 3. DateTime Input with Offset: `"2026-03-15T14:30:00-03:00"` (BRT)

### API Write Paths Only (Forms UI doesn't accept offset input directly)

| Layer                | Input                         | Stored Value              | Read Value               |             Offset Preserved?              |
| :------------------- | :---------------------------- | :------------------------ | :----------------------- | :----------------------------------------: |
| API postForms        | `"2026-03-15T14:30:00-03:00"` | `2026-03-15T14:30:00.000` | `"2026-03-15T14:30:00Z"` |     **No** -- offset stripped, Z added     |
| API forminstance/    | `"2026-03-15T14:30:00-03:00"` | `2026-03-15T14:30:00.000` | `"3/15/2026 2:30:00 PM"` |         **No** -- offset stripped          |
| Document Library API | `"2026-03-15T14:30:00-03:00"` | `2026-03-15T17:30:00`     | `2026-03-15T17:30:00`    | **No** -- **converted to UTC**, Z stripped |

**Inconsistencies:**

- `XLAYER-9`: Forms API strips the offset but keeps the local time (`14:30`). Document Library API converts to UTC (`17:30`). Same input, different stored values, different layers.
- `XLAYER-10`: All three layers discard the timezone offset, but in different ways. postForms/forminstance/ keep the local time component; Document Library converts to UTC. A developer switching between APIs would get different results.

---

## 4. Empty/Null Input

| Layer                           | Input          | Behavior                                      |     Consistent?     |
| :------------------------------ | :------------- | :-------------------------------------------- | :-----------------: |
| Forms UI (popup)                | Clear field    | Stores empty/null                             |         Yes         |
| API postForms                   | `""` or `null` | Stores null                                   |         Yes         |
| API postForms                   | omit field     | No change                                     |         Yes         |
| GetFieldValue (Config D, empty) | --             | Returns `"Invalid Date"`                      | **No** (FORM-BUG-6) |
| GetFieldValue (Config A, empty) | --             | Returns `""`                                  |         Yes         |
| Document Library API            | `""`           | **Silent failure** -- previous value retained | **No** (DOC-BUG-2)  |

**Inconsistencies:**

- `XLAYER-11`: Empty field handling differs between Forms (works), GetFieldValue Config D (returns "Invalid Date"), and Document Library (can't clear)

---

## 5. Format Tolerance Across Layers

| Input Format                               |      Forms UI      |          API postForms           |        Document Library API         |
| :----------------------------------------- | :----------------: | :------------------------------: | :---------------------------------: |
| `"2026-03-15"` (ISO date)                  |      Accepts       |             Accepts              |               Accepts               |
| `"03/15/2026"` (US)                        |      Accepts       |             Accepts              |               Accepts               |
| `"15/03/2026"` (EU)                        |    N/A (popup)     | **Silently discards** (WS-BUG-2) |        **Accepts correctly**        |
| `"20260315"` (compact ISO)                 |        N/A         | **Silently discards** (WS-BUG-5) |             Not tested              |
| `"2026-03-15T14:30:00Z"` (ISO+Z)           | Accepts (strips Z) |             Accepts              | Accepts (converts to UTC, strips Z) |
| `"2026-03-15T14:30:00-03:00"` (ISO+offset) |        N/A         |     Accepts (strips offset)      |      Accepts (converts to UTC)      |
| Epoch milliseconds                         |        N/A         | **Silently discards** (WS-BUG-5) |             Not tested              |

**Inconsistencies:**

- `XLAYER-12`: EU date format (`DD/MM/YYYY`) accepted by Document Library, silently discarded or swapped by Forms API. Same platform, different parsing behavior.
- `XLAYER-13`: Offset handling differs: Forms API strips offset and keeps local time; Document Library converts to UTC. Same ISO input, different stored values.

---

## 6. Display Format Across Layers

| Layer               | Date-Only Format       | DateTime Format        | Leading Zeros | Technology         |
| :------------------ | :--------------------- | :--------------------- | :-----------: | :----------------- |
| Forms UI            | `MM/dd/yyyy`           | `MM/dd/yyyy hh:mm a`   |      Yes      | Angular/Kendo      |
| Dashboard           | `M/d/yyyy`             | `M/d/yyyy h:mm tt`     |      No       | .NET/Telerik       |
| Document Library UI | `M/d/yyyy`             | `M/d/yyyy h:mm tt`     |      No       | .NET/Telerik       |
| API getForms        | `yyyy-MM-ddTHH:mm:ssZ` | `yyyy-MM-ddTHH:mm:ssZ` |      Yes      | .NET serialization |
| API forminstance/   | `M/d/yyyy h:mm:ss tt`  | `M/d/yyyy h:mm:ss tt`  |      No       | .NET serialization |

**Inconsistencies:**

- `XLAYER-14`: Five different display formats for the same stored value across 5 layers (FORMDASHBOARD-BUG-1 documents the Forms vs Dashboard subset)

---

---

## 7. Licensing System Comparison (Greenfield — Same Bug, Different Stack)

The new Licensing system (Express + Sequelize + MySQL) provides a case study in what happens when the database schema distinguishes date types but the application layer has no enforced conventions.

### Database Layer: Correct

| Column                              | Sequelize Type | MySQL Type | Stored Value                      |
| :---------------------------------- | :------------- | :--------- | :-------------------------------- |
| `regulation.effective_date`         | `DATEONLY`     | `DATE`     | `2026-03-15` (no time)            |
| `regulation.expiration_date`        | `DATEONLY`     | `DATE`     | `2026-03-15` (no time)            |
| `applicationDesign.effective_date`  | `DATEONLY`     | `DATE`     | `2026-03-15` (no time)            |
| `applicationDesign.expiration_date` | `DATEONLY`     | `DATE`     | `2026-03-15` (no time)            |
| `user.createdAt`                    | `DATE`         | `DATETIME` | `2026-03-15 14:30:00` (with time) |

**The schema correctly separates date-only from datetime.** But this alone doesn't prevent bugs.

### Application Layer: Inconsistent (Same DATEONLY Columns, Different Handling)

**regulation.js (correct):**

| Step              | Code                                                | Value          | Safe? |
| :---------------- | :-------------------------------------------------- | :------------- | :---: |
| Server → Client   | Sequelize returns `"2026-03-15"`                    | String         |  --   |
| Parse for picker  | `"2026-03-15".split('-')` → `new Date(2026, 2, 15)` | Local midnight |  Yes  |
| Picker → Server   | `formatDateForServer(date)` → `"2026-03-15"`        | String         |  Yes  |
| Server validation | Regex `^\d{4}-\d{2}-\d{2}$`                         | Validated      |  Yes  |

**application.js (buggy — same columns, different developer):**

| Step            | Code                                                | Value              |     Safe?      |
| :-------------- | :-------------------------------------------------- | :----------------- | :------------: |
| Server → Client | Sequelize returns `"2026-03-15"`                    | String             |       --       |
| Parse for state | `new Date("2026-03-15")`                            | **UTC midnight**   |     **No**     |
| Change tracking | `.toISOString()` → `"2026-03-15T00:00:00.000Z"`     | UTC string         |     **No**     |
| State → Server  | `JSON.stringify({ effectiveDate: dateObj })`        | **UTC ISO string** |     **No**     |
| Result in UTC-5 | Server receives `"2026-03-14T..."`, stores March 14 | **Wrong day**      | **FORM-BUG-7** |

### Three-Way Comparison: Same Input, Three Codebases

Input: User selects **March 15, 2026** in a date-only field. User is in US Pacific (UTC-7).

| Step                   | VV Platform (Config B)                    | Licensing: regulation.js | Licensing: application.js         |
| :--------------------- | :---------------------------------------- | :----------------------- | :-------------------------------- |
| Storage type           | SQL `datetime`                            | MySQL `DATE` (DATEONLY)  | MySQL `DATE` (DATEONLY)           |
| Serialization          | `moment()`/`toISOString()`                | `formatDateForServer()`  | `JSON.stringify(dateObj)`         |
| Transmitted            | `"2026-03-15T00:00:00"` or `"03/15/2026"` | `"2026-03-15"`           | `"2026-03-15T00:00:00.000Z"`      |
| Stored                 | `2026-03-15T00:00:00.000`                 | `2026-03-15`             | `2026-03-15` (server strips time) |
| Read back              | `"2026-03-15T00:00:00Z"` (Z added)        | `"2026-03-15"` (no Z)    | `"2026-03-15"` (no Z)             |
| Reload parse           | `new Date("...Z")` → UTC                  | `split('-')` → local     | `new Date("2026-03-15")` → UTC    |
| **Displayed in UTC-7** | March 14 (FORM-BUG-7)                     | **March 15 (correct)**   | March 14 (FORM-BUG-7)             |

### Key Findings

- `XLAYER-15`: Within the Licensing system itself, regulation.js and application.js handle identical DATEONLY columns differently — one is timezone-safe, the other has FORM-BUG-7
- `XLAYER-16`: `formatDateForServer()` exists only in regulation.js. No shared utility. No convention documentation. The safe pattern was never propagated.
- `XLAYER-17`: 59 files in the Licensing codebase use `new Date(someString)`. Each is a potential FORM-BUG-7 if the string originates from a DATEONLY column.

**Conclusion: The correct schema types (DATEONLY vs DATE) are necessary but not sufficient. Without enforced application-layer conventions, the same developer trap produces the same bug across tech stacks.**

---

## Summary: Inconsistency Index

| ID        | Layers                                        | Description                                               | Severity |                     Data Loss?                     |
| :-------- | :-------------------------------------------- | :-------------------------------------------------------- | :------: | :------------------------------------------------: |
| XLAYER-1  | API vs DB                                     | Z suffix added to timezone-naive stored value             |   HIGH   | No (display only, but triggers FORM-BUG-1 on load) |
| XLAYER-2  | Forms UI vs API/Dashboard                     | UTC+ browsers store previous day for date-only            |   HIGH   |                **Yes** (FORM-BUG-7)                |
| XLAYER-3  | getForms vs forminstance/ vs Dashboard        | Three serialization formats for one DB value              |  MEDIUM  |                         No                         |
| XLAYER-4  | postForms/getForms vs forminstance//Dashboard | Z suffix present/absent depending on endpoint             |   HIGH   |           Triggers WS-BUG-1 on form load           |
| XLAYER-5  | GetFieldValue vs all other layers             | Fake `[Z]` suffix on Config D only                        |   HIGH   |             Triggers FORM-BUG-5 drift              |
| XLAYER-6  | Forms UI write vs API write                   | Forms converts to UTC; API stores as-is (Config C)        |  MEDIUM  |           Mixed UTC/local in same column           |
| XLAYER-7  | Dashboard vs Forms (Config C)                 | Dashboard shows raw; Forms converts to local              |  MEDIUM  |                 No (display only)                  |
| XLAYER-8  | Config D vs Config H GetFieldValue            | Legacy/non-legacy produce different output for same flags |   LOW    |                  No (format only)                  |
| XLAYER-9  | Forms API vs Document Library API             | Offset stripped (keep local) vs offset converted (UTC)    |   HIGH   |       Different stored values for same input       |
| XLAYER-10 | postForms vs forminstance/ vs Doc Library     | Three different offset-handling behaviors                 |   HIGH   |              Different stored values               |
| XLAYER-11 | Forms vs GetFieldValue vs Doc Library         | Empty field: works / "Invalid Date" / can't clear         |  MEDIUM  |               DOC-BUG-2: can't clear               |
| XLAYER-12 | Forms API vs Document Library API             | EU dates: silently discarded vs correctly parsed          |   HIGH   |                 **Yes** (WS-BUG-2)                 |
| XLAYER-13 | Forms API vs Document Library API             | Offset: strip and keep local vs convert to UTC            |   HIGH   |              Different stored values               |
| XLAYER-14 | All display layers                            | Five different format patterns for same value             |   LOW    |                   No (cosmetic)                    |
