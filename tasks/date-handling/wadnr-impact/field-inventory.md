# WADNR Date Field Inventory

Calendar field configuration for all WADNR form templates, mapped to the temporal model framework defined in [Root Cause Analysis](../analysis/temporal-models.md).

Generated: 2026-04-07 | Source: 35 templates with calendar fields out of 77 total

---

## Configuration Reference

| Config | enableTime | ignoreTZ | useLegacy |    Intended Model     |
| :----: | :--------: | :------: | :-------: | :-------------------: |
| **A**  |    OFF     |   OFF    |    OFF    |   1 — Calendar Date   |
| **B**  |    OFF     |    ON    |    OFF    |   1 — Calendar Date   |
| **C**  |     ON     |   OFF    |    OFF    |      2 — Instant      |
| **D**  |     ON     |    ON    |    OFF    | 3/4 — Pinned/Floating |
| **E**  |    OFF     |   OFF    |    ON     |   1 — Calendar Date   |
| **F**  |    OFF     |    ON    |    ON     |   1 — Calendar Date   |
| **G**  |     ON     |   OFF    |    ON     |      2 — Instant      |
| **H**  |     ON     |    ON    |    ON     | 3/4 — Pinned/Floating |

**Assessment column legend:**

- ✅ **Correct** — field name clearly matches the configured model
- ⚠️ **Review** — field name is ambiguous or could map to a different model
- ❌ **Mismatch** — field name suggests a different model than what is configured

---

## Summary

**137 calendar fields** across **35 form templates**.

### Configuration Distribution

| Config |         Model         | Field Count | % of Total |
| :----: | :-------------------: | :---------: | :--------: |
| **A**  |   1 — Calendar Date   |      3      |    2.2%    |
| **B**  |   1 — Calendar Date   |     119     |   86.9%    |
| **C**  |      2 — Instant      |      3      |    2.2%    |
| **D**  | 3/4 — Pinned/Floating |     12      |    8.8%    |
|        |       **Total**       |   **137**   |  **100%**  |

### Model Distribution

|           Model           | Field Count | % of Total | Affected Bugs                                                          |
| :-----------------------: | :---------: | :--------: | :--------------------------------------------------------------------- |
|   **1 — Calendar Date**   |     122     |   89.1%    | FORM-BUG-7, WEBSERVICE-BUG-6                                           |
|      **2 — Instant**      |      3      |    2.2%    | FORM-BUG-1, FORM-BUG-4, FORM-BUG-6, WEBSERVICE-BUG-1, WEBSERVICE-BUG-4 |
| **3/4 — Pinned/Floating** |     12      |    8.8%    | FORM-BUG-5, FORM-BUG-6, WEBSERVICE-BUG-1, WEBSERVICE-BUG-4             |

### Configuration Assessment

| Assessment  | Field Count | % of Total |
| :---------: | :---------: | :--------: |
| ✅ Correct  |     118     |   86.1%    |
|  ⚠️ Review  |     11      |    8.0%    |
| ❌ Mismatch |      8      |    5.8%    |

### Fields Requiring Review

