# Unrelate Forms — Client-Side API Investigation

## What This Is

Investigation of the VV platform's `unrelateForm` REST API endpoint and creation of a reusable client-side script for unrelating form records. The server-side Node.js client has `unrelateForm()` / `unrelateFormByDocId()`, but no client-side browser equivalent exists (unlike `FillinAndRelateForm` for relating).

## Scope

| Component                              | Status      | Notes                                                                        |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| REST API verification                  | Complete    | `PUT /forminstance/{id}/unrelateForm?relateToId={id}` — 6/6 pass on vvdemo   |
| `relateForm` round-trip                | Complete    | Create → relate → verify → unrelate → verify                                 |
| Client-side script                     | Complete    | `UnrelateForm.js` — unrelate + auto-detect parent + close window             |
| URL-based unrelate investigation       | Complete    | No URL param exists. Relate is the only URL-based write. See analysis below. |
| FormViewer JS source analysis          | Complete    | Full `VV.Form.Global` enumeration + Angular bundle search                    |
| `unrelateFormByDocId` variant          | Not Started | Uses `relateToDocId` param instead of `relateToId`                           |
| `unrelateDocument` / `unrelateProject` | Not Started | Symmetric endpoints — same pattern, different resources                      |

## Key Facts

- **Server-side methods exist:** `VVRestApi.js:858-920` — `unrelateForm`, `unrelateFormByDocId`, `unrelateDocument`, `unrelateDocumentByDocId`, `unrelateProject`, `unrelateProjectByName`
- **All use PUT:** Same HTTP method as `relateForm` counterparts
- **Endpoint pattern:** `PUT /forminstance/{id}/unrelateForm?relateToId={targetId}`
- **No client-side equivalent:** `FillinAndRelateForm` is a widely-used global function (36 templates on WADNR alone), but there's no `UnrelateForm`
- **No URL-based unrelate:** `RelateForm` + `IsRelate=true` is the only URL-based write on FormViewer. Tested `IsRelate=false`, `UnRelateForm`, `IsUnrelate` — all ignored. See `docs/reference/formviewer-url-params.md`.
- **Discovered `delRelateFormApi`:** Angular SPA uses `DELETE /FormInstance/Relations {childFormId, parentFormId}` internally — a different endpoint from the PUT variant. Documented in `docs/architecture/visualvault-platform.md` § Form Relations API.
- **Verification endpoint:** `GET /forminstance/{id}/forms` returns related forms list

## Tools Created

- `tools/runners/run-relate-test.js` — Round-trip API verification runner
- `scripts/examples/form/global/UnrelateForm.js` — Client-side unrelate + close script
- `tools/explore/specs/unrelate-discovery.spec.js` — URL param probe (5 variations tested)
- `tools/explore/specs/formviewer-js-discovery.spec.js` — Angular bundle JS source analysis

## Next Steps

1. Build event script approach for permission-independent unrelate (service account via `CallMicroservice`)
2. Test `unrelateFormByDocId` variant if needed
