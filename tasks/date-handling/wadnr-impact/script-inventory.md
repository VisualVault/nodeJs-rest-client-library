# WADNR Script Inventory — Date Field Interactions

Automated analysis of inline form scripts across all WADNR form templates,
identifying interactions with calendar fields and exposure to date handling bugs.

Generated: 2026-04-08 | Source: 77 templates parsed

> **Scope**: Template scripts only. `VV.Form.Global.*` implementations are site-level
> and not included in template XML — calls to Global functions are flagged for separate review.

---

## Executive Summary

| Metric                                          | Count |
| ----------------------------------------------- | ----: |
| Total templates parsed                          |    77 |
| Templates with calendar fields                  |    35 |
| Total calendar fields                           |   137 |
| Total scripts extracted                         |  3560 |
| Scripts with calendar field interactions        |    49 |
| Scripts with Config D interactions              |    11 |
| **Scripts with calendar round-trips (GFV→SFV)** | **1** |

## High-Risk Scripts — Calendar Field Round-Trips

Scripts where the same calendar field is read with `GetFieldValue` and written back
with `SetFieldValue`. Each round-trip on a Config D field triggers [FORM-BUG-5](../analysis/temporal-models.md)
drift (±TZ offset per cycle).

| Template           | Script      | Field              | Config | Trigger                                       |
| :----------------- | :---------- | :----------------- | :----: | :-------------------------------------------- |
| Communications-Log | Form_onLoad | Communication Date |   C    | 00000001-0000-0000-0000-e0000000f010:event-10 |

## Calendar Field Interactions

Every script that reads or writes a calendar field via `GetFieldValue`/`SetFieldValue`.