| Form                                         | Field Name                        | Config | Configured Model      | Likely Model      | Assessment | Reason                                                               |
| :------------------------------------------- | :-------------------------------- | :----: | :-------------------- | :---------------- | :--------: | :------------------------------------------------------------------- |
| Forest-Practices-Aerial-Chemical-Application | Received Date                     | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ❌     | Name suggests date-only — enableTime may be unnecessary              |
| Forest-Practices-Application-Notification    | Date of Receipt                   | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ❌     | Name suggests date-only — enableTime may be unnecessary              |
| FPAN-Amendment-Request                       | Date of Receipt                   | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ❌     | Name suggests date-only — enableTime may be unnecessary              |
| FPAN-Renewal                                 | Date of Receipt                   | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ❌     | Name suggests date-only — enableTime may be unnecessary              |
| Long-Term-Application-5-Day-Notice           | Date of Receipt                   | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ❌     | Name suggests date-only — enableTime may be unnecessary              |
| Multi-purpose                                | Date of Violation                 | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ❌     | Name suggests date-only — enableTime may be unnecessary              |
| Step-1-Long-Term-FPA                         | Date of Receipt                   | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ❌     | Name suggests date-only — enableTime may be unnecessary              |
| Task                                         | Date Created                      | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ❌     | Name suggests date-only — enableTime may be unnecessary              |
| Communications-Log                           | Communication Date                | **C**  | 2 — Instant           | 1 — Calendar Date |     ⚠️     | Name suggests date-only — verify if time component is used           |
| Communications-Log                           | Scheduled Date                    | **C**  | 2 — Instant           | 1 or 3            |     ⚠️     | Verify if time component is actually used                            |
| Forest-Practices-Aerial-Chemical-Application | Aerial Chemical Status Updated At | **B**  | 1 — Calendar Date     | 2 — Instant       |     ⚠️     | Likely system timestamp — Instant (Config C) may be more appropriate |
| Forest-Practices-Application-Notification    | FPAN Status Updated At            | **B**  | 1 — Calendar Date     | 2 — Instant       |     ⚠️     | Likely system timestamp — Instant (Config C) may be more appropriate |
| FPAN-Amendment-Request                       | Amendment Status Updated At       | **B**  | 1 — Calendar Date     | 2 — Instant       |     ⚠️     | Likely system timestamp — Instant (Config C) may be more appropriate |
| FPAN-Renewal                                 | Renewal Status Updated At         | **B**  | 1 — Calendar Date     | 2 — Instant       |     ⚠️     | Likely system timestamp — Instant (Config C) may be more appropriate |
| Informal-Conference-Note                     | Meeting Date                      | **D**  | 3/4 — Pinned/Floating | 1 or 3            |     ⚠️     | Verify if time component is actually used                            |
| Informal-Conference-Note-SUPPORT-COPY        | Meeting Date                      | **D**  | 3/4 — Pinned/Floating | 1 or 3            |     ⚠️     | Verify if time component is actually used                            |
| Long-Term-Application-5-Day-Notice           | LTA 5-Day Status Updated At       | **B**  | 1 — Calendar Date     | 2 — Instant       |     ⚠️     | Likely system timestamp — Instant (Config C) may be more appropriate |
| Step-1-Long-Term-FPA                         | LTA Step1 Status Updated At       | **B**  | 1 — Calendar Date     | 2 — Instant       |     ⚠️     | Likely system timestamp — Instant (Config C) may be more appropriate |
| Task                                         | Date Completed                    | **D**  | 3/4 — Pinned/Floating | 1 — Calendar Date |     ⚠️     | Name suggests date-only — verify if time component is used           |

### Initial Value Distribution

| Initial Value | Field Count |
| :-----------: | :---------: |
|     None      |     135     |
| Current Date  |      2      |

---

## Form Templates

### Access-Code

| Field Name      | Config | Likely Model      | Match | Initial Value |
| :-------------- | :----: | :---------------- | :---: | :------------ |
| Expiration Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date Created    | **B**  | 1 — Calendar Date |  ✅   | None          |

### Addendum-Issued-Date-Tracking

| Field Name           | Config | Likely Model      | Match | Initial Value |
| :------------------- | :----: | :---------------- | :---: | :------------ |
| Addendum Issued Date | **B**  | 1 — Calendar Date |  ✅   | None          |

### Appeal

| Field Name       | Config | Likely Model      | Match | Initial Value |
| :--------------- | :----: | :---------------- | :---: | :------------ |
| Date of Appeal   | **B**  | 1 — Calendar Date |  ✅   | None          |
| Pre hearing Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| Hearing Date     | **B**  | 1 — Calendar Date |  ✅   | None          |
| Decision Date    | **B**  | 1 — Calendar Date |  ✅   | None          |

### Application-Review-Page

