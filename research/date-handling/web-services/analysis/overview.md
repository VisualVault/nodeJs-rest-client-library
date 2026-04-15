# Web Services Date Handling — Analysis & Conclusions

## 1. Executive Summary

148 tests across 10 categories (WS-1 through WS-10) exhaustively characterize how the VisualVault REST API handles dates when creating, reading, updating, and querying form records via web services. Testing covered 8 field configurations, 3 server timezones (BRT/IST/UTC), 20+ input formats, and cross-layer verification against the Forms UI.

**Key findings**: The API write/read/round-trip path is reliable and timezone-independent when using string inputs. However, **6 distinct issues** were identified — 2 cause silent data loss, 2 cause datetime corruption when records cross from API to Forms, 1 is an ambiguous-format trap, and 1 is a systemic design flaw. The most critical production issue (Freshdesk #124697) was root-caused to a serialization format mismatch in the FormsAPI's `FormInstance/Controls` response between records created via `postForms` vs `forminstance/` (CB-29).

**Results**: 116 PASS / 32 FAIL across 148 formal test slots. All 32 failures map to one of the 6 catalogued issues below. (WS-10A additionally includes 7 forminstance/ comparison rows — all PASS — documented in the matrix but not counted as separate test slots.)

**Cross-environment validation (2026-04-10)**: All 10 categories re-executed against WADNR (vv5dev / fpOnline) using `zzzDate Test Harness`. API-only categories (WS-1/2/3/5/6/7/8/9) and browser verification (WS-4) produce identical results. All 6 bugs confirmed as platform-level defects, not environment-specific. FORM-BUG-7 also confirmed via IST browser record on WADNR. See `runs/wadnr-full-run-2026-04-10.md`.

---

## 2. Scope

Web services interact with form date fields through the VV REST API:

| Operation         | Endpoint                                  | Node.js Method                                                      |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Create            | `POST /formtemplates/{id}/forms`          | `vvClient.forms.postForms(params, data, templateId)`                |
| Update            | `POST /formtemplates/{id}/forms/{formId}` | `vvClient.forms.postFormRevision(params, data, templateId, formId)` |
| Query             | `GET /formtemplates/{id}/forms`           | `vvClient.forms.getForms(params, templateId)`                       |
| Get single        | `GET /formtemplates/{id}/forms/{formId}`  | `vvClient.forms.getFormInstanceById(templateId, instanceId)`        |
| Create (FormsAPI) | `POST /forminstance/`                     | Direct HTTP (no SDK method)                                         |

---

## 3. Infrastructure Baseline

### Node.js Library is a Transparent Passthrough

Confirmed 2026-04-02 via upstream `VisualVault/nodeJs-rest-client-library` analysis (stock code, zero local modifications to `lib/`):

- **No date transformation** at any layer between script code and the VV server
- `postForms()` / `postFormRevision()` pass field data directly to `JSON.stringify()`
- String values pass as-is; `Date` objects serialize to ISO 8601 with Z suffix via `.toJSON()`
- Response parsing returns date values as strings — never converted to Date objects
- `formFieldCollection` is a pure lookup wrapper with no value transformation
- `dateHelper` utility in `common.js` exists but is never invoked in request/response flow
- VV API returns field names **lowercased** (`datafield7` not `Field7`)

**Implication**: All date behavior differences between API and Forms originate from either the **VV server** or the **Forms client-side JS** — not the Node.js intermediary.

Full documentation: [`docs/guides/scripting.md`](../../../../docs/guides/scripting.md)

### Database Schema: SQL Server `datetime` Columns

Confirmed 2026-04-06 via SSMS schema inspection and DB dump (`dbo.DateTest` table):

- **All date fields** (Field1 through Field28) are SQL Server **`datetime`** columns — a binary numeric type, not a string
- The DB stores no Z suffix, no ISO format, no US format — just a naive datetime value (year/month/day/hour/minute/second)
- The Z suffix visible in `getForms` API responses is added by the **API serialization layer**, not stored in the DB
- The US format visible in `FormInstance/Controls` responses is also a serialization artifact
- Both `postForms` and `forminstance/` write **identical `datetime` values** to the same column (confirmed: DateTest-001679 vs DateTest-001680)

**Implication**: The "storage format mismatch" (WS-4/CB-29) is not in the database — it's in the `FormInstance/Controls` serialization layer. Both endpoints write the same binary datetime; the behavioral difference comes from how the Controls endpoint serializes it for the Forms V1 client (ISO+Z for postForms-created records, US format for forminstance/-created records).

**DB evidence** (from `DataTest.xlsx` dump):

| Record          | Endpoint               |       Field5 (D) DB       |       Field6 (C) DB       |
| --------------- | ---------------------- | :-----------------------: | :-----------------------: |
| DateTest-001679 | postForms              | `2026-03-15 14:30:00.000` | `2026-03-15 14:30:00.000` |
| DateTest-001680 | forminstance/          | `2026-03-15 14:30:00.000` | `2026-03-15 14:30:00.000` |
| DateTest-001737 | postForms → Forms save | `2026-03-15 11:30:00.000` | `2026-03-15 11:30:00.000` |

---

## 4. Issues Registry

Six distinct findings identified — 3 bugs (software defects), 2 design flaws (architectural gaps), 1 undocumented behavior. Ordered by production impact.

### WEBSERVICE-BUG-1 — Cross-Layer Datetime Shift (postForms Z Suffix)

| Field         | Value                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| **Severity**  | **HIGH** — affects every production script that writes datetime values via `postForms` |
| **Status**    | Confirmed, no server-side fix available                                                |
| **Freshdesk** | #124697 / WADNR-10407                                                                  |
| **Evidence**  | CB-8, CB-11, CB-31, CB-32 (WS-4, WS-10)                                                |

**Description**: When a datetime value is written via `postForms()` (e.g., `"2026-03-15T14:30:00"`), the database stores the correct value (`2026-03-15 14:30:00.000`). However, the `FormInstance/Controls` endpoint serializes it as `"2026-03-15T14:30:00Z"` (with Z) for postForms-created records, while serializing the identical DB value as US format (no Z) for forminstance/-created records. Forms V1 takes the Z literally, interprets the value as UTC, and converts to local time. The rawValue is permanently shifted by the user's TZ offset.

**Root Cause**: `FormInstance/Controls` adds a Z suffix to datetime values from postForms-created records based on hidden creation-path metadata. The Z is incorrect — the DB column is SQL Server `datetime` (timezone-unaware). Forms V1 interprets the Z as real UTC and shifts the value. Field configuration (`ignoreTZ`, `enableTime`) has no effect — the bug is in the serialization layer.

**Impact**:

- BRT user (UTC-3): `14:30` becomes `11:30` (-3h shift)
- IST user (UTC+5:30): `14:30` becomes `20:00` (+5:30h shift)
- UTC user: no visible shift (coincidental)
- **Midnight crossing**: `T02:00:00Z` in BRT → rawValue = `T23:00:00` **previous day** — the stored date changes
- After the user saves the form, the shifted value is committed to the DB. Subsequent open/save cycles are stable (no further drift)
- Config D/H (`ignoreTZ=true`): display appears correct on first open, but rawValue is already shifted. After save+reopen, display changes to shifted time. **This is exactly Freshdesk #124697.**

**Workaround**: Use the `forminstance/` endpoint instead of `postForms` for all DateTime fields. Empirically verified: `getSaveValue()` stores identical values for `ignoreTZ=true` and `ignoreTZ=false` — the flag affects display only, not DB storage. `forminstance/` avoids the V1 Z-interpretation shift for all DateTime configs. See [`ws-bug-1-cross-layer-shift.md`](ws-bug-1-cross-layer-shift.md) for details and limitations.

**Who is affected**: Every VV customer using `postForms` to write datetime fields, where any user outside UTC+0 opens the record in Forms.

**Cross-environment**: Confirmed on WADNR (vv5dev) 2026-04-10 — BRT: -3h shift, IST: +5:30h shift, identical to EmanuelJofre (vvdemo).

---

### WEBSERVICE-BUG-2 — Silent Data Loss for DD/MM/YYYY Formats

| Field        | Value                                                              |
| ------------ | ------------------------------------------------------------------ |
| **Severity** | **HIGH** — complete silent data loss for LATAM/European developers |
| **Status**   | Confirmed, server-side defect                                      |
| **Evidence** | CB-15 (WS-5)                                                       |

**Description**: The VV server's date parser does not recognize day-first date formats. All DD/MM/YYYY variants are accepted by the API (HTTP 200, record created successfully) but the date field is stored as `null`. No error, no warning, no validation message in the response.

**Affected formats**:

- `"15/03/2026"` (DD/MM/YYYY) → `null`
- `"15-03-2026"` (DD-MM-YYYY) → `null`
- `"15.03.2026"` (DD.MM.YYYY) → `null`

**Root Cause**: The server's date parser uses US-centric format detection. When the day value exceeds 12, it cannot be interpreted as a month, and the parser fails silently instead of returning an error.

**Impact**: Any script using locale-formatted dates (e.g., `new Date().toLocaleDateString('es-AR')`, `new Date().toLocaleDateString('pt-BR')`, or hardcoded DD/MM strings) will silently lose all date data. The record is created, other fields are saved, but the date field is empty — discovered only when someone opens the record.

**Workaround**: Always send dates in ISO 8601 (`"YYYY-MM-DD"`) or US format (`"MM/DD/YYYY"`). Never use locale-specific formatting for API input.

**Who is affected**: Developers in Latin America, Europe, and other regions that use DD/MM/YYYY as the standard date format.

**Cross-environment**: Confirmed on WADNR (vv5dev) 2026-04-10 — `"15/03/2026"` → null, identical to EmanuelJofre.

---

### WS-3 — US-Biased Date Parsing for Ambiguous Inputs (Undocumented Behavior)

| Field        | Value                                                 |
| ------------ | ----------------------------------------------------- |
| **Severity** | **MEDIUM** — wrong data stored silently when day ≤ 12 |
| **Status**   | Confirmed, server-side behavior                       |
| **Evidence** | CB-16 (WS-5)                                          |

**Description**: When a date string has an ambiguous format where both components are ≤ 12 (e.g., `"05/03/2026"`), the server always interprets it as MM/DD/YYYY (US convention). A developer intending March 5 (`05/03` in DD/MM) gets May 3 (`05/03` in MM/DD) stored silently.

**Root Cause**: Same US-centric parser as WEBSERVICE-BUG-2. When the day value is ≤ 12, it's valid as a month, so the parser succeeds — but with the wrong interpretation.

**Impact**: More insidious than WEBSERVICE-BUG-2 because the date _is_ stored (no null). The error is only detectable by manual inspection. Affects any script that constructs dates in DD/MM order where day ≤ 12.

**Workaround**: Same as WEBSERVICE-BUG-2 — always use ISO 8601 (`"YYYY-MM-DD"`) format. This is unambiguous regardless of locale.

**Who is affected**: Same population as WEBSERVICE-BUG-2, but only when the day value is 1–12.

---

### WS-4 — postForms vs forminstance/ Serialization Inconsistency (Design Flaw)

| Field        | Value                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Severity** | **HIGH** — root cause of Freshdesk #124697; FormsAPI serializes the same `datetime` value in incompatible string formats |
| **Status**   | Confirmed, architectural inconsistency                                                                                   |
| **Evidence** | CB-29, CB-30, CB-31 (WS-10); DB dump (2026-04-06) confirmed identical SQL `datetime` values for both endpoints           |

**Description**: The `postForms` endpoint (core API) and the `forminstance/` endpoint (FormsAPI) both store the **same SQL `datetime` value** in the database (confirmed via DB dump: both produce `2026-03-15 14:30:00.000`). However, the FormsAPI's `FormInstance/Controls` endpoint **serializes its HTTP response differently** depending on which write endpoint created the record:

| Endpoint        | Input                   | DB Value (identical)      | `FormInstance/Controls` Response    | Forms V1 Interpretation                |
| --------------- | ----------------------- | ------------------------- | ----------------------------------- | -------------------------------------- |
| `postForms`     | `"2026-03-15T14:30:00"` | `2026-03-15 14:30:00.000` | `"2026-03-15T14:30:00Z"` (ISO+Z)    | UTC → converts to local (shifted)      |
| `forminstance/` | `"2026-03-15T14:30:00"` | `2026-03-15 14:30:00.000` | `"03/15/2026 14:30:00"` (US, no TZ) | Local time → no conversion (preserved) |

The core API read (`getForms`) normalizes both to `"2026-03-15T14:30:00Z"` — masking the serialization difference. The divergence is only visible through `FormInstance/Controls` or by observing the Forms UI behavior.

**Root Cause**: The FormsAPI has two independent serialization paths that produce different string formats for the same `datetime` value. Forms V1 `initCalendarValueV1` parses the string — ISO+Z triggers UTC→local conversion, US format does not.

**Impact**: This is the root cause of WEBSERVICE-BUG-1. Scripts that switch from `postForms` to `forminstance/` see the datetime shift disappear — not because the DB value changes, but because the FormsAPI serialization format changes, which Forms V1 parses differently.

**Workaround**: Use `forminstance/` for datetime fields. Note: `forminstance/` requires a different payload format (`{ formTemplateId, formName, fields: [{ key, value }] }`) and targets a different server (`preformsapi.*`). There is no SDK method — direct HTTP required.

**Who is affected**: Any developer choosing between the two endpoints for form creation.

---

### WEBSERVICE-BUG-5 — Compact/Epoch Formats Silently Stored as Null

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| **Severity** | **LOW** — edge case formats unlikely in production |
| **Status**   | Confirmed                                          |
| **Evidence** | CB-17 (WS-5)                                       |

**Description**: Several technically-valid date representations are silently accepted but stored as `null`:

| Format                | Example           | Result |
| --------------------- | ----------------- | ------ |
| Compact ISO           | `"20260315"`      | `null` |
| YYYY-DD-MM (inverted) | `"2026-15-03"`    | `null` |
| Epoch ms (number)     | `1773532800000`   | `null` |
| Epoch ms (string)     | `"1773532800000"` | `null` |

**Root Cause**: The server's date parser has a limited format vocabulary. Formats outside its recognition set fail silently.

**Impact**: Low for typical production scripts. Could affect scripts that serialize dates as epoch timestamps or use non-standard compact formats.

**Workaround**: Use ISO 8601 with separators, US format, or English month-name formats — all confirmed accepted (CB-14).

---

### WS-6 — No Server-Side Date-Only Type Enforcement (Design Flaw)

| Field        | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| **Severity** | **MEDIUM** — design flaw causing query/report inconsistencies |
| **Status**   | Confirmed, systemic                                           |
| **Evidence** | CB-6, CB-7 (WS-1, WS-2) + Forms evidence                      |

**Description**: The VV server has no date-only storage type. Every date field is stored as a datetime in the database, regardless of the `enableTime` field configuration flag. The "date-only" semantic exists only in the Forms client-side JS — the API and database have no concept of it.

This means the same "date-only" field can contain different time components depending on the write path:

| Write Source                       | Stored Value             | Time Component                             |
| ---------------------------------- | ------------------------ | ------------------------------------------ |
| Forms popup (BRT)                  | `"2026-03-15T00:00:00Z"` | UTC midnight                               |
| Forms popup (IST)                  | `"2026-03-14T00:00:00Z"` | UTC midnight of **wrong day** (FORM-BUG-7) |
| Forms preset (BRT)                 | `"2026-03-01T03:00:00Z"` | BRT midnight = 3am UTC                     |
| Forms Current Date (BRT, 8pm)      | `"2026-03-31T23:01:57Z"` | Actual timestamp                           |
| API string `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | UTC midnight                               |
| API string `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | Arbitrary time (no enforcement)            |

**Root Cause**: `enableTime`, `ignoreTimezone`, and `useLegacy` are client-side presentation flags. The server treats every date field identically as a datetime column. The API does not enforce field configuration rules (CB-6).

**Impact**:

1. **SQL/OData queries**: `WHERE Field7 = '2026-03-15'` may not match records with non-midnight time components
2. **Dashboard/Report grouping**: Records for the "same" date may group differently depending on write path
3. **API ambiguity**: A script reading a "date-only" field via API gets `"2026-03-15T14:30:00Z"` — it cannot tell if the time is meaningful or noise
4. **Cross-path inconsistency**: A record saved via Forms and one via API for the same date will have different time components

**Workaround**: For date-only fields, always send `"YYYY-MM-DD"` or `"YYYY-MM-DDT00:00:00"` via API. Use range queries (`ge` + `lt`) instead of exact equality for date-only comparisons. Accept that Forms-written records may have non-UTC-midnight time components.

---

## 5. Confirmed Behaviors

32 confirmed behaviors organized by theme. Each references the original run file for full evidence.

### 5.1 API Write Path (WS-1)

| #    | Behavior                                                                                                                                                                       | Evidence                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| CB-1 | API bypasses Forms FORM-BUG-7 — date-only strings stored correctly in all TZs. `"2026-03-15"` → DB stores `2026-03-15 00:00:00.000` (getForms returns with Z) in BRT, IST, UTC | [ws-1-ws-2-batch-run-1](runs/ws-1-ws-2-batch-run-1.md) |
| CB-4 | Server TZ (`TZ=` env var) has no effect on API write — strings stored as-is. BRT, IST, UTC all produce identical stored values                                                 | Same run                                               |
| CB-6 | Field config flags (`enableTime`, `ignoreTimezone`, `useLegacy`) have NO effect on API write/read behavior — all 8 configs store and return identically per input type         | Same run                                               |
| CB-7 | API normalizes ALL dates to ISO 8601 datetime+Z on read — `"2026-03-15"` returns as `"2026-03-15T00:00:00Z"`                                                                   | Same run                                               |

### 5.2 API Read Path (WS-2)

| #    | Behavior                                                                                                                                    | Evidence                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| CB-2 | API returns stored values without Forms FORM-BUG-5 (fake Z). The Z in `getForms` output is API serialization, not a client-side artifact    | [ws-1-ws-2-batch-run-1](runs/ws-1-ws-2-batch-run-1.md) |
| CB-3 | Unset date fields return `null` from API (not `""` or `"Invalid Date"`)                                                                     | Same run                                               |
| CB-5 | Forms FORM-BUG-7 damage persists in DB — IST Config A has `2026-03-14 00:00:00.000` in DB (wrong day, confirmed in DB dump DateTest-000084) | Same run                                               |

### 5.3 API Round-Trip (WS-3)

| #    | Behavior                                                                                                                                                              | Evidence                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| CB-9 | API round-trip is completely drift-free. 2 write-read cycles, 4 configs (A, C, D, H), all zero drift. Contrast: Forms GFV round-trip drifts for Config D (FORM-BUG-5) | [ws-3-batch-run-1](runs/ws-3-batch-run-1.md) |

### 5.4 Cross-Layer: API → Forms (WS-4, WS-10)

| #     | Behavior                                                                                                                                                                                                                                                              | Evidence                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| CB-8  | Cross-layer datetime shift: DB stores correct value (`14:30:00.000`), but `FormInstance/Controls` serializes as `"T14:30:00Z"` for postForms records → Forms V1 interprets Z as UTC → displays 11:30 AM (BRT) / 8:00 PM (IST). See WEBSERVICE-BUG-1                   | [ws-4-batch-run-1](runs/ws-4-batch-run-1.md)                                    |
| CB-10 | FORM-BUG-7 does NOT manifest on Forms load/display path for **date-only** fields loaded from API. Config A IST displays `03/15/2026` (correct) — Kendo shows local date from Date object                                                                              | Same run                                                                        |
| CB-11 | `ignoreTZ=true` preserves display but not rawValue when loading API-stored datetimes. Config D/H display 2:30 PM but rawValue shifted to 11:30/20:00                                                                                                                  | Same run                                                                        |
| CB-29 | `FormInstance/Controls` returns dates in **different string formats** depending on which endpoint created the record: postForms → ISO+Z, forminstance/ → US format. DB values are identical (`datetime` type, confirmed via DB dump 2026-04-06). See WEBSERVICE-BUG-4 | [ws-10-batch-run-1](runs/ws-10-batch-run-1.md) + browser verification + DB dump |
| CB-30 | Core API read (`getForms`) normalizes both serialization formats to ISO+Z, masking the difference. `storedMatch=true` for both records                                                                                                                                | Same run                                                                        |
| CB-31 | `forminstance/` records are immune to CB-8. Forms V1 parses US format as local time (no UTC conversion). rawValue=`T14:30:00` in both BRT and IST                                                                                                                     | Same run                                                                        |
| CB-32 | `postForms` Config D first-open display mutation exactly matches Freshdesk #124697 report: display `02:30 PM` → `11:30 AM` after save+reopen, stable after first mutation                                                                                             | Same run                                                                        |

### 5.5 Input Format Handling (WS-5)

| #     | Behavior                                                                                                               | Evidence                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| CB-12 | Server converts TZ offsets to UTC on write. `"T14:30:00-03:00"` → `"T17:30:00Z"`, `"T14:30:00+05:30"` → `"T09:00:00Z"` | [ws-5-batch-run-1](runs/ws-5-batch-run-1.md) |
| CB-13 | Server strips milliseconds from datetime values. `"T14:30:00.000Z"` → `"T14:30:00Z"`                                   | Same run                                     |
| CB-14 | Server accepts: ISO 8601, US (MM/DD/YYYY), DB format, YYYY/DD, YYYY.DD, English month names, abbreviated month formats | Same run                                     |
| CB-15 | DD/MM/YYYY formats silently stored as `null`. See WEBSERVICE-BUG-2                                                     | Same run                                     |
| CB-16 | Ambiguous dates interpreted as MM/DD (US), not DD/MM. `"05/03/2026"` → May 3. See WEBSERVICE-BUG-3                     | Same run                                     |
| CB-17 | Compact ISO (`"20260315"`), epoch timestamps (numeric and string) silently stored as `null`. See WEBSERVICE-BUG-5      | Same run                                     |

### 5.6 Empty/Null Handling (WS-6)

| #     | Behavior                                                                                                                             | Evidence                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| CB-18 | All empty/null/special values store `null`. `""`, `null`, omit, `"null"`, `"Invalid Date"` → all `null`. No Forms FORM-BUG-6 via API | [ws-6-batch-run-1](runs/ws-6-batch-run-1.md) |
| CB-19 | Empty string via `postFormRevision` clears existing date values. before=`"T00:00:00Z"`, after=`null`                                 | Same run                                     |
| CB-20 | `"Invalid Date"` string (Forms FORM-BUG-6 output) is safely rejected by API, stores `null`. Safe round-trip from buggy Forms GFV     | Same run                                     |

### 5.7 Update Path (WS-7)

| #     | Behavior                                                                                                                                                                                                        | Evidence                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| CB-21 | `postFormRevision()` correctly handles all three scenarios: **Change** replaces old value, **Preserve** keeps existing when field omitted, **Add** sets date on previously empty field. All 4 configs identical | [ws-7-batch-run-1](runs/ws-7-batch-run-1.md) |

### 5.8 Query Filtering (WS-8)

| #     | Behavior                                                                                                                                            | Evidence                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| CB-22 | OData query filters normalize date formats — US, ISO, Z suffix all match correctly. 10/10 queries return expected results                           | [ws-8-batch-run-1](runs/ws-8-batch-run-1.md) |
| CB-23 | Date-only range queries work on DateTime fields. `ge '2026-03-15' AND le '2026-03-16'` matches `"T14:30:00Z"` record (date interpreted as midnight) | Same run                                     |

### 5.9 Date Computation in Scripts (WS-9)

| #     | Behavior                                                                                                                                                     | Evidence                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| CB-24 | Date objects serialized with Z are stored correctly (ms stripped). `"T00:00:00.000Z"` → `"T00:00:00Z"` consistently                                          | [ws-9-batch-run-1](runs/ws-9-batch-run-1.md) |
| CB-25 | US-format `new Date("03/15/2026")` produces different stored values per server TZ. BRT=`T03:00Z`, IST=`Mar14 T18:30Z`, UTC=`T00:00Z`                         | Same run                                     |
| CB-26 | `new Date(year, month, day)` is equally TZ-unsafe as US format parse — identical serialization                                                               | Same run                                     |
| CB-27 | `toLocaleDateString()` returns wrong date in UTC- timezones for UTC-midnight dates. BRT → `"3/14/2026"` for a March 15 UTC date                              | Same run                                     |
| CB-28 | TZ-safe patterns confirmed: ISO parse, `Date.UTC()`, `setUTCDate`/`getUTCDate`, `toISOString().split('T')[0]` — all produce identical results in BRT/IST/UTC | Same run                                     |

---

## 6. Hypothesis Resolution

All 12 hypotheses from the testing plan, with final disposition.

| #    | Hypothesis                                                                        | Result                | Evidence                 | Notes                                                                                                                    |
| ---- | --------------------------------------------------------------------------------- | --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| H-1  | API bypasses `normalizeCalValue()` — no FORM-BUG-7 on date-only writes            | **CONFIRMED**         | CB-1 (WS-1)              | API sends strings; no client-side JS involved                                                                            |
| H-2  | API returns raw stored value — no FORM-BUG-5 fake Z                               | **CONFIRMED**         | CB-2 (WS-2)              | API returns real Z from server normalization                                                                             |
| H-3  | API returns `null` for empty fields — no FORM-BUG-6                               | **CONFIRMED**         | CB-3, CB-18 (WS-2, WS-6) | `null` for all empty variants; `"Invalid Date"` also → `null`                                                            |
| H-4  | Server TZ does not affect API write — strings stored as-is                        | **CONFIRMED**         | CB-4 (WS-1)              | BRT, IST, UTC all produce identical stored values                                                                        |
| H-5  | API accepts ISO 8601 and US date formats at minimum                               | **CONFIRMED**         | CB-14 (WS-5)             | Also accepts: DB format, YYYY/DD, YYYY.DD, English month, abbreviated month                                              |
| H-6  | Date set via API displays correctly in Forms (BRT) but may show FORM-BUG-7 in IST | **PARTIALLY REFUTED** | CB-10 (WS-4)             | Date-only displays correctly in both BRT and IST. But datetime values shift (CB-8) — different mechanism than FORM-BUG-7 |
| H-7  | Forms-saved buggy values readable via API as-is                                   | **CONFIRMED**         | CB-5 (WS-2)              | IST Config A returns `"2026-03-14T00:00:00Z"` — FORM-BUG-7 damage visible in DB                                          |
| H-8  | API round-trip is drift-free                                                      | **CONFIRMED**         | CB-9 (WS-3)              | 2 cycles, 4 configs, zero drift. No FORM-BUG-5 accumulation                                                              |
| H-9  | `postFormRevision` preserves unmentioned fields                                   | **CONFIRMED**         | CB-21 (WS-7)             | Standard partial-update behavior works correctly                                                                         |
| H-10 | OData date filters match stored format                                            | **CONFIRMED**         | CB-22, CB-23 (WS-8)      | Query engine normalizes multiple date formats                                                                            |
| H-11 | Date objects serialized with Z are handled differently than strings               | **CONFIRMED**         | CB-24 (WS-9)             | Z-suffixed values accepted; ms stripped. Stored correctly                                                                |
| H-12 | US-format `new Date()` produces different API results per server TZ               | **CONFIRMED**         | CB-25 (WS-9)             | BRT=`T03:00Z`, IST=prev-day `T18:30Z`, UTC=`T00:00Z`                                                                     |

**Score**: 11 confirmed, 1 partially refuted (H-6). No hypothesis was completely wrong — the test design was well-calibrated.

---

## 7. Developer Guidance

Actionable recommendations for scripts that create or update date fields via the VV API.

### 7.1 Sending Dates to the API

#### Safe Patterns (use these)

| Pattern                       | Code Example                      | Why Safe                                         |
| ----------------------------- | --------------------------------- | ------------------------------------------------ |
| ISO date string               | `"2026-03-15"`                    | Unambiguous, DB stores `2026-03-15 00:00:00.000` |
| ISO datetime string           | `"2026-03-15T14:30:00"`           | DB stores `2026-03-15 14:30:00.000`              |
| ISO datetime with Z           | `"2026-03-15T14:30:00Z"`          | DB stores same value as without Z                |
| US format                     | `"03/15/2026"`                    | Accepted, normalized to ISO                      |
| `Date.UTC()` constructor      | `new Date(Date.UTC(2026, 2, 15))` | Explicit UTC — TZ-independent                    |
| `toISOString().split('T')[0]` | Extracts date from Date obj       | Always uses UTC date — TZ-safe                   |
| ISO parse + serialize         | `new Date("2026-03-15")`          | ISO strings parse as UTC midnight in JS          |

#### Unsafe Patterns (avoid these)

| Pattern                | Code Example                    | Problem                                                    |
| ---------------------- | ------------------------------- | ---------------------------------------------------------- |
| DD/MM/YYYY             | `"15/03/2026"`                  | **Silent data loss** — stored as `null` (WEBSERVICE-BUG-2) |
| Ambiguous DD/MM        | `"05/03/2026"`                  | **Wrong date** — interpreted as May 3 (WEBSERVICE-BUG-3)   |
| US-format `new Date()` | `new Date("03/15/2026")`        | Local midnight varies by TZ (CB-25)                        |
| `new Date(y, m, d)`    | `new Date(2026, 2, 15)`         | Same as US format — local midnight (CB-26)                 |
| `toLocaleDateString()` | `d.toLocaleDateString('en-US')` | UTC- TZs get wrong day for UTC-midnight dates (CB-27)      |
| Compact ISO            | `"20260315"`                    | Silent data loss — stored as `null` (CB-17)                |
| Epoch timestamp        | `1773532800000`                 | Silent data loss — stored as `null` (CB-17)                |
| Locale-formatted       | `d.toLocaleDateString('es-AR')` | Produces DD/MM/YYYY → silent data loss (WEBSERVICE-BUG-2)  |

#### Recommended Date Computation Pattern

```javascript
// SAFE: compute a date 30 days from a known ISO date
const base = new Date('2026-03-15'); // UTC midnight
base.setUTCDate(base.getUTCDate() + 30); // UTC arithmetic
const result = base.toISOString().split('T')[0]; // "2026-04-14"
// Send `result` to API — TZ-independent
```

```javascript
// UNSAFE: same computation using local methods
const base = new Date('03/15/2026'); // LOCAL midnight — varies by TZ
base.setDate(base.getDate() + 30); // local arithmetic
const result = base.toLocaleDateString('en-US'); // "4/14/2026" in UTC, "4/13/2026" in BRT
```

### 7.2 Reading Dates from the API

- API always returns dates normalized to ISO+Z format: `"2026-03-15T00:00:00Z"`
- Unset fields return `null` (not `""` or `"Invalid Date"`)
- The Z suffix is real UTC, not a fake marker (contrast with Forms FORM-BUG-5)
- Safe to parse with `new Date(apiValue)` — the Z ensures correct UTC interpretation
- For date-only fields, extract the date portion: `apiValue.split('T')[0]`

### 7.3 Querying Dates

- OData filters normalize formats — ISO, US, and Z-suffixed all match correctly (CB-22)
- For date-only comparisons on datetime fields, use range: `[Field] ge '2026-03-15' AND [Field] lt '2026-03-16'` (CB-23)
- Avoid exact equality on date-only fields due to WEBSERVICE-BUG-6 (mixed time components from different write paths)

### 7.4 Choosing an Endpoint

| Use Case                                      | Recommended Approach | Why                                                                                                                                             |
| --------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Date-only fields                              | Either endpoint      | Immune to shift (CB-10)                                                                                                                         |
| DateTime fields that users will view in Forms | **`forminstance/`**  | Avoids WEBSERVICE-BUG-1 shift for all DateTime configs. DB stores identical values for `ignoreTZ=true` and `false` — flag affects display only. |
| DateTime fields consumed only by API/scripts  | Either endpoint      | No cross-layer issue if Forms UI is not involved                                                                                                |
| Updating existing records                     | `postFormRevision`   | `forminstance/` has no revision equivalent                                                                                                      |

**Empirical finding (2026-04-06)**: `getSaveValue()` produces identical DB values for Config C and Config D given the same input. The `ignoreTZ` flag does not affect what's stored — it only affects how Forms V1 displays the value on load. Therefore `forminstance/` is the correct workaround for **all** DateTime configs, not just `ignoreTZ=true`.

**Cross-TZ note**: `forminstance/` stores local time without TZ context. This is consistent with how the Forms UI itself saves records — the VV platform does not store timezone context for any write path through `forminstance/`. Two users in different timezones saving "2:30 PM" both store `T14:30:00`.

---

## 8. Design Observations

Issues that are not bugs in any single component but systemic inconsistencies in the VV platform date handling architecture.

### 8.1 No Shared Date Normalization Layer

Both write paths (`postForms` and `forminstance/`) store identical `datetime` values in SQL Server. However, the `FormInstance/Controls` serialization layer produces different string formats for the same DB value depending on which endpoint created the record (ISO+Z for postForms, US format for forminstance/). The `getForms` API normalizes both to ISO+Z, hiding the serialization divergence from API consumers. Forms V1 reads via Controls (not getForms) and parses format-sensitively, causing different runtime behavior for identical DB values.

### 8.2 Client-Side Field Config Not Enforced Server-Side

The 8 field configurations (combinations of `enableTime`, `ignoreTimezone`, `useLegacy`) are invisible to the API (CB-6). A datetime value can be stored in a `enableTime=false` field, and a date-only value can be stored in a `enableTime=true` field. This creates ambiguity when reading data — the time component may or may not be meaningful.

### 8.3 TZ Offset Conversion on Write

The server silently converts timezone offsets to UTC (CB-12). `"2026-03-15T14:30:00-03:00"` becomes `"2026-03-15T17:30:00Z"`. This is correct UTC conversion, but may surprise developers who expect the server to store the original representation. Combined with WEBSERVICE-BUG-1, this means a BRT developer sending a BRT-offset time gets it converted to UTC, then the Forms UI converts it back to local — potentially with a different offset if DST has changed.

---

## 9. Test Coverage

| Category  | Description                |  Slots  |  Pass   |  Fail  | Key Findings                                        |
| --------- | -------------------------- | :-----: | :-----: | :----: | --------------------------------------------------- |
| WS-1      | API Write Path (Create)    |   16    |   16    |   0    | TZ-independent, config-independent                  |
| WS-2      | API Read + Cross-Layer     |   16    |   16    |   0    | No FORM-BUG-5/#6 via API; FORM-BUG-7 damage visible |
| WS-3      | API Round-Trip             |    4    |    4    |   0    | Zero drift across all configs                       |
| WS-4      | API→Forms Cross-Layer      |   10    |    3    |   7    | CB-8 shift, midnight crossing                       |
| WS-5      | Input Format Tolerance     |   33    |   24    |   9    | LATAM data loss, ambiguous dates                    |
| WS-6      | Empty/Null Handling        |   12    |   12    |   0    | Clean null handling throughout                      |
| WS-7      | API Update Path            |   12    |   12    |   0    | Preserve/change/add all correct                     |
| WS-8      | Query Date Filtering       |   10    |   10    |   0    | Format-tolerant query engine                        |
| WS-9      | Date Computation           |   23    |   17    |   6    | TZ-safe vs unsafe patterns identified               |
| WS-10     | postForms vs forminstance/ |   12    |    2    |   10   | Root cause of Freshdesk #124697                     |
| **Total** |                            | **148** | **116** | **32** |                                                     |

> **Note**: WS-10A additionally includes 7 forminstance/ comparison rows (all PASS) embedded in the same table for side-by-side analysis. These are not counted as separate test slots. See [`matrix.md`](matrix.md) WS-10A for details.

Full test matrix with per-slot results: [`matrix.md`](matrix.md)

---

## 10. Related

| Reference                      | Location                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Forms calendar analysis        | [`../../forms-calendar/analysis/overview.md`](../../forms-calendar/analysis/overview.md)                           |
| Forms confirmed bugs           | [`../../forms-calendar/analysis/overview.md`](../../forms-calendar/analysis/overview.md) § Confirmed Bugs          |
| Test matrix (per-slot results) | [`../matrix.md`](../matrix.md)                                                                                     |
| Test harness source            | [`../webservice-test-harness.js`](../webservice-test-harness.js)                                                   |
| Form button script             | [`../ws-harness-button.js`](../ws-harness-button.js)                                                               |
| WS-10 browser verifier         | [`../verify-ws10-browser.js`](../verify-ws10-browser.js)                                                           |
| Direct test runner             | [`../run-ws-test.js`](../run-ws-test.js)                                                                           |
| Node.js client library         | [`../../../../lib/VVRestApi/VVRestApiNodeJs/VVRestApi.js`](../../../../lib/VVRestApi/VVRestApiNodeJs/VVRestApi.js) |
| FormsApi source                | [`../../../../lib/VVRestApi/VVRestApiNodeJs/FormsApi.js`](../../../../lib/VVRestApi/VVRestApiNodeJs/FormsApi.js)   |
| API endpoint config            | [`../../../../lib/VVRestApi/VVRestApiNodeJs/config.yml`](../../../../lib/VVRestApi/VVRestApiNodeJs/config.yml)     |
| Scripting data flow guide      | [`../../../../docs/guides/scripting.md`](../../../../docs/guides/scripting.md)                                     |
| Freshdesk #124697              | WADNR-10407 — postForms time mutation                                                                              |
| Overall investigation          | [`../../CLAUDE.md`](../../CLAUDE.md)                                                                               |
| Dashboard date analysis        | [`../../dashboards/`](../../dashboards/)                                                                           |
