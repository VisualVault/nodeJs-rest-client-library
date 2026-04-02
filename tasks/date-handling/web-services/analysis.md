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

## Hypothesized Behaviors

Based on Forms UI analysis (`../forms-calendar/analysis.md`), these are expected API behaviors to verify:

| #    | Hypothesis                                                                   | Forms UI Equivalent                    | Priority |
| ---- | ---------------------------------------------------------------------------- | -------------------------------------- | -------- |
| WS-1 | API bypasses `normalizeCalValue()` — no Bug #7 (date-only wrong day in UTC+) | Bug #7 is client-side JS               | HIGH     |
| WS-2 | API returns raw stored value — no Bug #5 (fake Z suffix)                     | Bug #5 is in `getCalendarFieldValue()` | HIGH     |
| WS-3 | API returns empty string for empty fields — no Bug #6 ("Invalid Date")       | Bug #6 is in `getCalendarFieldValue()` | MEDIUM   |
| WS-4 | API stores dates in UTC regardless of sender timezone                        | Server-side behavior                   | HIGH     |
| WS-5 | API accepts multiple date formats (ISO, US, datetime)                        | Input format tolerance                 | MEDIUM   |
| WS-6 | Date set via API and read via Forms UI matches original                      | Cross-layer round-trip                 | HIGH     |
| WS-7 | Date set via Forms UI and read via API matches original                      | Cross-layer round-trip                 | HIGH     |

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
| Node.js client library  | `lib/VVRestApi/VVRestApiNodeJs/VVRestApi.js`     |
| Forms API               | `lib/VVRestApi/VVRestApiNodeJs/FormsApi.js`      |
| API config (endpoints)  | `lib/VVRestApi/VVRestApiNodeJs/config.yml`       |
| Overall investigation   | `../CLAUDE.md`                                   |