| Field Name                               | Config | Likely Model      | Match | Initial Value |
| :--------------------------------------- | :----: | :---------------- | :---: | :------------ |
| Date of Payment                          | **B**  | 1 — Calendar Date |  ✅   | None          |
| Refund Date                              | **B**  | 1 — Calendar Date |  ✅   | None          |
| WDFW Conflict Inquiry Sent               | **B**  | 1 — Calendar Date |  ✅   | None          |
| WDFW Response Received                   | **B**  | 1 — Calendar Date |  ✅   | None          |
| WNHP Conflict Inquiry Sent               | **B**  | 1 — Calendar Date |  ✅   | None          |
| WNHP Response Received                   | **B**  | 1 — Calendar Date |  ✅   | None          |
| USFWS Conflict Inquiry Sent              | **B**  | 1 — Calendar Date |  ✅   | None          |
| USFWS Response Received                  | **B**  | 1 — Calendar Date |  ✅   | None          |
| LEG Notification Sent                    | **B**  | 1 — Calendar Date |  ✅   | None          |
| LEG Report Received                      | **B**  | 1 — Calendar Date |  ✅   | None          |
| DAHP Conflict Inquiry Sent               | **B**  | 1 — Calendar Date |  ✅   | None          |
| DAHP Response Received                   | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date Tribal Notification Sent            | **B**  | 1 — Calendar Date |  ✅   | None          |
| Tribal Meeting Request Received          | **B**  | 1 — Calendar Date |  ✅   | None          |
| Tribal Meeting Occurred                  | **B**  | 1 — Calendar Date |  ✅   | None          |
| FPAN Date of Receipt                     | **B**  | 1 — Calendar Date |  ✅   | None          |
| FPAN 14-Day Comment Period End Date      | **B**  | 1 — Calendar Date |  ✅   | None          |
| FPAN Decision Due Date                   | **B**  | 1 — Calendar Date |  ✅   | None          |
| WDFW Due Date                            | **B**  | 1 — Calendar Date |  ✅   | None          |
| WDFW Response Date                       | **B**  | 1 — Calendar Date |  ✅   | None          |
| FPAN Decision Effective Date             | **B**  | 1 — Calendar Date |  ✅   | None          |
| FPAN Decision Expiration Date            | **B**  | 1 — Calendar Date |  ✅   | None          |
| FPAN Renewal Date of Receipt             | **B**  | 1 — Calendar Date |  ✅   | None          |
| FPAN Renewal Effective Date              | **B**  | 1 — Calendar Date |  ✅   | None          |
| LTA Date of Receipt                      | **B**  | 1 — Calendar Date |  ✅   | None          |
| LTA 14-Day Comment Period End Date       | **B**  | 1 — Calendar Date |  ✅   | None          |
| LTA Decisions Due Date                   | **B**  | 1 — Calendar Date |  ✅   | None          |
| LTA Effective Date                       | **B**  | 1 — Calendar Date |  ✅   | None          |
| SEPA Threshold Determination Issued Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| SEPA Comment Period Start Date           | **B**  | 1 — Calendar Date |  ✅   | None          |
| SEPA Comment Period End Date             | **B**  | 1 — Calendar Date |  ✅   | None          |
| SEPA NFD Issued Date                     | **B**  | 1 — Calendar Date |  ✅   | None          |
| Old FPAN Date of Receipt                 | **B**  | 1 — Calendar Date |  ✅   | None          |
| Old LTA Date of Receipt                  | **B**  | 1 — Calendar Date |  ✅   | None          |
| Old FPAN Renewal Date of Receipt         | **B**  | 1 — Calendar Date |  ✅   | None          |

### Associated-Document-Relation

| Field Name           | Config | Likely Model      | Match | Initial Value |
| :------------------- | :----: | :---------------- | :---: | :------------ |
| Document Create Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| Document Modify Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| Receipt Date         | **B**  | 1 — Calendar Date |  ✅   | None          |

### Communications-Log

| Field Name         | Config | Likely Model      |                              Match                              | Initial Value |
| :----------------- | :----: | :---------------- | :-------------------------------------------------------------: | :------------ |
| Scheduled Date     | **C**  | 1 or 3            |         ⚠️ — Verify if time component is actually used          | Current Date  |
| Communication Date | **C**  | 1 — Calendar Date | ⚠️ — Name suggests date-only — verify if time component is used | None          |

### Copies-Sent-To

| Field Name | Config | Likely Model      | Match | Initial Value |
| :--------- | :----: | :---------------- | :---: | :------------ |
| Date       | **B**  | 1 — Calendar Date |  ✅   | None          |

### External-Reviewer-Recommendations

| Field Name                                 | Config | Likely Model      | Match | Initial Value |
| :----------------------------------------- | :----: | :---------------- | :---: | :------------ |
| Comment Due Date or Date of Recommendation | **B**  | 1 — Calendar Date |  ✅   | None          |

### FPAN-Amendment-Request