| Template                                     | Script                                 | Field                             | Config | Operation                  | Round-Trip? |
| :------------------------------------------- | :------------------------------------- | :-------------------------------- | :----: | :------------------------- | :---------: |
| Application-Review-Page                      | AutopopulateAPR                        | FPAN Date of Receipt              |   B    | SetFieldValue              |             |
| Application-Review-Page                      | AutopopulateAPR                        | FPAN Renewal Date of Receipt      |   B    | SetFieldValue              |             |
| Application-Review-Page                      | AutopopulateAPR                        | LTA Date of Receipt               |   B    | SetFieldValue              |             |
| Application-Review-Page                      | generateSectionDataTribal              | Date Tribal Notification Sent     |   B    | GetFieldValue              |             |
| Application-Review-Page                      | generateSectionDataTribal              | Tribal Meeting Request Received   |   B    | GetFieldValue              |             |
| Application-Review-Page                      | generateSectionDataTribal              | Tribal Meeting Occurred           |   B    | GetFieldValue              |             |
| Application-Review-Page                      | generateSectionDataDAHP                | DAHP Conflict Inquiry Sent        |   B    | GetFieldValue              |             |
| Application-Review-Page                      | generateSectionDataDAHP                | DAHP Response Received            |   B    | GetFieldValue              |             |
| Application-Review-Page                      | CreateNewRenewal                       | FPAN Decision Expiration Date     |   B    | GetFieldValue              |             |
| Application-Review-Page                      | createScienceTeamRecord                | LEG Notification Sent             |   B    | GetFieldValue              |             |
| Application-Review-Page                      | createScienceTeamRecord                | LEG Report Received               |   B    | GetFieldValue              |             |
| Application-Review-Page                      | FPAN_Date_of_Receipt_onBlur            | FPAN Date of Receipt              |   B    | GetFieldValue              |             |
| Application-Review-Page                      | FPAN_Date_of_Receipt_onBlur            | Old FPAN Date of Receipt          |   B    | GetFieldValue              |             |
| Application-Review-Page                      | WDFW_Due_Date_onBlur                   | WDFW Due Date                     |   B    | GetFieldValue              |             |
| Application-Review-Page                      | Form_onLoad                            | FPAN Date of Receipt              |   B    | GetFieldValue              |             |
| Application-Review-Page                      | Form_onLoad                            | LTA Date of Receipt               |   B    | GetFieldValue              |             |
| Application-Review-Page                      | Form_onLoad                            | FPAN Renewal Date of Receipt      |   B    | GetFieldValue              |             |
| Application-Review-Page                      | Form_onLoad                            | Old FPAN Date of Receipt          |   B    | SetFieldValue              |             |
| Application-Review-Page                      | Form_onLoad                            | Old LTA Date of Receipt           |   B    | SetFieldValue              |             |
| Application-Review-Page                      | Form_onLoad                            | Old FPAN Renewal Date of Receipt  |   B    | SetFieldValue              |             |
| Application-Review-Page                      | WDFW_Response_Date_onBlur              | WDFW Response Date                |   B    | GetFieldValue              |             |
| Application-Review-Page                      | LTA_Date_of_Receipt_onBlur             | LTA Date of Receipt               |   B    | GetFieldValue              |             |
| Application-Review-Page                      | LTA_Date_of_Receipt_onBlur             | Old LTA Date of Receipt           |   B    | GetFieldValue              |             |
| Application-Review-Page                      | FPAN_Renewal_Date_of_Receipt_onBlur    | FPAN Renewal Date of Receipt      |   B    | GetFieldValue              |             |
| Application-Review-Page                      | FPAN_Renewal_Date_of_Receipt_onBlur    | Old FPAN Renewal Date of Receipt  |   B    | GetFieldValue              |             |
| Communications-Log                           | Form_onLoad                            | Communication Date                |   C    | GetFieldValue              |   **YES**   |
| Communications-Log                           | Form_onLoad                            | Communication Date                |   C    | SetFieldValue (round-trip) |   **YES**   |
| Fee                                          | Start_Date_onBlur                      | Start Date                        |   B    | GetFieldValue              |             |
| Fee                                          | Start_Date_onBlur                      | Next Due Date                     |   B    | SetFieldValue              |             |
| Fee-Lookup                                   | FormValidation                         | Effective Date                    |   B    | GetFieldValue              |             |
| Fee-Lookup                                   | FormValidation                         | End Date                          |   B    | GetFieldValue              |             |
| Forest-Practices-Aerial-Chemical-Application | SetFPANNumber                          | Received Date                     | **D**  | SetFieldValue              |             |
| Forest-Practices-Aerial-Chemical-Application | CreateApplicationReviewPage            | Received Date                     | **D**  | SetFieldValue              |             |
| Forest-Practices-Aerial-Chemical-Application | Status_onChange                        | Aerial Chemical Status Updated At |   B    | SetFieldValue              |             |
| Forest-Practices-Application-Notification    | ValidateAndProceed                     | Date of Receipt                   | **D**  | GetFieldValue              |             |
| Forest-Practices-Application-Notification    | SetFPANNumber                          | Date of Receipt                   | **D**  | SetFieldValue              |             |
| Forest-Practices-Application-Notification    | SubmitForm                             | Date of Receipt                   | **D**  | SetFieldValue              |             |
| Forest-Practices-Application-Notification    | SetSubmittedDate                       | Created Date                      |   B    | SetFieldValue              |             |
| Forest-Practices-Application-Notification    | SetSubmittedDate                       | Submitted Date                    |   B    | SetFieldValue              |             |
| Forest-Practices-Application-Notification    | Status_onChange                        | FPAN Status Updated At            |   B    | SetFieldValue              |             |
| FPAN-Amendment-Request                       | Amendment_Status_onChange              | Amendment Status Updated At       |   B    | SetFieldValue              |             |
| FPAN-Amendment-Request                       | Amendment_Status_onChange              | Effective Date                    |   A    | SetFieldValue              |             |
| FPAN-Notice-of-Decision                      | PopulateARPData                        | Expiration Date                   |   B    | SetFieldValue              |             |
| FPAN-Notice-of-Decision                      | PopulateARPData                        | Effective Date                    |   B    | SetFieldValue              |             |
| FPAN-Notice-of-Transfer                      | Submit5DayLTA                          | Date of Receipt                   |   A    | SetFieldValue              |             |
| FPAN-Notice-of-Transfer                      | Status_onChange                        | Effective Date                    |   B    | GetFieldValue              |             |
| FPAN-Notice-of-Transfer                      | Effective_Date_onBlur                  | Effective Date                    |   B    | GetFieldValue              |             |
| FPAN-Notice-of-Transfer                      | Notice_of_Transfer_Status_onChange     | Effective Date                    |   B    | GetFieldValue              |             |
| FPAN-Record-Change-Request                   | SubmitForm                             | Effective Date                    |   B    | SetFieldValue              |             |
| FPAN-Renewal                                 | AutopopulateRenewal                    | Expiration Date Of Approved FPAN  |   B    | SetFieldValue              |             |
| FPAN-Renewal                                 | SubmitRenewal                          | Date of Receipt                   | **D**  | SetFieldValue              |             |
| FPAN-Renewal                                 | ValidateAndProceed                     | Date of Receipt                   | **D**  | GetFieldValue              |             |
| FPAN-Renewal                                 | Status_onChange                        | Renewal Status Updated At         |   B    | SetFieldValue              |             |
| Informal-Conference-Note                     | Submit                                 | Submitted Date                    |   B    | SetFieldValue              |             |
| Long-Term-Application-5-Day-Notice           | ReSubmitForm                           | LTA 5-Day Status Updated At       |   B    | SetFieldValue              |             |
| Long-Term-Application-5-Day-Notice           | SetSubmittedDate                       | Created Date                      |   B    | SetFieldValue              |             |
| Long-Term-Application-5-Day-Notice           | Status_Change_onChange                 | LTA 5-Day Status Updated At       |   B    | SetFieldValue              |             |
| Long-Term-Application-5-Day-Notice           | Status_Change_onChange                 | Effective Date                    |   B    | SetFieldValue              |             |
| Notice-of-Conversion-to-Non-Forestry-Use     | Submit                                 | Submitted Date                    |   B    | SetFieldValue              |             |
| Notice-to-Comply                             | Submit                                 | Submitted Date                    |   B    | SetFieldValue              |             |
| Payment-Item                                 | FormValidation                         | Date of Original Transaction      |   B    | GetFieldValue              |             |
| Payment-Item                                 | FormValidation                         | Date of Transaction               |   B    | GetFieldValue              |             |
| PDF-Package-Generation                       | CreateQueueForPrinting                 | Date Print Queued                 |   B    | SetFieldValue              |             |
| Shopping-Cart                                | FormValidation                         | Payment Date                      |   B    | GetFieldValue              |             |
| Step-1-Long-Term-FPA                         | ValidateAndProceed                     | Date of Receipt                   | **D**  | GetFieldValue              |             |
| Step-1-Long-Term-FPA                         | SubmitForm                             | Date of Receipt                   | **D**  | SetFieldValue              |             |
| Step-1-Long-Term-FPA                         | Status_onChange                        | LTA Step1 Status Updated At       |   B    | SetFieldValue              |             |
| Task                                         | CompleteForm                           | Date Completed                    | **D**  | SetFieldValue              |             |
| Task                                         | SaveForm                               | Date Created                      | **D**  | SetFieldValue              |             |
| WTM-Review-Page                              | SubmitDecision                         | Date DNR Decision                 |   B    | SetFieldValue              |             |
| WTM-Review-Page                              | btnSendNotificationToReviewers_onClick | Comment Due Date                  |   B    | GetFieldValue              |             |

