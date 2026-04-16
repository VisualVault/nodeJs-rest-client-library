# FormViewer URL Parameters Reference

URL query parameters accepted by the VisualVault FormViewer Angular SPA (`/FormViewer/app?...`). Extracted from the production JS bundle (`main-es2015.*.js`) on Build 20260304.1.

Last verified: 2026-04-16

---

## Core Parameters

| Parameter | Type           | Required                    | Description                                            |
| --------- | -------------- | --------------------------- | ------------------------------------------------------ |
| `formid`  | GUID           | One of `formid` or `DataID` | Form template ID — opens a **new blank** form instance |
| `DataID`  | GUID           | One of `formid` or `DataID` | Revision ID — opens an **existing saved** form record  |
| `xcid`    | GUID or string | Yes                         | Customer alias (e.g., `EmanuelJofre`) or customer GUID |
| `xcdid`   | GUID or string | Yes                         | Database alias (e.g., `Main`) or database GUID         |

### Examples

```
# New blank form
/FormViewer/app?formid=6be0265c-...&xcid=EmanuelJofre&xcdid=Main

# Existing record
/FormViewer/app?DataID=901ce05d-...&xcid=EmanuelJofre&xcdid=Main
```

---

## Display & Navigation

| Parameter    | Values        | Default                | Description                                                                                            |
| ------------ | ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `hidemenu`   | `true`        | not set (menu visible) | Hides the VV navigation chrome. Standard for embedded/popup forms.                                     |
| `tab`        | tab name      | `Form_View`            | Opens a specific tab on load. See [Tab Values](#tab-values).                                           |
| `lang`       | locale string | `en-US`                | Form language override (e.g., `es-MX`, `pt-BR`). Falls back to user preference, then template default. |
| `PDF`        | `true`        | not set                | Enables PDF rendering mode.                                                                            |
| `isReadOnly` | `true`        | not set                | Forces the form into read-only mode regardless of user permissions.                                    |

### Tab Values

| `tab=`               | Opens                |
| -------------------- | -------------------- |
| `tabDocuments`       | Documents tab        |
| `tabProjects`        | Projects tab         |
| `tabForms`           | Related Forms tab    |
| `tabRevisions`       | Form Revisions tab   |
| `tabHistory`         | Form History tab     |
| `tabWorkflowHistory` | Workflow History tab |

---

## Relate on Create

Used by `VV.Form.Global.FillinAndRelateForm` to create a new child form and automatically relate it to a parent. The platform handles the relate operation server-side during form creation — no separate API call needed and no user-level API permissions required.

| Parameter    | Type   | Description                                                                                                                                                                                         |
| ------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RelateForm` | GUID   | Parent form's revision ID. Must be a valid GUID.                                                                                                                                                    |
| `IsRelate`   | `true` | Enables the relate-on-create behavior. Only the literal string `"true"` is checked (case-insensitive). Any other value (including `"false"`) is ignored — the form opens normally without relating. |

### How it works (from source)

```js
// Pseudocode from the minified Angular source:
if (
    !tabParams.parentFormId &&
    queryParams.RelateForm &&
    isGuid(queryParams.RelateForm) &&
    'true' == queryParams.IsRelate?.toLowerCase()
) {
    tabParams.relateFormDataInstances = true;
    tabParams.parentFormId = queryParams.RelateForm;
}
```

Both parameters are required. `RelateForm` alone without `IsRelate=true` has no effect.

### Relate is the only URL-based write operation

All other URL parameters (`hidemenu`, `tab`, `lang`, `PDF`, `isReadOnly`, etc.) are **display/navigation only** — they control presentation but do not mutate any data. `RelateForm` + `IsRelate=true` is the **only URL parameter combination that performs a write** (creating a form-to-form relationship).

### No URL-based unrelate

There is **no URL parameter for unrelating forms**. The following were tested and confirmed to have no effect:

- `IsRelate=false` — skips the relate logic entirely (no inverse behavior)
- `UnRelateForm={id}` — ignored by the SPA
- `IsUnrelate=true` — ignored by the SPA

Unrelating is only available via the REST API: `PUT /forminstance/{id}/unrelateForm?relateToId={targetId}`

---

## Field Pre-Population (FillinAndRelate)

Used internally by `FillinAndRelateForm` to pre-populate fields on the child form via a lookup mechanism. These are not typically set manually.

| Parameter        | Type   | Description                                                                                                   |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `lookupKey`      | string | FillinAndRelate lookup key. All three params (`lookupKey`, `lookupMappings`, `referFieldId`) must be present. |
| `lookupMappings` | GUID   | Source form ID for field mapping.                                                                             |
| `referFieldId`   | GUID   | Field ID that triggered the FillinAndRelate.                                                                  |
| `fillInKey`      | string | Fill-in info lookup key. Pre-populates fields **without** relating. Independent of the `lookupKey` triplet.   |

### URL built by FillinAndRelateForm

```
{baseUrl}form_details?formid={templateId}
    &RelateForm={parentFormDataID}
    &IsRelate=true
    &hidemenu=true
    &{encodedTargetFieldName1}={encodedSourceFieldValue1}
    &{encodedTargetFieldName2}={encodedSourceFieldValue2}
```

Note: `FillinAndRelateForm` uses the `/form_details` route (not `/FormViewer/app`), which redirects to the Angular SPA with the params intact. Field values are passed directly as URL params with encoded names and values.

---

## Verification Method

Parameters extracted by capturing all JS bundles loaded by `/FormViewer/app` and searching for `queryParams.*` property access patterns in the minified Angular source. URL construction patterns (`append("paramName", ...)`) were cross-referenced. Tested on vvdemo Build 20260304.1 with the EmanuelJofre/Main environment.

Source file: `main-es2015.37f6d018a9cad175a1e6.js` (7.4 MB)