| Field Name                  | Config | Likely Model      |                                   Match                                   | Initial Value |
| :-------------------------- | :----: | :---------------- | :-----------------------------------------------------------------------: | :------------ |
| Date of Receipt             | **D**  | 1 — Calendar Date |       ❌ — Name suggests date-only — enableTime may be unnecessary        | None          |
| Effective Date              | **A**  | 1 — Calendar Date |                                    ✅                                     | None          |
| Amendment Status Updated At | **B**  | 2 — Instant       | ⚠️ — Likely system timestamp — Instant (Config C) may be more appropriate | None          |

### FPAN-Notice-of-Decision

| Field Name      | Config | Likely Model      | Match | Initial Value |
| :-------------- | :----: | :---------------- | :---: | :------------ |
| Effective Date  | **B**  | 1 — Calendar Date |  ✅   | None          |
| Expiration Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date            | **A**  | 1 — Calendar Date |  ✅   | Current Date  |
| Date Delivered  | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date Mailed     | **B**  | 1 — Calendar Date |  ✅   | None          |

### FPAN-Notice-of-Transfer

| Field Name      | Config | Likely Model      | Match | Initial Value |
| :-------------- | :----: | :---------------- | :---: | :------------ |
| Effective Date  | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date of Receipt | **A**  | 1 — Calendar Date |  ✅   | None          |

### FPAN-Record-Change-Request

| Field Name     | Config | Likely Model      | Match | Initial Value |
| :------------- | :----: | :---------------- | :---: | :------------ |
| Effective Date | **B**  | 1 — Calendar Date |  ✅   | None          |

### FPAN-Record-Owner

| Field Name     | Config | Likely Model      | Match | Initial Value |
| :------------- | :----: | :---------------- | :---: | :------------ |
| Effective Date | **B**  | 1 — Calendar Date |  ✅   | None          |

### FPAN-Renewal

| Field Name                       | Config | Likely Model      |                                   Match                                   | Initial Value |
| :------------------------------- | :----: | :---------------- | :-----------------------------------------------------------------------: | :------------ |
| Date of Receipt                  | **D**  | 1 — Calendar Date |       ❌ — Name suggests date-only — enableTime may be unnecessary        | None          |
| Expiration Date Of Approved FPAN | **B**  | 1 — Calendar Date |                                    ✅                                     | None          |
| Renewal Status Updated At        | **B**  | 2 — Instant       | ⚠️ — Likely system timestamp — Instant (Config C) may be more appropriate | None          |

### Fee-Lookup

| Field Name     | Config | Likely Model      | Match | Initial Value |
| :------------- | :----: | :---------------- | :---: | :------------ |
| Effective Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| End Date       | **B**  | 1 — Calendar Date |  ✅   | None          |

### Fee

| Field Name                                          | Config | Likely Model      | Match | Initial Value |
| :-------------------------------------------------- | :----: | :---------------- | :---: | :------------ |
| Start Date                                          | **B**  | 1 — Calendar Date |  ✅   | None          |
| Next Due Date                                       | **B**  | 1 — Calendar Date |  ✅   | None          |
| Overdue Installment Fee Notification Last Send Date | **B**  | 1 — Calendar Date |  ✅   | None          |

### Field-Representative

| Field Name | Config | Likely Model      | Match | Initial Value |
| :--------- | :----: | :---------------- | :---: | :------------ |
| Date       | **B**  | 1 — Calendar Date |  ✅   | None          |

### Forest-Practices-Aerial-Chemical-Application

| Field Name                        | Config | Likely Model      |                                   Match                                   | Initial Value |
| :-------------------------------- | :----: | :---------------- | :-----------------------------------------------------------------------: | :------------ |
| Received Date                     | **D**  | 1 — Calendar Date |       ❌ — Name suggests date-only — enableTime may be unnecessary        | None          |
| Aerial Chemical Status Updated At | **B**  | 2 — Instant       | ⚠️ — Likely system timestamp — Instant (Config C) may be more appropriate | None          |

### Forest-Practices-Application-Notification

| Field Name             | Config | Likely Model      |                                   Match                                   | Initial Value |
| :--------------------- | :----: | :---------------- | :-----------------------------------------------------------------------: | :------------ |
| Date of Receipt        | **D**  | 1 — Calendar Date |       ❌ — Name suggests date-only — enableTime may be unnecessary        | None          |
| Expiration Date        | **B**  | 1 — Calendar Date |                                    ✅                                     | None          |
| Submitted Date         | **B**  | 1 — Calendar Date |                                    ✅                                     | None          |
| FPAN Status Updated At | **B**  | 2 — Instant       | ⚠️ — Likely system timestamp — Instant (Config C) may be more appropriate | None          |
| Created Date           | **B**  | 1 — Calendar Date |                                    ✅                                     | None          |