## Web Service Calls

Server-side web services invoked from form scripts. These execute on the Node.js
microservice server and may also read/write date fields via the VV REST API.
Server-side code is not available in this repo — flagged for separate review.

| Web Service           | Template          | Called From            |
| :-------------------- | :---------------- | :--------------------- |
| LibFormDuplicateCheck | Individual-Record | VerifyUniqueIndividual |
| LibUserUpdate         | Individual-Record | AssignProponentGroup   |

## Global Function Usage

`VV.Form.Global.*` functions called from template scripts. Implementations are
site-level (not in template XML). Functions that may handle dates are flagged.

| Function                                   | Templates Using | Date-Related? |
| :----------------------------------------- | :-------------: | :-----------: |
| CloseAndUnlockForm                         |       77        |               |
| DisplayModalLoad                           |       77        |               |
| DisplayModal                               |       58        |               |
| CentralValidation                          |       52        |               |
| ValidationModal                            |       50        |               |
| FillinAndRelateForm                        |       36        |               |
| isNullEmptyUndefined                       |       36        |               |
| CentralMessages                            |       32        |               |
| RefreshFormElements                        |       26        |               |
| GetCurrentRoles                            |       23        |               |
| RegisterDatagrids                          |       18        |               |
| ViewDocumentsModal                         |       17        |               |
| UseCustomQuery                             |       15        |               |
| DatagridFindSelectedRows                   |       15        |               |
| GetFolderPathFromFPANumber                 |       14        |               |
| ToProperCase                               |       12        |               |
| DisplayModalRemoveHiddenSweetAlertElements |       12        |               |
| CallLibGetIndividual                       |       10        |               |
| CentralNumericValidation                   |       10        |               |
| DisplayMessaging                           |        8        |               |
| AddressVerificationOnBlur                  |        8        |               |
| CallLibAssociatedDocumentRelationUpdate    |        7        |               |
| CallLibStatusHistoryCreate                 |        7        |               |
| FormatPhone                                |        7        |               |
| OpenURLFromGUID                            |        7        |               |
| AssignPermissionsToAFolder                 |        7        |               |
| SignatoryDisableButtonByFieldName          |        7        |               |
| UpdateWindowLocationURL                    |        7        |               |
| DatagridFindRows                           |        6        |               |
| SubmitApplicationUpdate                    |        5        |               |
| GIS_onLoad                                 |        5        |               |
| EnterValidFPANNumber                       |        5        |               |
| IsMapLoaded                                |        5        |               |
| OpenGISModal                               |        5        |               |
| ClearFields                                |        4        |               |
| SetLabelValue                              |        4        |               |
| GetDateUTC                                 |        4        |   ⚠️ Review   |
| LoadInFPANRelations                        |        4        |               |
| AssessFee                                  |        4        |               |
| OpenShoppingCart                           |        4        |               |
| GetFormData                                |        4        |               |
| GetURLParamValue                           |        4        |               |
| FormatZipCode                              |        4        |               |
| CentralDateValidation                      |        3        |   ⚠️ Review   |
| StripHtmlTags                              |        3        |               |
| GetPendingRelatedFees                      |        3        |               |
| AddressCheckSameAddressMatch               |        3        |               |
| AddressCopySourceToDestination             |        3        |               |
| BuildAjaxFormSaveWithStaleCheck            |        3        |               |
| FillAndRelateRenewal                       |        3        |               |
| FillAndRelateAmendmentRequest              |        3        |               |
| CopyFieldValues                            |        3        |               |
| CheckboxRadioButton                        |        3        |               |
| SetRadioCheckbox                           |        3        |               |
| GetLabelValue                              |        3        |               |
| preFetchedWebMapResponse                   |        2        |               |
| SyncARP                                    |        2        |               |
| AddRecordLogic                             |        2        |               |
| BuildUrls                                  |        2        |               |
| RRCGetItemsGUID                            |        2        |               |
| FillAndRelateLTA5Day                       |        2        |               |
| VerifySubFormRelationship                  |        2        |               |
| FormatDateTextField                        |        2        |   ⚠️ Review   |
| FormatDateFields                           |        2        |   ⚠️ Review   |
| SetFieldValuesFromObj                      |        2        |               |
| mapState                                   |        1        |               |
| CentralEmailValidation                     |        1        |               |
| ShowLoadingPanel                           |        1        |               |
| HideLoadingPanel                           |        1        |               |
| GetCurrentDate                             |        1        |               |
| getDatagridRows                            |        1        |               |
| UncheckAdminOverrideAndSave                |        1        |               |
| DisplayMessagingModal                      |        1        |               |
| Debounce                                   |        1        |               |
| IsFillAndRelate                            |        1        |               |
| ValidateFPANNumberOwnership                |        1        |               |
| injectPlaceholder                          |        1        |               |
| FormatCurrency                             |        1        |               |
| ClearFieldValidationErrors                 |        1        |               |
| OpenDatagridRowReadOnly                    |        1        |               |
| HyphenatedToProperCase                     |        1        |               |
| NormalizeNameCapitalization                |        1        |               |
| DatagridCountRows                          |        1        |               |
| FillAndRelateTransferRequest               |        1        |               |
| BlankFields                                |        1        |               |

