# VV Object — FormViewer Console API Reference

Runtime API exposed by the VisualVault FormViewer Angular application. Available in the browser DevTools console (or via Chrome extension) once a form is loaded. All properties and methods documented here were verified live on Build 20260304.1.

Last verified: 2026-03-31

---

## Top-Level: `VV`

The global `VV` object is the root namespace injected by FormViewer.

| Property                                            | Type       | Description                                                              |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `VV.CustomerAlias`                                  | `string`   | Account alias (e.g., `"EmanuelJofre"`)                                   |
| `VV.CustomerDatabaseAlias`                          | `string`   | Database alias (e.g., `"Main"`)                                          |
| `VV.BaseAppUrl`                                     | `string`   | Root URL with trailing slash (e.g., `"https://vvdemo.visualvault.com/"`) |
| `VV.BaseURL`                                        | `string`   | Full app URL including customer/db path                                  |
| `VV.UrlContentBase`                                 | `string`   | Content base URL (no trailing slash)                                     |
| `VV.Form`                                           | `object`   | Main form API — see below                                                |
| `VV.Toss`                                           | `object`   | Empty object (placeholder/reserved)                                      |
| `VV.OpenWindow(url, name, width, height, features)` | `function` | Opens a new browser window with specified dimensions                     |

---

## `VV.Form` — Public API

The primary developer interface. Contains both own properties (form state) and prototype methods (actions).

### State Properties

| Property                           | Type       | Description                                                                                                                                                                                              | Example                                  |
| ---------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `DataID`                           | `string`   | GUID identifying the form context. When opened via `?DataID=` URL, this is the saved record GUID. When opened from a template (`?formid=`), this is the template form ID and does NOT update after save. | `"2c2e9776-fecd-4c3e-8cc1-f0cfdec12d98"` |
| `DhDocID`                          | `string`   | Human-readable form instance name                                                                                                                                                                        | `"DateTest-000079"`                      |
| `IsFormSaved`                      | `boolean`  | `true` after a successful save                                                                                                                                                                           | `true`                                   |
| `UnsavedChanges`                   | `number`   | Count of unsaved field changes                                                                                                                                                                           | `0` after save, `21` before              |
| `FormSaved`                        | `string`   | Empty string observed; purpose unclear                                                                                                                                                                   | `""`                                     |
| `IsFormFillin`                     | `boolean`  | Whether the form is in fill-in mode                                                                                                                                                                      | `true`                                   |
| `IsFormTemplatePreview`            | `boolean`  | Whether viewing a template preview                                                                                                                                                                       | `false`                                  |
| `IsOfflineMode`                    | `boolean`  | Whether running in offline mode                                                                                                                                                                          | `false`                                  |
| `IsReadOnly`                       | `boolean`  | Whether the form is read-only                                                                                                                                                                            | `false`                                  |
| `CurrentPageId`                    | `string`   | GUID of the currently visible page                                                                                                                                                                       | `"cb339446-b869-..."`                    |
| `CurrentLanguageCode`              | `string`   | Active language                                                                                                                                                                                          | `"en-US"`                                |
| `FormLanguage`                     | `string`   | Configured form language (empty = default)                                                                                                                                                               | `""`                                     |
| `FormUserID`                       | `string`   | Email/username of the current user                                                                                                                                                                       | `"emanuel.jofre@onetree.com"`            |
| `FormUsID`                         | `string`   | GUID of the current user                                                                                                                                                                                 | `"54c4dd9c-5ec8-..."`                    |
| `FormUserSiteID`                   | `string`   | GUID of the user's site                                                                                                                                                                                  | `"fb726e8a-036c-..."`                    |
| `FormUserSiteName`                 | `string`   | Name of the user's site                                                                                                                                                                                  | `"Home"`                                 |
| `FormUserGroups`                   | `string[]` | Groups the current user belongs to                                                                                                                                                                       | `["VaultAccess", "VaultAdmins"]`         |
| `RefreshParentWindowWhenUnloading` | `boolean`  | Whether parent window refreshes on close                                                                                                                                                                 | `true`                                   |
| `SuppressExtraMessages`            | `boolean`  | Suppresses additional UI messages                                                                                                                                                                        | `false`                                  |
| `CalendarConditionalGroups`        | `array`    | Calendar conditional group definitions                                                                                                                                                                   | `[]`                                     |

### Sub-Objects on `VV.Form`

