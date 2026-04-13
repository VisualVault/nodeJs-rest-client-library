# Scripting Guide — Node.js Server Data Flow

How data flows through the nodeV2 server when executing form scripts and scheduled scripts. Based on analysis of the upstream `VisualVault/nodeJs-rest-client-library` code.

> **Note:** The `lib/` directory is sourced from [upstream](https://github.com/VisualVault/nodeJs-rest-client-library) with intentional local enhancements (write-policy guards, options plumbing, route wiring). See the root `CLAUDE.md` "Upstream Sync & Protection" section for modification rules.

---

## Script Execution Contracts

### Form Scripts (`/scripts`)

Triggered by form button clicks or events. VV sends a POST with script code and form field data.

```javascript
module.exports.main = async function (ffCollection, vvClient, response) {
    // ffCollection: formFieldCollection wrapping the form's field data
    // vvClient: authenticated VV REST API client
    // response: Express response object for returning results
};
```

### Scheduled Scripts (`/scheduledscripts`)

Triggered by cron schedules or manually via the "Test Microservice" button in `scheduleradmin`. No form context — scripts must query data explicitly.

```javascript
module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = 'CustomerName';
    options.databaseAlias = 'Main';
    options.userId = 'user@example.com';
    options.password = '...';
    options.clientId = '...';
    options.clientSecret = '...';
    return options;
};

module.exports.main = async function (vvClient, response, token) {
    // vvClient: authenticated VV REST API client (uses getCredentials() above)
    // response: Express response object
    // token: the scheduledProcessGUID — pass to postCompletion() to report results
    // NOTE: no ffCollection — scheduled scripts have no form context

    var scheduledProcessGUID = token;
    // ... do work ...
    return vvClient.scheduledProcess.postCompletion(scheduledProcessGUID, 'complete', true, 'Success message');
};
```

**Script caching:** The server writes the script to `lib/VVRestApi/VVRestApiNodeJs/files/{scriptId}.js` on first execution. On subsequent calls, it deletes the cached file and re-writes the latest version from VV. This means script changes in the admin UI take effect on the next execution without a server restart.

**`getCredentials()` is required** for scheduled scripts — the server calls it to authenticate with the VV API before invoking `main()`. Form scripts don't need it (the server uses the calling user's session).

---

## Data Flow: Form Script Execution

```
VV Platform (POST /scripts)
    │
    ├── req.body contains: script (code text), baseUrl, fields (JSON array)
    │
    └── routes/scripts.js
            │
            ├── 1. Extracts fields from req.body
            │      - If req.body is Array: iterates Key/Value pairs
            │      - If req.body is Object: reads req.body.fields
            │      - Fields parsed via JSON.parse() if received as string
            │
            ├── 2. Wraps field array in formFieldCollection
            │      new clientLibrary.forms.formFieldCollection(ffColl)
            │
            ├── 3. Authenticates vvClient via OAuth
            │
            └── 4. Calls scriptToExecute.main(ffCollection, vvClient, response)
```

### formFieldCollection

A pure lookup wrapper around the raw field array. **No data transformation occurs.**

```javascript
ffCollection.getFormFieldByName('Field7'); // case-insensitive lookup
ffCollection.getFormFieldById('some-guid'); // case-insensitive lookup
ffCollection.getFieldArray(); // returns raw array
```

Each field object has: `{ name, id, value }`. Values are whatever the client sent — typically strings.

---

## Data Flow: API Calls (vvClient → VV Server)

When a script calls `vvClient.forms.postForms()`, `getForms()`, or `postFormRevision()`:

```
Script calls vvClient.forms.postForms(params, data, templateName)
    │
    ├── FormsApi.js: adds formTemplateId to data object (only mutation)
    │
    ├── common.js httpPost(): builds request options with { json: data }
    │
    ├── request library (^2.27.0): JSON.stringify(data)
    │      - String values: passed through as-is
    │      - Date objects: serialized via .toJSON() → ISO 8601 ("2026-03-15T00:00:00.000Z")
    │      - null/undefined: serialized normally
    │
    └── HTTP POST to VV server with Content-Type: application/json
```

### Key findings

1. **The Node.js library is a transparent passthrough** — no date transformation at any layer between script code and the VV server API.

2. **Date serialization** is handled by the `request` library's `JSON.stringify()`. If you pass a string like `"2026-03-15"`, it reaches the VV server exactly as-is. If you pass a JavaScript `Date` object, it's serialized to ISO 8601 with the `Z` suffix.

3. **FormsApi.js only mutates two fields**: `formTemplateId` and `formId`. All other field data passes through unchanged.