## Per-Template Detail

Templates with calendar fields and their script interactions.

### Access-Code

**Calendar fields**: Expiration Date (B), Date Created (B)
**Total scripts**: 6 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Addendum-Issued-Date-Tracking

**Calendar fields**: Addendum Issued Date (B)
**Total scripts**: 9 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Appeal

**Calendar fields**: Date of Appeal (B), Pre hearing Date (B), Hearing Date (B), Decision Date (B)
**Total scripts**: 18 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Application-Review-Page

**Calendar fields**: Date of Payment (B), Refund Date (B), WDFW Conflict Inquiry Sent (B), WDFW Response Received (B), WNHP Conflict Inquiry Sent (B), WNHP Response Received (B), USFWS Conflict Inquiry Sent (B), USFWS Response Received (B), LEG Notification Sent (B), LEG Report Received (B), DAHP Conflict Inquiry Sent (B), DAHP Response Received (B), Date Tribal Notification Sent (B), Tribal Meeting Request Received (B), Tribal Meeting Occurred (B), FPAN Date of Receipt (B), FPAN 14-Day Comment Period End Date (B), FPAN Decision Due Date (B), WDFW Due Date (B), WDFW Response Date (B), FPAN Decision Effective Date (B), FPAN Decision Expiration Date (B), FPAN Renewal Date of Receipt (B), FPAN Renewal Effective Date (B), LTA Date of Receipt (B), LTA 14-Day Comment Period End Date (B), LTA Decisions Due Date (B), LTA Effective Date (B), SEPA Threshold Determination Issued Date (B), SEPA Comment Period Start Date (B), SEPA Comment Period End Date (B), SEPA NFD Issued Date (B), Old FPAN Date of Receipt (B), Old LTA Date of Receipt (B), Old FPAN Renewal Date of Receipt (B)
**Total scripts**: 113 | **With date interactions**: 13

