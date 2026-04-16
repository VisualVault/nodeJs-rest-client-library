# Standards Review: Communications-Log

Generated: 2026-04-15 | Rules: 40 | Findings: 73 (0 errors, 42 warnings, 31 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 42 |
| Info     | 31 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| title-case | CC | Page 1 | Field name "CC" is not in Title Case |
| title-case | Sent/Recorded By | Page 1 | Field name "Sent/Recorded By" is not in Title Case |
| default-name | Image64 | Page 1 | Default field name "Image64" — use a descriptive name |
| valid-identifier | Sent/Recorded By | Page 1 | Field name "Sent/Recorded By" contains invalid identifier characters |
| script-orphan-assignment | Body_Text_onBlur | — | Script assignment references non-existent control ID: 7019e2f8-3c6c-8d28-8ba1-cf64139ff1e6 |
| script-orphan-assignment | Region_Name_onBlur | — | Script assignment references non-existent control ID: 795af479-abe2-8bf1-c23b-a3cd43794a9c |
| script-orphan-assignment | Send_CC_Selector_onBlur | — | Script assignment references non-existent control ID: 3e93d1ea-2a5f-cf45-7df3-5d5452183c3e |
| script-orphan-assignment | Send_To_Selector_onBlur | — | Script assignment references non-existent control ID: 8c9ce8fe-f995-e01c-affc-9e472fe4ebb6 |
| script-orphan-assignment | Process_Name_onBlur | — | Script assignment references non-existent control ID: b7e6429c-7dff-43ad-3f56-4d30360a36c9 |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| script-orphan-assignment | Subject_Line_onBlur | — | Script assignment references non-existent control ID: 00279bdb-da12-3d08-50f7-52bafee9ff30 |
| script-orphan-assignment | Region_Code_onBlur | — | Script assignment references non-existent control ID: 5f763a52-df66-8455-b6c4-261c37fff56f |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | Send_Select_onBlur | — | Script assignment references non-existent control ID: d5979a62-84ea-f539-eec9-29c977c72f4c |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| container-responsive-flow | Con_CommunicationType | Page 1 | Container has 6 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| container-responsive-flow | Con_Region_Zone | Page 1 | Container has 2 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| container-responsive-flow | Con_SendToDetails | Page 1 | Container has 5 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| container-responsive-flow | Con_Subject | Page 1 | Container has 2 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| container-responsive-flow | Con_MessageBody | Page 1 | Container has 3 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| container-responsive-flow | Con_Send | Page 1 | Container has 6 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| container-responsive-flow | Con_DateSent | Page 1 | Container has 2 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| container-responsive-flow | Con_Documents | Page 1 | Container has 2 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| container-responsive-flow | Con_Attachment | Page 1 | Container has 2 fields but ResponsiveFlow is not set to 1 Column or 2 Columns (current: none) |
| simple-upload | ubtnDocuments | Page 1 | DisplayUploadedFiles is not set — should be false (simple upload mode) |
| simple-upload | ubtnAttachment | Page 1 | DisplayUploadedFiles is not set — should be false (simple upload mode) |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| label-overlap | Scheduled Date | Page 1 | Label "redMark3" overlaps field by 10px |
| label-overlap | Status | Page 1 | Label "DataField3" overlaps field by 12px |
| label-overlap | Other Record | Page 1 | Label "Label73" overlaps field by 12px |
| button-min-size | btnEmailTypeHelp | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| accessibility-label-match | btnEmailTypeHelp | Page 1 | AccessibilityLabel "Quick Help for Email Type" does not match expected "?" |
| accessibility-label-match | Region | Page 1 | AccessibilityLabel "Region Code required field" does not match expected "Region" |
| accessibility-label-match | Scheduled Date | Page 1 | AccessibilityLabel "Scheduled Date field Required" does not match expected "When to send" |
| accessibility-label-match | Communication Date | Page 1 | AccessibilityLabel "Communication Date" does not match expected "Date Sent" |
| accessibility-label-match | btnPrint | Page 1 | AccessibilityLabel "Print Button" does not match expected "Print" |
| accessibility-label-match | btnSave | Page 1 | AccessibilityLabel "Save Button" does not match expected "Save" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| button-label-camelcase | redMark1 | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | redMark2 | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | redMark3 | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| group-override-condition | Attachment | — | Group does not reference an override field in its conditions |
| group-override-condition | Documents | — | Group does not reference an override field in its conditions |
| group-override-condition | Required Immediate Send and Digest | — | Group does not reference an override field in its conditions |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | lblAttachmentInstructions | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField4 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField7 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField5 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| spelling | Sent/Recorded By | Page 1 | Possible misspelling: "Sent/Recorded" (suggestions: no suggestions) |
| listener-disabled | Communication Type | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Email Type | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Region | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Email Template | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Email Recipients | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | CC | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Subject | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Email Body | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Approved | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Scheduled Date | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Communication Date | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Status | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Primary Record ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Other Record | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Sent/Recorded By | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Communication Type Filter | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Year | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Document Type | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Communication Sent | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Mobile Phone Number | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
