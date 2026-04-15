# Unrelate Forms — Client-Side API Investigation

## What This Is

Investigation of the VV platform's `unrelateForm` REST API endpoint and creation of a reusable client-side script for unrelating form records. The server-side Node.js client has `unrelateForm()` / `unrelateFormByDocId()`, but no client-side browser equivalent exists (unlike `FillinAndRelateForm` for relating).

## Scope

| Component                              | Status      | Notes                                                   |
| -------------------------------------- | ----------- | ------------------------------------------------------- |
| REST API verification                  | Complete    | `PUT /forminstance/{id}/unrelateForm?relateToId={id}`   |
| `relateForm` round-trip                | Complete    | Create → relate → verify → unrelate → verify            |
| Client-side script                     | Complete    | `UnrelateForm.js` global function for form template use |
| `unrelateFormByDocId` variant          | Not Started | Uses `relateToDocId` param instead of `relateToId`      |
| `unrelateDocument` / `unrelateProject` | Not Started | Symmetric endpoints — same pattern, different resources |

## Key Facts

- **Server-side methods exist:** `VVRestApi.js:858-920` — `unrelateForm`, `unrelateFormByDocId`, `unrelateDocument`, `unrelateDocumentByDocId`, `unrelateProject`, `unrelateProjectByName`
- **All use PUT:** Same HTTP method as `relateForm` counterparts
- **Endpoint pattern:** `PUT /forminstance/{id}/unrelateForm?relateToId={targetId}`
- **No client-side equivalent:** `FillinAndRelateForm` is a widely-used global function (36 templates on WADNR alone), but there's no `UnrelateForm`
- **Verification endpoint:** `GET /forminstance/{id}/forms` returns related forms list

## Tools Created

- `tools/runners/run-relate-test.js` — Round-trip API verification runner
- `scripts/examples/form/global/UnrelateForm.js` — Client-side unrelate script

## Next Steps

1. Run API verification on vvdemo
2. Document response shapes
3. Test `unrelateFormByDocId` variant if needed