- **AutopopulateAPR** (TemplateScriptItem, trigger: unassigned)
    - Writes: FPAN Date of Receipt (B), FPAN Renewal Date of Receipt (B), LTA Date of Receipt (B)
- **generateSectionDataTribal** (TemplateScriptItem, trigger: unassigned)
    - Reads: Date Tribal Notification Sent (B), Tribal Meeting Request Received (B), Tribal Meeting Occurred (B)
- **DocumentsUpdate** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **generateSectionDataDAHP** (TemplateScriptItem, trigger: unassigned)
    - Reads: DAHP Conflict Inquiry Sent (B), DAHP Response Received (B)
- **DoStatusUpdate** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **CreateNewRenewal** (TemplateScriptItem, trigger: unassigned)
    - Reads: FPAN Decision Expiration Date (B)
- **createScienceTeamRecord** (TemplateScriptItem, trigger: unassigned)
    - Reads: LEG Notification Sent (B), LEG Report Received (B)
- **FPAN_Date_of_Receipt_onBlur** (ControlEventScriptItem, trigger: FPAN Date of Receipt:onBlur)
    - Reads: FPAN Date of Receipt (B), Old FPAN Date of Receipt (B)
- **WDFW_Due_Date_onBlur** (ControlEventScriptItem, trigger: WDFW Due Date:onBlur)
    - Reads: WDFW Due Date (B)
- **Form_onLoad** (ControlEventScriptItem, trigger: 00000001-0000-0000-0000-e0000000f010:event-10)
    - Reads: FPAN Date of Receipt (B), LTA Date of Receipt (B), FPAN Renewal Date of Receipt (B)
    - Writes: Old FPAN Date of Receipt (B), Old LTA Date of Receipt (B), Old FPAN Renewal Date of Receipt (B)
- **WDFW_Response_Date_onBlur** (ControlEventScriptItem, trigger: WDFW Response Date:onBlur)
    - Reads: WDFW Response Date (B)