4. **`dateHelper` utility** exists in `common.js` (lines 1285-1329) with methods like `iso8601()`, `rfc822()`, `from()`, `unixTimestamp()`. It is **never used** in the standard request/response flow — available for scripts to use explicitly if needed.

---

## Data Flow: API Responses (VV Server → Script)

```
VV Server responds with JSON
    │
    ├── common.js: JSON.parse(responseData) if string, else passthrough
    │
    └── Script receives parsed JavaScript object
           - Dates are normalized to ISO 8601 datetime with Z suffix (e.g., "2026-03-15T00:00:00Z")
           - Field names have first character lowercased (e.g., "dataField7" not "Field7", "start Date" not "Start Date")
```

### Field Name Casing (Response Key Transformation)

The VV REST API transforms field names in response objects by **lowercasing only the first character** — the rest of the name is preserved exactly. This is not camelCase; it's a single-character transformation applied uniformly.

| Source Name (Template / SQL Column) | Response Key           | Rule                         |
| ----------------------------------- | ---------------------- | ---------------------------- |
| `Status`                            | `status`               | S→s                          |
| `Address`                           | `address`              | A→a                          |
| `Start Date`                        | `start Date`           | S→s, space + rest preserved  |
| `Subscription Pack ID`              | `subscription Pack ID` | S→s, spaces + rest preserved |
| `ADDRESS`                           | `aDDRESS`              | A→a, rest stays uppercase    |
| `UsId`                              | `usId`                 | U→u                          |
| `UsSiteID`                          | `usSiteID`             | U→u                          |
| `Field7` → `dataField7`             | `dataField7`           | d→d (already lowercase)      |

**This applies to all API response types** — `getForms()`, `getCustomQueryResultsByName()`, and system table queries all apply the same transformation. For custom queries, the source name is the SQL column name or alias.

**`q` filters are case-insensitive** — `[Start Date] eq '...'` and `[start date] eq '...'` both work. But response object keys always use the transformed form.

```javascript
// Reading: use the transformed key (lowercase first char)
const record = (await getForms(...)).data[0];
record['dataField7'];    // getForms field access
record['start Date'];    // multi-word field (space preserved)

const cqRow = (await getCustomQueryResultsByName(...)).data[0];
cqRow.usFirstName;       // SQL column UsFirstName → usFirstName
cqRow['provider ID'];    // SQL column/alias "Provider ID" → "provider ID"
```

When **writing** field values (e.g., `postForms()`, `postFormRevision()`), the API accepts the original casing:

```javascript
vvClient.forms.postForms(null, { Field7: '2026-03-15' }, templateName); // original case
```

### Date Format Normalization

The VV API normalizes **all date values** to ISO 8601 datetime with Z suffix in responses, regardless of how they were stored:

| Stored via Forms                          | API Returns                            |
| ----------------------------------------- | -------------------------------------- |
| `"2026-03-15"` (date-only field)          | `"2026-03-15T00:00:00Z"`               |
| `"2026-03-15T00:00:00"` (datetime, no Z)  | `"2026-03-15T00:00:00Z"`               |
| `"2026-03-15T03:00:00.000Z"` (legacy UTC) | `"2026-03-15T03:00:00Z"` (ms stripped) |

This means **API return values do not match Forms `getValueObjectValue()` format**. A date-only field returns `"2026-03-15"` in Forms but `"2026-03-15T00:00:00Z"` via the API. Scripts comparing API reads against Forms behavior must account for this normalization.

### Null and Empty Fields

Unset or empty date fields return `null` in API responses (not `""` or `"Invalid Date"`). This differs from Forms `GetFieldValue()` which returns `"Invalid Date"` for empty Config D fields (FORM-BUG-6).

### getForms() Parameters

**`expand: true` is required to include form field data.** Without it, `getForms()` returns only the record's `dataType` — no field values (`dataField7`, `dataField5`, etc.) are included. This is the most common cause of "all fields are null" when querying records.

**`sort` parameter**: The VV API's OData sort does not reliably support `DESC`. Passing `sort: 'createDate DESC'` causes a SQL syntax error (`Incorrect syntax near the keyword 'ASC'`) on vv5dev. Use OData `$orderby` via query params or filter client-side instead. Verified 2026-04-10.

### Expanded Record Metadata

When `expand: true` is set in `getForms()`, the response includes system metadata alongside field values:

| Field                       | Description                             |
| --------------------------- | --------------------------------------- |
| `revisionId`                | Record GUID                             |
| `instanceName`              | Record name (e.g., `"DateTest-000080"`) |
| `createDate` / `modifyDate` | ISO 8601 timestamps with Z              |
| `createBy` / `modifyBy`     | User email                              |
| `href`                      | API resource path                       |

### Server-Side Date Format Acceptance (on Write)

The VV server parses date strings before storing. It does **not** echo the input as-is — it normalizes to ISO 8601 datetime+Z on storage.

**Accepted formats** (all normalized to ISO 8601+Z):

| Format              | Example                                                | Stored As                                   |
| ------------------- | ------------------------------------------------------ | ------------------------------------------- |
| ISO date-only       | `"2026-03-15"`                                         | `"2026-03-15T00:00:00Z"`                    |
| US (MM/DD/YYYY)     | `"03/15/2026"`                                         | `"2026-03-15T00:00:00Z"`                    |
| ISO datetime        | `"2026-03-15T14:30:00"`                                | `"2026-03-15T14:30:00Z"` (Z appended)       |
| ISO datetime+Z      | `"2026-03-15T14:30:00Z"`                               | `"2026-03-15T14:30:00Z"`                    |
| ISO datetime+offset | `"2026-03-15T14:30:00-03:00"`                          | `"2026-03-15T17:30:00Z"` (converted to UTC) |
| ISO datetime+ms     | `"2026-03-15T14:30:00.000Z"`                           | `"2026-03-15T14:30:00Z"` (ms stripped)      |
| YYYY/MM/DD          | `"2026/03/15"`                                         | `"2026-03-15T00:00:00Z"`                    |
| English month       | `"March 15, 2026"`, `"15 March 2026"`, `"15-Mar-2026"` | `"2026-03-15T00:00:00Z"`                    |
| Query Admin display | `"3/15/2026 12:00:00 AM"`                              | `"2026-03-15T00:00:00Z"`                    |

**Silently rejected formats** (accepted by API, stored as `null` — no error):

| Format               | Example                                        | Problem                                           |
| -------------------- | ---------------------------------------------- | ------------------------------------------------- |
| DD/MM/YYYY (LATAM)   | `"15/03/2026"`, `"15-03-2026"`, `"15.03.2026"` | Day-first not recognized; silent data loss        |
| Compact ISO          | `"20260315"`                                   | No separators; not parsed                         |
| Ambiguous (day ≤ 12) | `"05/03/2026"`                                 | Interpreted as MM/DD (May 3), not DD/MM (March 5) |

**Key behaviors:**

- TZ offsets are **converted to UTC** on the server (e.g., `-03:00` → +3 hours)
- Milliseconds are **stripped** from stored values
- Unparseable dates are **silently stored as `null`** — no API error, record creation succeeds
- `enableTime`, `ignoreTimezone`, `useLegacy` field config flags have **zero effect** on API write behavior

### Clearing Date Fields via API

Send empty string `""` via `postFormRevision()` to clear an existing date value. The field will store `null` after the update.

### OData Query Date Format Tolerance

The `q` parameter in `getForms()` normalizes date formats in filter expressions:

- `[Field7] eq '03/15/2026'` — US format works
- `[Field6] eq '2026-03-15T14:30:00Z'` — Z suffix works
- `[Field6] ge '2026-03-15' AND le '2026-03-16'` — date-only range on DateTime fields works

### TZ-Safe Date Patterns for Scripts

When constructing dates in scripts that may run in different timezones (local dev vs cloud):

| Pattern            | Code                                | TZ-Safe? | Why                                                   |
| ------------------ | ----------------------------------- | :------: | ----------------------------------------------------- |
| ISO string parse   | `new Date("2026-03-15")`            | **Yes**  | ISO date-only → UTC midnight per spec                 |
| Date.UTC()         | `new Date(Date.UTC(2026, 2, 15))`   | **Yes**  | Explicit UTC construction                             |
| UTC arithmetic     | `d.setUTCDate(d.getUTCDate() + 30)` | **Yes**  | UTC methods avoid local TZ                            |
| String extract     | `d.toISOString().split('T')[0]`     | **Yes**  | Extracts UTC date as string                           |
| US string parse    | `new Date("03/15/2026")`            |  **No**  | Local midnight — different UTC per TZ                 |
| Constructor parts  | `new Date(2026, 2, 15)`             |  **No**  | Local midnight — same as US parse                     |
| toLocaleDateString | `d.toLocaleDateString('en-US')`     |  **No**  | Returns local calendar date — wrong day in UTC- zones |