### Forest-Practices-Notification-Profile

| Field Name    | Config | Likely Model      | Match | Initial Value |
| :------------ | :----: | :---------------- | :---: | :------------ |
| Received Date | **B**  | 1 — Calendar Date |  ✅   | None          |

### Informal-Conference-Note-SUPPORT-COPY

| Field Name     | Config | Likely Model      |                     Match                      | Initial Value |
| :------------- | :----: | :---------------- | :--------------------------------------------: | :------------ |
| Meeting Date   | **D**  | 1 or 3            | ⚠️ — Verify if time component is actually used | None          |
| DNR Date       | **B**  | 1 — Calendar Date |                       ✅                       | None          |
| Submitted Date | **B**  | 1 — Calendar Date |                       ✅                       | None          |

### Informal-Conference-Note

| Field Name     | Config | Likely Model      |                     Match                      | Initial Value |
| :------------- | :----: | :---------------- | :--------------------------------------------: | :------------ |
| Meeting Date   | **D**  | 1 or 3            | ⚠️ — Verify if time component is actually used | None          |
| DNR Date       | **B**  | 1 — Calendar Date |                       ✅                       | None          |
| Submitted Date | **B**  | 1 — Calendar Date |                       ✅                       | None          |

### Long-Term-Application-5-Day-Notice

| Field Name                  | Config | Likely Model      |                                   Match                                   | Initial Value |
| :-------------------------- | :----: | :---------------- | :-----------------------------------------------------------------------: | :------------ |
| Date of Receipt             | **D**  | 1 — Calendar Date |       ❌ — Name suggests date-only — enableTime may be unnecessary        | None          |
| Created Date                | **B**  | 1 — Calendar Date |                                    ✅                                     | None          |
| Effective Date              | **B**  | 1 — Calendar Date |                                    ✅                                     | None          |
| LTA 5-Day Status Updated At | **B**  | 2 — Instant       | ⚠️ — Likely system timestamp — Instant (Config C) may be more appropriate | None          |

### Multi-purpose

| Field Name                     | Config | Likely Model      |                            Match                             | Initial Value |
| :----------------------------- | :----: | :---------------- | :----------------------------------------------------------: | :------------ |
| Date Requested Initiated       | **B**  | 1 — Calendar Date |                              ✅                              | None          |
| Date of Violation              | **D**  | 1 — Calendar Date | ❌ — Name suggests date-only — enableTime may be unnecessary | None          |
| Follow Up Date One             | **B**  | 1 — Calendar Date |                              ✅                              | None          |
| Follow Up Date Two             | **B**  | 1 — Calendar Date |                              ✅                              | None          |
| Follow Up Date Three           | **B**  | 1 — Calendar Date |                              ✅                              | None          |
| Enforcement Action Closed Date | **B**  | 1 — Calendar Date |                              ✅                              | None          |

### NCFLO-Tracking

| Field Name      | Config | Likely Model      | Match | Initial Value |
| :-------------- | :----: | :---------------- | :---: | :------------ |
| Date of Receipt | **B**  | 1 — Calendar Date |  ✅   | None          |

### Notice-of-Conversion-to-Non-Forestry-Use

| Field Name     | Config | Likely Model      | Match | Initial Value |
| :------------- | :----: | :---------------- | :---: | :------------ |
| Activity Date  | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date Signature | **B**  | 1 — Calendar Date |  ✅   | None          |
| Submitted Date | **B**  | 1 — Calendar Date |  ✅   | None          |

### Notice-to-Comply

| Field Name                 | Config | Likely Model      | Match | Initial Value |
| :------------------------- | :----: | :---------------- | :---: | :------------ |
| ViolationDateAndTime       | **D**  | 3 — Pinned        |  ✅   | None          |
| Date One                   | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date Two                   | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date Three                 | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date of Service            | **B**  | 1 — Calendar Date |  ✅   | None          |
| ReviewDateOne              | **B**  | 1 — Calendar Date |  ✅   | None          |
| ReviewDatetwo              | **B**  | 1 — Calendar Date |  ✅   | None          |
| Obligations Completed Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| Submitted Date             | **B**  | 1 — Calendar Date |  ✅   | None          |