- **LTA_Date_of_Receipt_onBlur** (ControlEventScriptItem, trigger: LTA Date of Receipt:onBlur)
    - Reads: LTA Date of Receipt (B), Old LTA Date of Receipt (B)
- **FPAN_Renewal_Date_of_Receipt_onBlur** (ControlEventScriptItem, trigger: FPAN Renewal Date of Receipt:onBlur)
    - Reads: FPAN Renewal Date of Receipt (B), Old FPAN Renewal Date of Receipt (B)

### Associated-Document-Relation

**Calendar fields**: Document Create Date (B), Document Modify Date (B), Receipt Date (B)
**Total scripts**: 6 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Communications-Log

**Calendar fields**: Scheduled Date (C), Communication Date (C)
**Total scripts**: 32 | **With date interactions**: 1

- **Form_onLoad** (ControlEventScriptItem, trigger: 00000001-0000-0000-0000-e0000000f010:event-10)
    - Reads: Communication Date (C)
    - Writes: Communication Date (C)
    - **Round-trips: Communication Date (C)**
    - Uses Date/moment APIs

### Copies-Sent-To

**Calendar fields**: Date (B)
**Total scripts**: 7 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### External-Reviewer-Recommendations

**Calendar fields**: Comment Due Date or Date of Recommendation (B)
**Total scripts**: 13 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Fee

**Calendar fields**: Start Date (B), Next Due Date (B), Overdue Installment Fee Notification Last Send Date (B)
**Total scripts**: 96 | **With date interactions**: 1

- **Start_Date_onBlur** (ControlEventScriptItem, trigger: Start Date:onBlur)
    - Reads: Start Date (B)
    - Writes: Next Due Date (B)

### Fee-Lookup

**Calendar fields**: Effective Date (B), End Date (B)
**Total scripts**: 78 | **With date interactions**: 1

- **FormValidation** (TemplateScriptItem, trigger: unassigned)
    - Reads: Effective Date (B), End Date (B)

### Field-Representative

**Calendar fields**: Date (B)
**Total scripts**: 16 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Forest-Practices-Aerial-Chemical-Application

**Calendar fields**: Received Date (D), Aerial Chemical Status Updated At (B)
**Total scripts**: 209 | **With date interactions**: 5

- **SetFPANNumber** (TemplateScriptItem, trigger: unassigned)
    - Writes: Received Date (D)
- **CreateApplicationReviewPage** (TemplateScriptItem, trigger: unassigned)
    - Writes: Received Date (D)
- **ResubmitForm** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **CreateStatusHistory** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **Status_onChange** (ControlEventScriptItem, trigger: Status:onChange)
    - Writes: Aerial Chemical Status Updated At (B)
    - Uses Date/moment APIs

### Forest-Practices-Application-Notification

**Calendar fields**: Date of Receipt (D), Expiration Date (B), Submitted Date (B), FPAN Status Updated At (B), Created Date (B)
**Total scripts**: 415 | **With date interactions**: 8

- **ValidateAndProceed** (TemplateScriptItem, trigger: unassigned)
    - Reads: Date of Receipt (D)
- **SetFPANNumber** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date of Receipt (D)
- **Resubmit** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **CallLibUpdateApplicationReviewPage** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **SubmitForm** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date of Receipt (D)
- **SetSubmittedDate** (TemplateScriptItem, trigger: unassigned)
    - Writes: Created Date (B), Submitted Date (B)
    - Uses Date/moment APIs
- **CreateStatusHistory** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **Status_onChange** (ControlEventScriptItem, trigger: Status:onChange)
    - Writes: FPAN Status Updated At (B)
    - Uses Date/moment APIs

### Forest-Practices-Notification-Profile

**Calendar fields**: Received Date (B)
**Total scripts**: 63 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### FPAN-Amendment-Request

**Calendar fields**: Date of Receipt (D), Effective Date (A), Amendment Status Updated At (B)
**Total scripts**: 109 | **With date interactions**: 4

