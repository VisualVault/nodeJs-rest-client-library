# Web Services Date Handling - Analysis

## Document Purpose

This document analyzes date handling behavior in the VisualVault REST API when creating and updating form records via web services (Node.js client library). It covers how dates are sent, stored, and returned through the API, and documents any discrepancies with Forms UI behavior.

## Scope

Web services interact with form data through the VV REST API:

- **Create form instance**: `POST /formtemplates/{id}/forms` — creates a new form record with field values
- **Update form instance**: `POST /formtemplates/{id}/forms/{formId}` — creates a new revision with updated fields
- **Get form instances**: `GET /formtemplates/{id}/forms` — retrieves form records with field values
- **Get form instance by ID**: `GET /formtemplates/{id}/forms/{formId}` — retrieves a single form record

Node.js client methods:

- `vvClient.forms.postForms(params, data, formTemplateId)` — create
- `vvClient.forms.postFormRevision(params, data, formTemplateId, formId)` — update
- `vvClient.forms.getForms(params, formTemplateId)` — query
- `vvClient.forms.getFormInstanceById(templateId, instanceId)` — get single

## Key Questions

1. **What date formats does the API accept?** — ISO 8601 (`2026-03-15`), datetime (`2026-03-15T00:00:00`), with/without Z suffix?
2. **What date formats does the API return?** — Same as stored? Transformed? With timezone info?
3. **Does the API apply the same transformations as `SetFieldValue`/`GetFieldValue`?** — Or does it bypass the Forms JS layer entirely?
4. **Is there timezone sensitivity?** — Does the server apply timezone conversions, or is it timezone-agnostic?
5. **Round-trip integrity**: Can a date be read via API, written back via API, and remain unchanged?
6. **Cross-layer consistency**: Does a date set via API produce the same stored value as the same date set via Forms UI?

## API Request/Response Format

### Create Form Instance

```javascript
const formData = {
    DataField7: '2026-03-15', // date-only
    DataField5: '2026-03-15T00:00:00', // datetime
};

const params = {};
const resp = await vvClient.forms.postForms(params, formData, FORM_TEMPLATE_ID);
const result = JSON.parse(resp);
// result.data — created form record
// result.meta — status info
```

### Query Form Instance

```javascript
const params = {
    fields: 'id, dataField7, dataField5, revisionId',
    q: `instanceName eq 'DateTest-000100'`,
};
const resp = await vvClient.forms.getForms(params, FORM_TEMPLATE_ID);
const result = JSON.parse(resp);
// result.data[0].dataField7 — returned date value (format TBD)
```

## Confirmed Infrastructure Findings

### Node.js library is a transparent passthrough (confirmed 2026-04-02)

Analysis of the upstream `VisualVault/nodeJs-rest-client-library` (stock code, zero local modifications to `lib/`) confirms:

- **No date transformation** occurs at any layer between script code and the VV server
- `postForms()` / `postFormRevision()` pass field data directly to the `request` library's `JSON.stringify()`
- String values pass through as-is; JavaScript `Date` objects would be serialized to ISO 8601 with Z suffix
- Response parsing (`JSON.parse()`) returns date values as strings — never converted to Date objects
- `formFieldCollection` is a pure lookup wrapper with no value transformation
- `dateHelper` utility class exists in `common.js` but is never invoked in the request/response flow
- VV API returns field names **lowercased** (`datafield7` not `DataField7`) in responses

**Implication**: Any date behavior differences between API and Forms must originate from either the **VV server** or the **Forms client-side JS** — not the Node.js intermediary.

Full documentation: `docs/guides/scripting.md`

---

## Hypothesized Behaviors

Based on Forms UI analysis (`../forms-calendar/analysis.md`) and upstream library analysis:

| #    | Hypothesis                                                                       | Rationale                                                              | Category | Priority |
| ---- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | :------: | -------- |
| H-1  | API bypasses `normalizeCalValue()` — no Bug #7 (date-only wrong day in UTC+)     | Bug #7 is client-side JS; API sends strings                            |   WS-1   | HIGH     |
| H-2  | API returns raw stored value — no Bug #5 (fake Z suffix)                         | Bug #5 is in `getCalendarFieldValue()` (Forms JS only)                 |   WS-2   | HIGH     |
| H-3  | API returns empty/null for empty fields — no Bug #6 ("Invalid Date")             | Bug #6 is in `getCalendarFieldValue()` (Forms JS only)                 |   WS-6   | MEDIUM   |
| H-4  | Server TZ does not affect API write — strings stored as-is                       | Node.js library sends strings, no Date object conversion               |   WS-1   | HIGH     |
| H-5  | API accepts ISO 8601 and US date formats at minimum                              | VV ecosystem uses both formats                                         |   WS-5   | MEDIUM   |
| H-6  | Date set via API displays correctly in Forms (BRT) but may show Bug #7 in IST    | `initCalendarValueV1` applies `moment(e).toDate()` on load             |   WS-4   | HIGH     |
| H-7  | Forms-saved values (including buggy ones) are readable via API as-is             | API reads raw DB, no Forms JS overlay                                  |   WS-2   | HIGH     |
| H-8  | API round-trip is drift-free                                                     | No Bug #5 fake Z in API read path                                      |   WS-3   | MEDIUM   |
| H-9  | `postFormRevision` preserves unmentioned fields                                  | Standard REST partial-update behavior                                  |   WS-7   | MEDIUM   |
| H-10 | OData date filters match stored format                                           | Query engine compares against DB column                                |   WS-8   | MEDIUM   |
| H-11 | Date objects serialized with Z suffix are handled differently than plain strings | `JSON.stringify(new Date())` → ISO+Z; VV server may convert or strip Z |   WS-9   | HIGH     |
| H-12 | US-format `new Date("03/15/2026")` produces different API results per server TZ  | Local midnight varies: BRT=T03:00Z, IST=prev-dayT18:30Z, UTC=T00:00Z   |   WS-9   | HIGH     |

## Confirmed Behaviors

<!-- Add confirmed behaviors here as testing progresses -->

## Confirmed Bugs

<!-- Add confirmed bugs here as testing discovers them -->

## Related

| Reference               | Location                                         |
| ----------------------- | ------------------------------------------------ |
| Forms calendar analysis | `../forms-calendar/analysis.md`                  |
| Forms confirmed bugs    | `../forms-calendar/analysis.md` § Confirmed Bugs |
| Test matrix             | `matrix.md`                                      |
| Test harness            | `webservice-test-harness.js`                     |
| Script pattern template | `webservice-pattern.js`                          |
| Scripting data flow     | `docs/guides/scripting.md`                       |
| Node.js client library  | `lib/VVRestApi/VVRestApiNodeJs/VVRestApi.js`     |
| Forms API               | `lib/VVRestApi/VVRestApiNodeJs/FormsApi.js`      |
| API config (endpoints)  | `lib/VVRestApi/VVRestApiNodeJs/config.yml`       |
| Overall investigation   | `../CLAUDE.md`                                   |