| Property               | Type               | Description                                                                                                                                                                                                                                         |
| ---------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VV`                   | Internal container | Holds `FormPartition`, `FormsDataService`, `currentUser`, `QueryService`, `OfflineStorageService`, `calendarValueService`, `messageService`, `signingService`                                                                                       |
| `Global`               | Script library     | User-defined global helper functions loaded from the form template's script library                                                                                                                                                                 |
| `Template`             | Template service   | Contains all user-defined template scripts (e.g., `FormValidation()`, `FillinAndRelate()`, `CallWS()`). Scripts are defined in the template's `ScriptLibrary` and accessible as `VV.Form.Template.<ScriptName>()`. Also has `ValidateFormUpload()`. |
| `messageService`       | Angular service    | Internal message bus for component communication                                                                                                                                                                                                    |
| `calendarValueService` | Angular service    | Calendar date processing; owns `useUpdatedCalendarValueLogic`, `getSaveValue()`, `parseDateString()`                                                                                                                                                |
| `signingService`       | Angular service    | Digital signature: `generateSignature()`, `updateSignature()`, `bufferToHexString()`                                                                                                                                                                |

### Prototype Methods (36 total)

#### Field Value Operations

| Method                                   | Params | Description                                                                                                                                                                                                                          |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GetFieldValue(fieldName)`               | 1      | Returns the processed field value. For calendar fields, applies `getCalendarFieldValue()` which may transform the raw value (Bug #5 adds fake Z for Config D). **For non-existent fields, returns `""` silently** (no error thrown). |
| `SetFieldValue(fieldName, value)`        | 2      | Sets a field value. For calendar fields, goes through `normalizeCalValue()` → `calChange()` → `getSaveValue()`. Triggers `UnsavedChanges` increment. **Silently fails for non-existent fields** (no error, value is discarded).      |
| `GetDateObjectFromCalendar(fieldName)`   | 1      | Returns a JavaScript `Date` object for a calendar field. Always returns local-timezone Date regardless of field config.                                                                                                              |
| `GetDropDownListItemValue(fieldName)`    | 1      | Returns the selected value of a dropdown field.                                                                                                                                                                                      |
| `getDropDownListText(fieldName)`         | 1      | Returns the display text of a dropdown field.                                                                                                                                                                                        |
| `SetDropDownListIndex(fieldName, index)` | 2      | Sets the selected index of a dropdown field.                                                                                                                                                                                         |
| `getFormDataCollection()`                | 0      | Returns an array of `{id, name, value}` objects for all fields — the full form data snapshot.                                                                                                                                        |
| `GetUnsavedFields()`                     | 0      | Returns an array of field names that have unsaved changes.                                                                                                                                                                           |

#### Field State

| Method                            | Params | Description                                                                                                                                                                      |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IsFieldReadOnly(fieldName)`      | 1      | Returns `boolean` — whether the field is currently read-only.                                                                                                                    |
| `isFieldAccessible(fieldName, ?)` | 2      | Checks if a field is accessible (not hidden by security). Note: requires internal `GroupConditionService` context; may error when called directly from console on saved records. |

#### Validation

| Method                                                    | Params | Description                                            |
| --------------------------------------------------------- | ------ | ------------------------------------------------------ |
| `SetValidationErrorOnField(fieldName, ?)`                 | 2      | Marks a field with a validation error indicator.       |
| `SetValidationErrorMessageOnField(fieldName, ?, message)` | 3      | Sets a custom validation error message on a field.     |
| `ClearValidationErrorOnField(fieldName, ?)`               | 2      | Clears the validation error from a field.              |
| `EvaluateGroupConditions(?)`                              | 1      | Re-evaluates conditional visibility/logic group rules. |

#### Save Operations

| Method              | Params | Description                                                                                                                       |
| ------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `DoPostbackSave(?)` | 1      | Triggers a form save. Checks `isReadOnly` first. For public forms calls `saveForm("submit")`, otherwise calls `saveForm("save")`. |
| `DoAjaxFormSave()`  | 0      | AJAX-based save (alternative to postback save).                                                                                   |
| `SavePdf(fileName)` | 1      | Triggers PDF generation with the given filename. Sends a `"savePdf"` message to the form partition.                               |

#### UI Control

| Method                                      | Params | Description                                    |
| ------------------------------------------- | ------ | ---------------------------------------------- |
| `ShowLoadingPanel(?)`                       | 1      | Shows a loading overlay on the form.           |
| `HideLoadingPanel(?)`                       | 1      | Hides the loading overlay.                     |
| `TurnOnLoadingMessage()`                    | 0      | Shows a loading indicator (non-panel version). |
| `ClearWait()`                               | 0      | Clears the loading/wait indicator.             |
| `ShowPopUp(url, name, w, h, ?, ?, ?, ?, ?)` | 9      | Opens a popup window within the form context.  |

#### Data Operations

| Method                                          | Params | Description                                                                                            |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `CreateFormInstance(templateName, fieldValues)` | 2      | Creates a new form instance via FormsAPI. See [CreateFormInstance details](#createforminstance) below. |
| `CreateFillInData(?, ?)`                        | 2      | Creates fill-in data for a form.                                                                       |
| `UpdateFormDataInstanceJson(?, ?, ?, ?, ?)`     | 5      | Updates form instance data via JSON.                                                                   |
| `CustomQuery(name, ?, ?, ?)`                    | 4      | Executes a custom query by name.                                                                       |
| `TemplateQuery(name, ?)`                        | 2      | Executes a template query.                                                                             |
| `DataLookup(?, ?, ?)`                           | 3      | Performs a data lookup operation.                                                                      |

#### Control Refresh

| Method                                   | Params | Description                              |
| ---------------------------------------- | ------ | ---------------------------------------- |
| `RefreshDataGridControl(fieldName)`      | 1      | Refreshes a data grid control.           |
| `RefreshDropDownListControl(fieldName)`  | 1      | Refreshes a dropdown list's data source. |
| `RefreshDocumentCount(fieldName)`        | 1      | Refreshes a document count display.      |
| `ReloadRepeatingRowControl(fieldName)`   | 1      | Reloads a repeating row control.         |
| `reloadControl(fieldName)`               | 1      | Generic control reload.                  |
| `populateCascadeDropDownList(fieldName)` | 1      | Populates a cascading dropdown.          |

#### Internal

| Method            | Params | Description                                              |
| ----------------- | ------ | -------------------------------------------------------- |
| `init()`          | 0      | Initializes the form API (called internally by Angular). |
| `setFormProps(?)` | 1      | Sets form properties from configuration.                 |

---

## `VV.Form.VV.FormPartition` — Internal State (59 own properties, 77 prototype methods)

The core state manager for the form instance. Not part of the public API, but accessible and essential for debugging and testing.

### Key Own Properties

| Property                | Type      | Description                                                     |
| ----------------------- | --------- | --------------------------------------------------------------- |
| `formId`                | `string`  | GUID of the form instance (same as `VV.Form.DataID` after save) |
| `formName`              | `string`  | Instance name (e.g., `"DateTest-000079"`)                       |
| `formNameRev`           | `string`  | Name with revision (e.g., `"DateTest-000079 Rev 1"`)            |
| `formRev`               | `number`  | Revision number                                                 |
| `uniqueId`              | `string`  | Unique partition identifier (used for message routing)          |
| `currentPageId`         | `string`  | Active page GUID                                                |
| `requestType`           | `string`  | `"details"` for saved record loads                              |
| `isPrimary`             | `boolean` | Whether this is the primary form partition                      |
| `isPublic`              | `boolean` | Whether the form is publicly accessible                         |
| `isReadOnly`            | `boolean` | Read-only state                                                 |
| `isPrintPreview`        | `boolean` | Print preview mode                                              |
| `showRev`               | `boolean` | Whether revision number is shown                                |
| `useLatestFormTemplate` | `boolean` | Whether to use the latest template version                      |
| `defaultRowsPerPage`    | `number`  | Default rows per page for grids (15)                            |
| `maxRowCount`           | `number`  | Maximum row count for grids (1000)                              |

### Field Data Properties

| Property            | Type     | Description                                                                                                                                                                                                |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fieldMaster`       | `object` | All field definitions keyed by field GUID. Each field has 65 properties including `name`, `fieldType`, `enableTime`, `ignoreTimezone`, `useLegacy`, `enableInitialValue`, `enableQListener`, `value`, etc. |
| `fieldNameIdObject` | `object` | Map of field name → field GUID (e.g., `{"Field7": "a5c96f2c-..."}`)                                                                                                                                        |
| `fieldArray`        | `array`  | Ordered array of all field definitions (28 entries)                                                                                                                                                        |
| `fieldObject`       | `object` | Observable field state (RxJS BehaviorSubject)                                                                                                                                                              |
| `valueObject`       | `object` | Observable value store (RxJS BehaviorSubject). Access raw values via `.source._value`                                                                                                                      |
| `changeValueArr`    | `array`  | Array of changed values since last save                                                                                                                                                                    |
| `changeValueObject` | `object` | Observable for change tracking                                                                                                                                                                             |
| `initialValueArr`   | `array`  | Fields with initial values (18 entries)                                                                                                                                                                    |
| `ignoreValueArr`    | `array`  | Fields to ignore during save                                                                                                                                                                               |

### Form Metadata Properties

| Property           | Type     | Description                                                                                                                                                                        |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formEntity`       | `object` | Full form template entity (61 properties) — includes `formTemplateId`, `formTemplateType`, `name`, `formPages`, `scriptAssignments`, `scriptLibrary`, `groups`, PDF settings, etc. |
| `docInfo`          | `object` | Document info (17 properties) — `docID`, `formID`, `chid`, `dhRev`, `createById`, `canUserEdit`, `isReleased`, `formTemplateName`, `latestDataID`, `latestTemplateId`, `wfid`      |
| `workflowData`     | `object` | Workflow state (10 properties) — `waid`, `wfid`, `workflowStatus`, `history`, `workflowType`                                                                                       |
| `modelInfo`        | `object` | RxJS BehaviorSubject for object model info                                                                                                                                         |
| `pageObj`          | `object` | Page definitions keyed by page GUID                                                                                                                                                |
| `containerListObj` | `object` | Container layout definitions                                                                                                                                                       |

### Service References

| Property                | Type    | Description                        |
| ----------------------- | ------- | ---------------------------------- |
| `calendarValueService`  | service | Calendar date processing service   |
| `messageService`        | service | Internal message bus               |
| `notificationService`   | service | User notifications                 |
| `offlineStorageService` | service | IndexedDB/offline storage          |
| `queryService`          | service | Query execution service            |
| `formInstanceRepo`      | service | Form instance persistence          |
| `formRepo`              | service | Form data repository (14 keys)     |
| `formTemplateRepo`      | service | Form template repository           |
| `formTemplateService`   | service | Template loading/management        |
| `storageService`        | service | Generic storage service            |
| `scriptSrv`             | service | Script execution service (16 keys) |
| `parentSvc`             | service | Parent/container service (49 keys) |
| `titleService`          | service | Page title management              |
| `injector`              | Angular | Angular dependency injector        |
| `translate`             | service | i18n translation service           |

### Key Prototype Methods (77 total)

#### Getters

| Method                  | Returns   | Description                                  |
| ----------------------- | --------- | -------------------------------------------- |
| `getFormId()`           | `string`  | Form instance GUID                           |
| `getFormName()`         | `string`  | Instance name                                |
| `getFormNameRev()`      | `string`  | Name + revision                              |
| `getFormRev()`          | `number`  | Revision number                              |
| `getFormTemplateId()`   | `string`  | Template GUID                                |
| `getRequestType()`      | `string`  | Request type (`"details"` for saved records) |
| `getModelId()`          | `string`  | Object model ID (empty if not Object View)   |
| `getObjectId()`         | `string`  | Object ID (empty if not Object View)         |
| `getObjectInfo()`       | `object`  | Object View info                             |
| `isObjectView()`        | `boolean` | Whether form is in Object View mode          |
| `isObjectInfoDefined()` | `boolean` | Whether object info is set                   |
| `isValidForm()`         | `boolean` | Whether form passes validation               |
| `countUnsavedChanges()` | `number`  | Count of unsaved changes                     |
| `getDocInfo()`          | `object`  | Document metadata                            |
| `getWorkflow()`         | `object`  | Workflow state                               |
| `getWorkflowTemplate()` | `array`   | Workflow template data                       |
| `getWizardStep()`       | `object`  | Current wizard step state                    |
| `getWizardStepValue()`  | `*`       | Current wizard step value                    |
| `getValidationObject()` | `object`  | Validation state                             |

#### Field Access

| Method                           | Returns   | Description                                                                                                                                               |
| -------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getValueObjectValue(fieldName)` | `*`       | Raw stored value for a field — the most direct read, no transformation. This is the source of truth for what the form actually stores.                    |
| `getFieldObjectValue(fieldName)` | `*`       | Field object value (may differ from value object)                                                                                                         |
| `getFieldIdByName(fieldName)`    | `string`  | GUID for a field name                                                                                                                                     |
| `fieldExists(fieldName)`         | `boolean` | Whether a field exists. Note: returned `false` for existing fields on saved records in testing — may check a different registry than `fieldNameIdObject`. |
| `getFieldObject(fieldName)`      | `object`  | Full field state object                                                                                                                                   |
| `getFieldArray()`                | `array`   | All field definitions                                                                                                                                     |
| `filterFieldArray(?)`            | `array`   | Filtered field definitions                                                                                                                                |
| `getValueObject()`               | `object`  | RxJS BehaviorSubject wrapping all field values. Raw values at `.source._value`                                                                            |
| `getValueArray()`                | `array`   | All values as array                                                                                                                                       |

#### Setters

| Method                                  | Description                   |
| --------------------------------------- | ----------------------------- |
| `setFieldObject(fieldName, value)`      | Sets a field object           |
| `setFieldObjectValue(fieldName, value)` | Sets a field object value     |
| `setFieldIdByName(fieldName, id)`       | Maps a field name to GUID     |
| `setFieldArray(array)`                  | Sets the field array          |
| `setFieldReady(fieldName, ?)`           | Marks a field as ready        |
| `setFormId(id)`                         | Sets the form instance GUID   |
| `setFormName(name)`                     | Sets the form name            |
| `setFormRev(rev)`                       | Sets the revision number      |
| `setFormTemplateId(id)`                 | Sets the template GUID        |
| `setFormEntity(entity)`                 | Sets the form entity object   |
| `setDocInfo(info)`                      | Sets document info            |
| `setObjectInfo(info)`                   | Sets Object View info         |
| `setPageObject(obj)`                    | Sets page definitions         |
| `setValueObject(obj)`                   | Sets the value store          |
| `setValidationObject(obj)`              | Sets validation state         |
| `setWizardStep(step)`                   | Sets wizard step              |
| `setWorkflow(data)`                     | Sets workflow state           |
| `setWorkflowTemplate(data)`             | Sets workflow template        |
| `setChangeValueArr(arr)`                | Sets the changed values array |

#### Operations

| Method                   | Description                                 |
| ------------------------ | ------------------------------------------- |
| `saveForm(mode)`         | Triggers form save (`"save"` or `"submit"`) |
| `checkValidation()`      | Runs form validation                        |
| `validateInputType(?)`   | Validates a specific input type             |
| `updateChangedValues(?)` | Updates the change tracking array           |
| `updateProperties(?)`    | Updates form properties                     |
| `storageListener(?)`     | Handles storage events                      |
| `requestContextMenu(?)`  | Requests a context menu                     |
| `requestDocInfo(?)`      | Requests document info refresh              |

---

## `VV.Form.calendarValueService` — Calendar Date Processing

Controls the V1/V2 code path switch and provides shared date functions.

| Property/Method                                             | Type       | Description                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useUpdatedCalendarValueLogic`                              | `boolean`  | `false` = V1 (default), `true` = V2. Set by server flag, `?ObjectID=` URL param, or non-empty `modelId`. Affects all calendar fields globally.                                                                                                                                                                                              |
| `getSaveValue(date, enableTime, ignoreTimezone, useLegacy)` | `function` | Converts a Date object to storage format string. Strips Z suffix. Produces `"yyyy-MM-dd"` for date-only or `"yyyy-MM-ddTHH:mm:ss"` for DateTime. **Empirically verified**: produces identical output for `ignoreTZ=true` and `ignoreTZ=false` given the same Date object — the flag affects display only, not storage (DB dump 2026-04-06). |
| `parseDateString(value, enableTime, ignoreTimezone)`        | `function` | Parses a date string during form load. In V1, strips Z and re-parses as local time (Bug #1).                                                                                                                                                                                                                                                |

---

## `VV.Form.Global` — Script Library Functions

User-defined helper functions loaded from the form template's `scriptLibrary` config. These are NOT platform methods — they are customer/template-specific. The DateTest template includes:

| Function                                                           | Params | Description                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Save()`                                                           | 0      | Custom save handler                                                                                                                                                                                                       |
| `DebouncedSave()`                                                  | 0      | Debounced save wrapper (calls `window.debouncedSave()`)                                                                                                                                                                   |
| `CallMicroservice(name, data)`                                     | 2      | Calls a VV microservice endpoint via REST API. Constructs URL from `VV.BaseAppUrl` + customer/db aliases.                                                                                                                 |
| `CallWS()`                                                         | 0      | Web service call helper                                                                                                                                                                                                   |
| `CentralValidation(value, type)`                                   | 2      | Validates field value format/type                                                                                                                                                                                         |
| `CentralDateValidation(value, type, compValue, compUnit, compQty)` | 5      | Date-specific validation with comparison logic. `type`: `"DateBefore"`, `"DateAfter"`. `compUnit`: `"D"` (days). `compQty`: minimum difference (e.g., `1` = at least 1 day apart). Returns `true` if the condition holds. |
| `BuildUrls(data, htmlLinks, readOnly)`                             | 3      | Builds form record URLs from identifiers                                                                                                                                                                                  |
| `Age(value)`                                                       | 1      | Calculates age from a date value                                                                                                                                                                                          |
| `Await(fn)`                                                        | 1      | Promise wrapper — calls `fn()` and logs result                                                                                                                                                                            |
| `retry(fn, maxAttempts=3)`                                         | 1      | Retries an async function with configurable max attempts                                                                                                                                                                  |
| `timeout(?, ?)`                                                    | 2      | Timeout wrapper                                                                                                                                                                                                           |
| `Debounce(fn, delay)`                                              | 2      | Debounce utility                                                                                                                                                                                                          |
| `DisplayMessaging(?, ?)`                                           | 2      | Shows a user-facing message                                                                                                                                                                                               |
| `DisplayConfirmMessaging(message, title, okFn, cancelFn)`          | 4      | Shows a confirmation dialog with OK/Cancel callbacks                                                                                                                                                                      |
| `CloseAndUnlockForm(skipRefresh?)`                                 | 0–1    | Closes the form and unlocks it. Pass `'Yes'` to skip parent window refresh.                                                                                                                                               |
| `MessageModal(... 11 params)`                                      | 11     | Full-featured modal dialog                                                                                                                                                                                                |
| `EvaluateGroupsandConditions(?)`                                   | 1      | Re-evaluates group conditions                                                                                                                                                                                             |
| `FillinAndRelateForm(?, ?, ?)`                                     | 3      | Creates and relates a fill-in form                                                                                                                                                                                        |
| `FormatPhone(value)`                                               | 1      | Formats a phone number                                                                                                                                                                                                    |
| `RadioButtons(?)`                                                  | 1      | Radio button helper                                                                                                                                                                                                       |
| `GetSelectRows(?)`                                                 | 1      | Gets selected rows from a grid                                                                                                                                                                                            |
| `LoadBootstrapCSS()`                                               | 0      | Loads Bootstrap CSS into the form                                                                                                                                                                                         |
| `LoadModalSettings()`                                              | 0      | Loads modal dialog settings                                                                                                                                                                                               |
| `SetupReg()`                                                       | 0      | Setup/registration helper                                                                                                                                                                                                 |

---

## `VV.Form.VV.currentUser` — Current User Context

| Property                 | Type      | Description                                                         |
| ------------------------ | --------- | ------------------------------------------------------------------- |
| `Id` / `UsId`            | `string`  | User GUID                                                           |
| `Username`               | `string`  | Username (may be empty on saved record loads)                       |
| `UserId`                 | `string`  | User ID string (may be empty)                                       |
| `ApiUrl`                 | `string`  | REST API base URL (e.g., `"https://vvdemo.visualvault.com/api/v1"`) |
| `CustomerAlias`          | `string`  | Customer alias                                                      |
| `DatabaseAlias`          | `string`  | Database alias                                                      |
| `Xcid`                   | `string`  | Customer GUID (used in URLs)                                        |
| `Xcdid`                  | `string`  | Database GUID (used in URLs)                                        |
| `Groups`                 | `array`   | User's group memberships                                            |
| `IsValid`                | `boolean` | Whether the user session is valid                                   |
| `AccessToken`            | `string`  | OAuth access token (sensitive)                                      |
| `SessionTimeoutDate`     | `string`  | Session expiry timestamp                                            |
| `SessionWarningMinutes`  | `string`  | Minutes before timeout warning                                      |
| `SessionLastRenewAction` | `string`  | Last session renewal timestamp                                      |
| `HomeFolderName`         | `string`  | User's home folder name                                             |
| `HomeFolderPath`         | `string`  | User's home folder path                                             |
| `AuthenticationUserId`   | `string`  | Authentication user identifier                                      |

---

## `VV.Form.VV.FormsDataService` — Data Service Layer (34 prototype methods)

Internal service for data operations. Key methods:

| Method                     | Description                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `getFormPartition()`       | Returns the FormPartition instance                                                 |
| `setFormPartition(fp)`     | Sets the FormPartition                                                             |
| `getUserInfo()`            | Returns user info                                                                  |
| `setUserInfo(info)`        | Sets user info (this is where `useUpdatedCalendarValueLogic` gets set from server) |
| `getUserById(id)`          | Fetches user by GUID                                                               |
| `getProfileData()`         | Returns user profile data                                                          |
| `getProfileSignature()`    | Returns profile signature                                                          |
| `getGroupsArray()`         | Returns groups                                                                     |
| `getUsersArray()`          | Returns users                                                                      |
| `getRouteParams()`         | Returns Angular route params                                                       |
| `getQueryParams()`         | Returns URL query params                                                           |
| `processUrl(url)`          | Processes/resolves a URL                                                           |
| `processQueryParam(param)` | Processes a query parameter                                                        |
| `blendField(?)`            | Blends/merges field data                                                           |
| `dataWorker_calcSum(?)`    | Calculates sum for data worker                                                     |
| `getFormNameRev()`         | Returns form name + revision                                                       |
| `getDefaultRows()`         | Returns default row count                                                          |
| `getMaxRows()`             | Returns max row count                                                              |
| `requestMenu(?)`           | Requests context menu                                                              |
| `setDefaultFields(?)`      | Sets default field values                                                          |
| `getContextMenu(?)`        | Gets context menu data                                                             |
| `updateZIndexByPage(?)`    | Updates z-index ordering                                                           |

---

## `VV.Form.VV.FormPartition.docInfo` — Document Metadata

| Property           | Type      | Description                                            |
| ------------------ | --------- | ------------------------------------------------------ |
| `docID`            | `string`  | Human-readable document ID (e.g., `"DateTest-000079"`) |
| `formID`           | `string`  | Form instance GUID                                     |
| `chid`             | `string`  | Change history GUID                                    |
| `dhRev`            | `number`  | Document history revision                              |
| `createById`       | `string`  | Creator user GUID                                      |
| `canUserEdit`      | `boolean` | Whether current user can edit                          |
| `isReleased`       | `string`  | Release status (`"Y"` / `"N"`)                         |
| `isClosed`         | `string`  | Closed status                                          |
| `isError`          | `boolean` | Error state                                            |
| `isFormTemplate`   | `boolean` | Whether this is a template (not instance)              |
| `formTemplateID`   | `string`  | Source template GUID                                   |
| `formTemplateName` | `string`  | Source template name (e.g., `"DateTest"`)              |
| `latestDataID`     | `string`  | Latest data revision GUID                              |
| `latestTemplateId` | `string`  | Latest template revision GUID                          |
| `lockLimit`        | `number`  | Concurrent edit lock limit                             |
| `nextDocID`        | `string`  | Next auto-generated document ID                        |
| `wfid`             | `string`  | Associated workflow GUID (zeros if none)               |

---

## `VV.Form.VV.FormPartition.fieldMaster[guid]` — Field Definition (65 properties per field)

Each field in `fieldMaster` is keyed by its GUID and contains the full field configuration. Key properties for calendar fields:

| Property                | Type      | Description                                            |
| ----------------------- | --------- | ------------------------------------------------------ |
| `name`                  | `string`  | Field name (e.g., `"Field7"`)                          |
| `id`                    | `string`  | Field GUID                                             |
| `fieldType`             | `number`  | Field type enum. `13` = Calendar                       |
| `enableTime`            | `boolean` | Whether time component is enabled                      |
| `ignoreTimezone`        | `boolean` | Whether to ignore timezone in storage                  |
| `useLegacy`             | `boolean` | Whether to use legacy date handling                    |
| `enableInitialValue`    | `boolean` | Whether field has an initial value configured          |
| `enableQListener`       | `boolean` | Whether field listens to URL query parameters          |
| `initialValueMode`      | `number`  | Initial value mode (0 = none, others = preset/current) |
| `initialDate`           | `string`  | Initial date value (ISO format)                        |
| `defaultValue`          | `*`       | Default value (null if none)                           |
| `value`                 | `*`       | Current field value                                    |
| `pageId`                | `string`  | Page GUID the field belongs to                         |
| `containerId`           | `string`  | Container GUID                                         |
| `validationType`        | `number`  | Validation type enum                                   |
| `renderAsReadOnly`      | `boolean` | Whether field renders as read-only                     |
| `isRetired`             | `boolean` | Whether field is retired                               |
| `isDataReportingColumn` | `boolean` | Whether included in data reporting                     |
| `isPrintableField`      | `boolean` | Whether included in print                              |
| `tabOrder`              | `number`  | Tab order index                                        |
| `width`                 | `number`  | Field width in pixels                                  |
| `layoutLeft`            | `number`  | Left position in pixels                                |
| `layoutTop`             | `number`  | Top position in pixels                                 |
| `zOrder`                | `number`  | Z-index for layering                                   |
| `text`                  | `string`  | Field label text                                       |
| `placeholder`           | `string`  | Placeholder text                                       |
| `mask`                  | `string`  | Input mask                                             |
| `formVersion`           | `number`  | Form version                                           |
| `version`               | `string`  | Field version                                          |

---

## Other Services

### `VV.Form.messageService` — Internal Message Bus

| Method              | Description                                                                        |
| ------------------- | ---------------------------------------------------------------------------------- |
| `sendMessage(msg)`  | Sends a message to form components. Message shape: `{sender, var, uniqueId, data}` |
| `getMessage()`      | Returns the message observable                                                     |
| `clearMessage()`    | Clears the current message                                                         |
| `getMessageLog()`   | Returns the message log                                                            |
| `clearMessageLog()` | Clears the message log                                                             |

### `VV.Form.VV.QueryService` — Query Execution

| Method                     | Description                         |
| -------------------------- | ----------------------------------- |
| `getQueryDataByName(name)` | Executes a query by name            |
| `getQueryDataById(id)`     | Executes a query by GUID            |
| `getTemplateQuery(name)`   | Gets a template query definition    |
| `getFieldValue(fieldName)` | Gets a field value (query context)  |
| `filterData(?)`            | Filters query result data           |
| `mapFilteredData(?)`       | Maps filtered data to output format |

### `VV.Form.signingService` — Digital Signatures

| Method                | Description                     |
| --------------------- | ------------------------------- |
| `generateSignature()` | Generates a digital signature   |
| `updateSignature()`   | Updates an existing signature   |
| `bufferToHexString()` | Converts a buffer to hex string |

---

## Common Automation Patterns

### Check if form has been saved

```javascript
VV.Form.IsFormSaved; // boolean
VV.Form.UnsavedChanges; // 0 = no pending changes
```

### Get the DataID for constructing reload URLs

```javascript
VV.Form.DataID; // GUID of the current form record
```

**Before save** (template form): `VV.Form.DataID` is pre-populated with the **form template GUID** (the `formid=` URL param), not empty. Do not use `DataID.length > 0` to detect a successful save — check that the value **changed** from its pre-save value.

**After save**: `VV.Form.DataID` updates to the saved record's DataID (a different GUID). Confirmed on Build 20260304.1 — template formid `6be0265c-...` → after save, DataID `c63dea33-...` (DateTest-000107). The page URL does NOT update with the new DataID (known VV behavior), but the JS property is reliable.

### Construct a saved record URL

```javascript
`${VV.BaseAppUrl}FormViewer/app?DataID=${VV.Form.DataID}&hidemenu=true&rOpener=1&xcid=${VV.Form.VV.currentUser.Xcid}&xcdid=${VV.Form.VV.currentUser.Xcdid}`;
```

### CreateFormInstance

Creates a new form record via the FormsAPI (separate service from the core REST API).

```javascript
// Client-side (browser)
const result = await VV.Form.CreateFormInstance('TemplateName', {
    Field5: '2026-03-15T14:30:00',
    Field7: '2026-03-15',
});
// result: { formId: "<DataID GUID>", name: "TemplateName-001234", confirmationPage: null }
```

**Actual FormsAPI request** (captured via network intercept):

```
POST https://preformsapi.visualvault.com/api/v1/FormInstance
Content-Type: application/json
Authorization: <JWT token>

{
    "formTemplateId": "<revision ID — NOT template ID or definition GUID>",
    "formName": "",
    "fields": [
        { "key": "Field5", "value": "2026-03-15T14:30:00" },
        { "key": "Field7", "value": "2026-03-15" }
    ]
}

→ { data: { formId: "<DataID>", name: "TemplateName-001234", confirmationPage: null }, meta: { status: 201 } }
```

**Important:** The FormsAPI's `FormInstance/Controls` endpoint returns field values in US format (`"03/15/2026 14:30:00"`) for records created via `forminstance/`, vs ISO+Z (`"2026-03-15T14:30:00Z"`) for records created via `postForms`. The actual SQL `datetime` value is identical regardless of write endpoint — the format difference is in the API response serialization. This affects how `initCalendarValueV1` parses the value on form load. See [CB-29](../../tasks/date-handling/web-services/analysis/overview.md) and [architecture](../architecture/visualvault-platform.md#serialization-format-difference-cb-29).

### FormInstance Save API

The FormViewer uses a separate API domain (FormsAPI) for form instance persistence. See [FormsAPI Service](../architecture/visualvault-platform.md#formsapi-service) for the full endpoint catalog.

**Forms UI save payload** (captured via Playwright network intercept, 2026-04-06):

- Uses **field GUIDs** as keys (not field names like `"Field5"`) — the same GUIDs from `VV.Form.VV.FormPartition.fieldMaster`
- User-set DateTime fields (via `SetFieldValue` or picker) send values **without Z**: `"2026-03-15T14:30:00"`
- Preset/initial-value fields send values **with Z**: `"2026-03-01T03:00:00.000Z"` (from `toISOString()`)
- Date-only fields send date portion only: `"2026-03-15"`
- All fields in the form are included in the POST body, not just modified ones

```
POST https://preformsapi.visualvault.com/api/v1/FormInstance
→ {data: {formId: "<DataID>", name: "...", confirmationPage: null}, meta: {status: 201}}

POST https://preformsapi.visualvault.com/api/v1/FormInstance/lock
→ {data: {id: "<DataID>"}, meta: {status: 200}}

GET https://preformsapi.visualvault.com/api/v1/FormInstance/Controls/<DataID>?revisionType=1
→ Saved field values in raw storage format (key=field GUID, value=stored string)

PUT https://vvdemo.visualvault.com/api/v1/{CustomerAlias}/{DatabaseAlias}/formentity/{formTemplateId}/evaluateGroupsAndConditions
→ Re-evaluates field visibility/readonly conditions after save
```

### Read all raw field values at once

```javascript
VV.Form.VV.FormPartition.getValueObject().source._value;
```

### Find calendar fields by config flags

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter((f) => f.fieldType === 13 && f.enableTime === true && f.ignoreTimezone === false)
    .map((f) => f.name);
```

### Detect V1 vs V2 code path

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic; // false=V1, true=V2
```

### Trigger a save programmatically

```javascript
VV.Form.DoPostbackSave(); // Standard save
// or
VV.Form.Global.Save(); // Custom save handler (if defined in template script library)
```

### Get current user API context

```javascript
VV.Form.VV.currentUser.ApiUrl; // "https://vvdemo.visualvault.com/api/v1"
VV.Form.VV.currentUser.CustomerAlias; // "EmanuelJofre"
VV.Form.VV.currentUser.DatabaseAlias; // "Main"
VV.Form.VV.currentUser.AccessToken; // OAuth token (sensitive)
```

---

## Script Event Types

Form template scripts are bound to controls via `ScriptAssignment` entries. Each assignment specifies an `EventId`:

| EventId | Event    | Handler Signature                    | Notes                                                                          |
| ------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| `1`     | onChange | `event, control`                     | Dropdown selection change, checkbox toggle                                     |
| `3`     | onBlur   | `calendarObject` or `event, control` | Calendar fields receive `calendarObject`; text fields receive `event, control` |
| `4`     | onClick  | `event, control`                     | Button click                                                                   |
| `15`    | (form)   | —                                    | Form-level event on built-in controls                                          |

These IDs appear in template XML exports (`<EventId>`) and in the runtime `scriptAssignments` array on `formEntity`.