- **Resubmit** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **DoStatusUpdate** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **CreateStatusHistory** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **Amendment_Status_onChange** (ControlEventScriptItem, trigger: Amendment Status:onChange)
    - Writes: Amendment Status Updated At (B), Effective Date (A)
    - Uses Date/moment APIs

### FPAN-Notice-of-Decision

**Calendar fields**: Effective Date (B), Expiration Date (B), Date (A), Date Delivered (B), Date Mailed (B)
**Total scripts**: 19 | **With date interactions**: 1

- **PopulateARPData** (TemplateScriptItem, trigger: unassigned)
    - Writes: Expiration Date (B), Effective Date (B)

### FPAN-Notice-of-Transfer

**Calendar fields**: Effective Date (B), Date of Receipt (A)
**Total scripts**: 117 | **With date interactions**: 4

- **Submit5DayLTA** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date of Receipt (A)
- **Status_onChange** (ControlEventScriptItem, trigger: Status:onChange)
    - Reads: Effective Date (B)
- **Effective_Date_onBlur** (ControlEventScriptItem, trigger: Effective Date:onBlur)
    - Reads: Effective Date (B)
- **Notice_of_Transfer_Status_onChange** (ControlEventScriptItem, trigger: Notice of Transfer Status:onChange)
    - Reads: Effective Date (B)

### FPAN-Record-Change-Request

**Calendar fields**: Effective Date (B)
**Total scripts**: 13 | **With date interactions**: 1

- **SubmitForm** (TemplateScriptItem, trigger: unassigned)
    - Writes: Effective Date (B)
    - Uses Date/moment APIs

### FPAN-Record-Owner

**Calendar fields**: Effective Date (B)
**Total scripts**: 6 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### FPAN-Renewal

**Calendar fields**: Date of Receipt (D), Expiration Date Of Approved FPAN (B), Renewal Status Updated At (B)
**Total scripts**: 142 | **With date interactions**: 6

- **AutopopulateRenewal** (TemplateScriptItem, trigger: unassigned)
    - Writes: Expiration Date Of Approved FPAN (B)
- **SubmitRenewal** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date of Receipt (D)
    - Uses Date/moment APIs
- **ValidateAndProceed** (TemplateScriptItem, trigger: unassigned)
    - Reads: Date of Receipt (D)
- **CallLibUpdateApplicationReviewPage** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **CreateStatusHistory** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **Status_onChange** (ControlEventScriptItem, trigger: Status:onChange)
    - Writes: Renewal Status Updated At (B)
    - Uses Date/moment APIs

### Informal-Conference-Note

**Calendar fields**: Meeting Date (D), DNR Date (B), Submitted Date (B)
**Total scripts**: 84 | **With date interactions**: 4

- **Submit** (TemplateScriptItem, trigger: unassigned)
    - Writes: Submitted Date (B)
    - Uses Date/moment APIs
- **FormatSubmissionDate** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **HandleParticipantSignatureCheckbox** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **SetICNNumber** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs

### Informal-Conference-Note-SUPPORT-COPY

**Calendar fields**: Meeting Date (D), DNR Date (B), Submitted Date (B)
**Total scripts**: 54 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Long-Term-Application-5-Day-Notice

**Calendar fields**: Date of Receipt (D), Created Date (B), Effective Date (B), LTA 5-Day Status Updated At (B)
**Total scripts**: 122 | **With date interactions**: 4

- **DoStatusUpdate** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **ReSubmitForm** (TemplateScriptItem, trigger: unassigned)
    - Writes: LTA 5-Day Status Updated At (B)
    - Uses Date/moment APIs
- **SetSubmittedDate** (TemplateScriptItem, trigger: unassigned)
    - Writes: Created Date (B)
    - Uses Date/moment APIs
- **Status_Change_onChange** (ControlEventScriptItem, trigger: Status Change:onChange)
    - Writes: LTA 5-Day Status Updated At (B), Effective Date (B)
    - Uses Date/moment APIs

### Multi-purpose

**Calendar fields**: Date Requested Initiated (B), Date of Violation (D), Follow Up Date One (B), Follow Up Date Two (B), Follow Up Date Three (B), Enforcement Action Closed Date (B)
**Total scripts**: 54 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### NCFLO-Tracking