### Notification-Communication

| Field Name                      | Config | Likely Model      | Match | Initial Value |
| :------------------------------ | :----: | :---------------- | :---: | :------------ |
| WDFW Conflict Inquiry Sent      | **B**  | 1 — Calendar Date |  ✅   | None          |
| WDFW Response Received          | **B**  | 1 — Calendar Date |  ✅   | None          |
| WNHP Conflict Inquiry Sent      | **B**  | 1 — Calendar Date |  ✅   | None          |
| WNHP Response Received          | **B**  | 1 — Calendar Date |  ✅   | None          |
| USFWS Conflict Inquiry Sent     | **B**  | 1 — Calendar Date |  ✅   | None          |
| USFWS Response Received         | **B**  | 1 — Calendar Date |  ✅   | None          |
| LEG Notification Sent           | **B**  | 1 — Calendar Date |  ✅   | None          |
| LEG Report Received             | **B**  | 1 — Calendar Date |  ✅   | None          |
| DAHP Conflict Inquiry Sent      | **B**  | 1 — Calendar Date |  ✅   | None          |
| DAHP Response Received          | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date Tribal Notification Sent   | **B**  | 1 — Calendar Date |  ✅   | None          |
| Tribal Meeting Request Received | **B**  | 1 — Calendar Date |  ✅   | None          |
| Tribal Meeting Occurred         | **B**  | 1 — Calendar Date |  ✅   | None          |

### PDF-Package-Generation

| Field Name        | Config | Likely Model      | Match | Initial Value |
| :---------------- | :----: | :---------------- | :---: | :------------ |
| Date Print Queued | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date Printed      | **B**  | 1 — Calendar Date |  ✅   | None          |

### Payment-Item

| Field Name                   | Config | Likely Model      | Match | Initial Value |
| :--------------------------- | :----: | :---------------- | :---: | :------------ |
| Due Date                     | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date of Transaction          | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date of Original Transaction | **B**  | 1 — Calendar Date |  ✅   | None          |

### Shopping-Cart

| Field Name   | Config | Likely Model      | Match | Initial Value |
| :----------- | :----: | :---------------- | :---: | :------------ |
| Payment Date | **B**  | 1 — Calendar Date |  ✅   | None          |

### Status-History

| Field Name           | Config | Likely Model |         Match         | Initial Value |
| :------------------- | :----: | :----------- | :-------------------: | :------------ |
| Status Modified Date | **C**  | 2 — Instant  | ✅ — System timestamp | None          |

### Step-1-Long-Term-FPA

| Field Name                  | Config | Likely Model      |                                   Match                                   | Initial Value |
| :-------------------------- | :----: | :---------------- | :-----------------------------------------------------------------------: | :------------ |
| Date of Receipt             | **D**  | 1 — Calendar Date |       ❌ — Name suggests date-only — enableTime may be unnecessary        | None          |
| LTA Step1 Status Updated At | **B**  | 2 — Instant       | ⚠️ — Likely system timestamp — Instant (Config C) may be more appropriate | None          |

### Task

| Field Name     | Config | Likely Model      |                              Match                              | Initial Value |
| :------------- | :----: | :---------------- | :-------------------------------------------------------------: | :------------ |
| Due Date       | **B**  | 1 — Calendar Date |                               ✅                                | None          |
| Date Created   | **D**  | 1 — Calendar Date |  ❌ — Name suggests date-only — enableTime may be unnecessary   | None          |
| Date Completed | **D**  | 1 — Calendar Date | ⚠️ — Name suggests date-only — verify if time component is used | None          |

### WTM-Review-Page

| Field Name              | Config | Likely Model      | Match | Initial Value |
| :---------------------- | :----: | :---------------- | :---: | :------------ |
| Date of Receipt         | **B**  | 1 — Calendar Date |  ✅   | None          |
| Comment Due Date        | **B**  | 1 — Calendar Date |  ✅   | None          |
| Decision Date           | **B**  | 1 — Calendar Date |  ✅   | None          |
| GIS Edits Complete Date | **B**  | 1 — Calendar Date |  ✅   | None          |
| Date DNR Decision       | **B**  | 1 — Calendar Date |  ✅   | None          |
