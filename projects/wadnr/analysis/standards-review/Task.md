# Standards Review: Task

Generated: 2026-04-15 | Rules: 40 | Findings: 50 (0 errors, 22 warnings, 28 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 22 |
| Info     | 28 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| title-case | DNR Staff Assigned | Page 1 | Field name "DNR Staff Assigned" is not in Title Case |
| title-case | DNR Staff Assigned User ID | Page 1 | Field name "DNR Staff Assigned User ID" is not in Title Case |
| title-case | UserRoles | Page 1 | Field name "UserRoles" is not in Title Case |
| title-case | IsOfficeStaff | Page 1 | Field name "IsOfficeStaff" is not in Title Case |
| title-case | isInternalPersonnel | Page 1 | Field name "isInternalPersonnel" is not in Title Case |
| title-case | isFieldStaff | Page 1 | Field name "isFieldStaff" is not in Title Case |
| title-case | isGISEditor | Page 1 | Field name "isGISEditor" is not in Title Case |
| title-case | IsCurrentUserCreator | Page 1 | Field name "IsCurrentUserCreator" is not in Title Case |
| title-case | IsCurrentUserAssignee | Page 1 | Field name "IsCurrentUserAssignee" is not in Title Case |
| title-case | Notification was send | Page 1 | Field name "Notification was send" is not in Title Case |
| default-name | Image57 | Page 1 | Default field name "Image57" — use a descriptive name |
| accessibility-label | Form Saved | Page 1 | Missing AccessibilityLabel |
| accessibility-required | DNR Staff Assigned | Page 1 | Required field AccessibilityLabel "DNR Staff Assigned" should end with "field Required" |
| accessibility-required | Title | Page 1 | Required field AccessibilityLabel "Title" should end with "field Required" |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| accessibility-label-match | btnSave | Page 1 | AccessibilityLabel "Save Button" does not match expected "Save" |
| accessibility-label-match | btnComplete | Page 1 | AccessibilityLabel "Complete Button" does not match expected "Complete" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| accessibility-label-match | Creator Position Management Form ID | Page 1 | AccessibilityLabel "Creator Position Management Form ID" does not match expected "Creator PM Form ID" |
| accessibility-label-match | Notification was send | Page 1 | AccessibilityLabel "IsCurrentUserCreator" does not match expected "Notification was send" |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| calendar-name-match | Date Created | Page 1 | Name suggests date-only but enableTime is ON (Config D: DateTime + IgnoreTZ) — verify time component is needed |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField4 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField5 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField6 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| spelling | DNR Staff Assigned | Page 1 | Possible misspelling: "DNR" (suggestions: DVR, DAR, DIR) |
| spelling | DNR Staff Assigned User ID | Page 1 | Possible misspelling: "DNR" (suggestions: DVR, DAR, DIR) |
| spelling | UserRoles | Page 1 | Possible misspelling: "UserRoles" (suggestions: no suggestions) |
| spelling | IsOfficeStaff | Page 1 | Possible misspelling: "IsOfficeStaff" (suggestions: no suggestions) |
| spelling | isInternalPersonnel | Page 1 | Possible misspelling: "isInternalPersonnel" (suggestions: no suggestions) |
| spelling | isFieldStaff | Page 1 | Possible misspelling: "isFieldStaff" (suggestions: no suggestions) |
| spelling | isGISEditor | Page 1 | Possible misspelling: "isGISEditor" (suggestions: no suggestions) |
| spelling | IsCurrentUserCreator | Page 1 | Possible misspelling: "IsCurrentUserCreator" (suggestions: no suggestions) |
| spelling | IsCurrentUserAssignee | Page 1 | Possible misspelling: "IsCurrentUserAssignee" (suggestions: no suggestions) |
| listener-disabled | DNR Staff Assigned | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Title | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Status | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Creator | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Date Created | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Date Completed | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | DNR Staff Assigned User ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | UserRoles | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | IsOfficeStaff | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | isInternalPersonnel | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | isFieldStaff | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| field-max-length | Description of Task | Page 1 | TextArea MaxLength is 2000 — recommended minimum is 3000 for notes/text fields |