**Recommendation**: Always send date strings (not Date objects) to the API. Use `toISOString().split('T')[0]` for date-only fields, or `toISOString()` for datetime fields.

---

## Script Response Pattern

The standard response pattern for web service scripts:

```javascript
const output = {
    data: null, // return payload
    errors: [], // array of error messages
    status: 'Success', // "Success" | "Warning" | "Error"
};

// ... business logic ...

response.json(200, output);
```

The legacy format (`["Success", "message", data]` array) is deprecated.

---

## Dependencies

| Package   | Version   | Role                                                                                               |
| --------- | --------- | -------------------------------------------------------------------------------------------------- |
| `request` | `^2.27.0` | HTTP client for VV API calls. Old (2013) but stable. Handles JSON serialization via `json` option. |
| `js-yaml` | (bundled) | Parses `config.yml` for URI templates                                                              |

---

## Implications for Date Testing

Since the Node.js library introduces **zero date transformations**:

- Any date value passed to `postForms()` reaches the VV server exactly as sent
- Any date value returned by `getForms()` is exactly what the VV server returned
- Bugs #5, #6, #7 (discovered in Forms calendar testing) are **client-side only** — they live in the browser's `main.js`, not in the API layer
- **Answered (2026-04-06):** The VV server stores date values in SQL Server `datetime` columns (timezone-unaware). It stores the value as-received from the client — no UTC conversion or timezone normalization occurs server-side. `VVCreateDate`/`VVModifyDate` use server-local time (BRT on vvdemo); field values reflect whatever the client sent (`toISOString()` → UTC, `getSaveValue()` → local-time-no-TZ). See [Platform Architecture — Form Database Schema](../architecture/visualvault-platform.md#form-database-schema).

---

## FormsAPI Access (forminstance/ Endpoint)

The VV Node.js client can create records through the **FormsAPI** (`/forminstance` endpoint) in addition to the standard `postForms`. Both endpoints store identical SQL `datetime` values, but the FormsAPI's `FormInstance/Controls` serializes the response in US format (no timezone), which avoids the CB-8 cross-layer shift that occurs with postForms' ISO+Z serialization. See [api-date-patterns.md](../reference/api-date-patterns.md#endpoint-serialization-warning-cb-29) for details.

### Prerequisites

- FormsAPI must be enabled on the VV environment (checked via `/configuration/formsapi`)
- JWT authentication (auto-negotiated by `getVaultApi()`)
- Template **revision ID** (not the template ID or form definition GUID)

**Important**: The FormsAPI runs on a **separate domain** from the core API. Requests go to `https://preformsapi.visualvault.com/api/v1/forminstance` (not the environment's base URL). The client library handles this routing automatically via the `/configuration/formsapi` endpoint response. This means URL-based guards (like the write policy in `common.js`) cannot match FormsAPI requests by template GUID — the URL path is just `/api/v1/forminstance` with no template identifier. Verified 2026-04-10 on vv5dev.

### Usage

```javascript
// Resolve the template revision ID (one-time)
const resp = await vvClient.forms.getFormTemplateIdByName('TemplateName');
const revisionId = resp.templateRevisionIdGuid;

// Create a record via FormsAPI
// NOTE: payload format differs from postForms — uses { fields: [{key, value}] }
const data = {
    formName: '',
    fields: [
        { key: 'Field5', value: '2026-03-15T14:30:00' },
        { key: 'Field7', value: '2026-03-15' },
    ],
};

const result = await vvClient.formsApi.formInstances.postForm(null, data, revisionId);
const parsed = JSON.parse(result);
// parsed.data: { formId: "<DataID>", name: "TemplateName-001234", confirmationPage: null }
```

### Error handling

```javascript
try {
    const formsApi = vvClient.formsApi; // throws ReferenceError if not enabled
} catch (err) {
    if (err instanceof ReferenceError) {
        console.log('FormsAPI not enabled on this environment');
    }
}
```

### Key differences from postForms

| Aspect              | `postForms` (core API)               | `formInstances.postForm` (FormsAPI) |
| ------------------- | ------------------------------------ | ----------------------------------- |
| Template identifier | Name or GUID (auto-resolves)         | Revision ID (must resolve manually) |
| Payload format      | Flat `{ FieldN: value }`             | `{ fields: [{ key, value }] }`      |
| Date storage        | ISO+Z (`"2026-03-15T14:30:00Z"`)     | US (`"03/15/2026 14:30:00"`)        |
| Forms load behavior | UTC interpretation → TZ shift (CB-8) | Local interpretation → no shift     |
| Auth requirement    | OAuth token                          | JWT token                           |
