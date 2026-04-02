# Scripting Guide — Node.js Server Data Flow

How data flows through the nodeV2 server when executing form scripts and scheduled scripts. Based on analysis of the upstream `VisualVault/nodeJs-rest-client-library` code.

> **Note:** The `lib/` directory is stock upstream with zero local modifications.

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

Triggered by cron schedules. No form context — scripts must query data explicitly.

```javascript
module.exports.main = async function (vvClient, response, token) {
    // vvClient: authenticated VV REST API client
    // response: Express response object
    // token: optional token parameter from the scheduler
    // NOTE: no ffCollection — scheduled scripts have no form context
};
```

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
ffCollection.getFormFieldByName('DataField7'); // case-insensitive lookup
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
           - Dates remain as ISO 8601 strings (NOT converted to Date objects)
           - Field names are LOWERCASED (e.g., "datafield7" not "DataField7")
```

### Field Name Casing

The VV REST API returns field names in **camelCase** (e.g., `dataField7`, not `DataField7` or `datafield7`). When reading field values from API response objects (e.g., from `getForms()`), use camelCase:

```javascript
const record = await getForms(...);
const value = record.data[0]['dataField7'];  // camelCase, not 'DataField7'
```

When **writing** field values (e.g., `postForms()`, `postFormRevision()`), the API accepts the original casing:

```javascript
vvClient.forms.postForms(null, { DataField7: '2026-03-15' }, templateName); // original case
```

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
- The open question is what the **VV server itself** does with date values (storage format, timezone handling, re-formatting)
