# API Verification — Relate/Unrelate Round-Trip

## Test Environment

- **Server:** vvdemo / EmanuelJofre / Main
- **Build:** 20260304.1
- **Date:** 2026-04-15
- **Template:** DateTest
- **Runner:** `node tools/runners/run-relate-test.js --debug`

## Test Records

| Record | Instance Name   | Revision ID                            |
| ------ | --------------- | -------------------------------------- |
| Form A | DateTest-001957 | `8745848c-e538-f111-ba23-0e3ceb11fc25` |
| Form B | DateTest-001958 | `8845848c-e538-f111-ba23-0e3ceb11fc25` |

## Results: 6/6 PASS

### Step 1 — Create Form A

```
POST /formtemplates/{templateId}/forms
Status: 201 Created
Response: { revisionId, instanceName, modifyDate, createDate, ... }
```

### Step 2 — Create Form B

Same as Step 1. Both forms created successfully.

### Step 3 — Relate Form A to Form B

```
PUT /forminstance/8745848c-.../relateForm?relateToId=8845848c-...
Status: 200 OK
Response: { meta: { status: 200, statusMsg: "OK", method: "PUT" } }
```

No `data` property in the response — just `meta` confirming success.

### Step 4 — Verify Relationship Exists

```
GET /forminstance/8745848c-.../forms
Status: 200 OK
Response data: [
  {
    "href": "~/FormInstance/8845848c-.../forms",
    "dataType": "FormInstance",
    "revisionId": "8845848c-e538-f111-ba23-0e3ceb11fc25",
    "instanceName": "DateTest-001958"
  }
]
```

Form B appears in Form A's related forms list. Each related form entry has: `href`, `dataType`, `revisionId`, `instanceName`.

### Step 5 — Unrelate Form A from Form B

```
PUT /forminstance/8745848c-.../unrelateForm?relateToId=8845848c-...
Status: 200 OK
Response: { meta: { status: 200, statusMsg: "OK", method: "PUT" } }
```

Same response shape as `relateForm` — just `meta`, no `data`.

### Step 6 — Verify Relationship Removed

```
GET /forminstance/8745848c-.../forms
Status: 200 OK
Response data: []
```

Empty array — relationship successfully removed.

## API Summary

| Operation    | Method | Endpoint                          | Params                          | Response                                              |
| ------------ | ------ | --------------------------------- | ------------------------------- | ----------------------------------------------------- |
| Relate       | PUT    | `/forminstance/{id}/relateForm`   | `relateToId` or `relateToDocId` | `{ meta }` (no data)                                  |
| Unrelate     | PUT    | `/forminstance/{id}/unrelateForm` | `relateToId` or `relateToDocId` | `{ meta }` (no data)                                  |
| List related | GET    | `/forminstance/{id}/forms`        | —                               | `{ meta, data: [{ revisionId, instanceName, ... }] }` |

## Key Observations

1. **Symmetric API:** `relateForm` and `unrelateForm` have identical signatures and response shapes. Only the endpoint path differs.
2. **No error on double-unrelate:** Calling `unrelateForm` on an already-unrelated pair returns 200 (idempotent).
3. **Bidirectional relationship:** Relating A→B makes B appear in A's related forms AND A appear in B's related forms. Unrelating from either side removes the relationship.
4. **PUT method:** Both relate and unrelate use PUT, not POST or DELETE.
5. **Query string params:** The target form ID is passed as a query parameter, not in the request body.