**Calendar fields**: Date of Receipt (B)
**Total scripts**: 11 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Notice-of-Conversion-to-Non-Forestry-Use

**Calendar fields**: Activity Date (B), Date Signature (B), Submitted Date (B)
**Total scripts**: 281 | **With date interactions**: 2

- **SetNCNUNumber** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **Submit** (TemplateScriptItem, trigger: unassigned)
    - Writes: Submitted Date (B)
    - Uses Date/moment APIs

### Notice-to-Comply

**Calendar fields**: ViolationDateAndTime (D), Date One (B), Date Two (B), Date Three (B), Date of Service (B), ReviewDateOne (B), ReviewDatetwo (B), Obligations Completed Date (B), Submitted Date (B)
**Total scripts**: 136 | **With date interactions**: 2

- **CallLibFPETSNumberGenerate** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **Submit** (TemplateScriptItem, trigger: unassigned)
    - Writes: Submitted Date (B)
    - Uses Date/moment APIs

### Notification-Communication

**Calendar fields**: WDFW Conflict Inquiry Sent (B), WDFW Response Received (B), WNHP Conflict Inquiry Sent (B), WNHP Response Received (B), USFWS Conflict Inquiry Sent (B), USFWS Response Received (B), LEG Notification Sent (B), LEG Report Received (B), DAHP Conflict Inquiry Sent (B), DAHP Response Received (B), Date Tribal Notification Sent (B), Tribal Meeting Request Received (B), Tribal Meeting Occurred (B)
**Total scripts**: 30 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Payment-Item

**Calendar fields**: Due Date (B), Date of Transaction (B), Date of Original Transaction (B)
**Total scripts**: 28 | **With date interactions**: 1

- **FormValidation** (TemplateScriptItem, trigger: unassigned)
    - Reads: Date of Original Transaction (B), Date of Transaction (B)

### PDF-Package-Generation

**Calendar fields**: Date Print Queued (B), Date Printed (B)
**Total scripts**: 16 | **With date interactions**: 1

- **CreateQueueForPrinting** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date Print Queued (B)
    - Uses Date/moment APIs

### Shopping-Cart

**Calendar fields**: Payment Date (B)
**Total scripts**: 62 | **With date interactions**: 1

- **FormValidation** (TemplateScriptItem, trigger: unassigned)
    - Reads: Payment Date (B)

### Status-History

**Calendar fields**: Status Modified Date (C)
**Total scripts**: 6 | **With date interactions**: 0

_No scripts interact with calendar fields or date APIs._

### Step-1-Long-Term-FPA

**Calendar fields**: Date of Receipt (D), LTA Step1 Status Updated At (B)
**Total scripts**: 160 | **With date interactions**: 5

- **ValidateAndProceed** (TemplateScriptItem, trigger: unassigned)
    - Reads: Date of Receipt (D)
- **CallLibUpdateApplicationReviewPage** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **CreateStatusHistory** (TemplateScriptItem, trigger: unassigned)
    - Uses Date/moment APIs
- **SubmitForm** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date of Receipt (D)
- **Status_onChange** (ControlEventScriptItem, trigger: Status:onChange)
    - Writes: LTA Step1 Status Updated At (B)
    - Uses Date/moment APIs

### Task

**Calendar fields**: Due Date (B), Date Created (D), Date Completed (D)
**Total scripts**: 16 | **With date interactions**: 2

- **CompleteForm** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date Completed (D)
- **SaveForm** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date Created (D)

### WTM-Review-Page

**Calendar fields**: Date of Receipt (B), Comment Due Date (B), Decision Date (B), GIS Edits Complete Date (B), Date DNR Decision (B)
**Total scripts**: 64 | **With date interactions**: 2

- **SubmitDecision** (TemplateScriptItem, trigger: unassigned)
    - Writes: Date DNR Decision (B)
    - Uses Date/moment APIs
- **btnSendNotificationToReviewers_onClick** (ControlEventScriptItem, trigger: btnSendNotificationToReviewers:onClick)
    - Reads: Comment Due Date (B)
