# Standards Review: Individual-Record

Generated: 2026-04-15 | Rules: 40 | Findings: 59 (0 errors, 35 warnings, 24 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 35 |
| Info     | 24 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| default-name | Image57 | Page 1 | Default field name "Image57" — use a descriptive name |
| accessibility-label | Country | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Address Line 1 | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Address Line 2 | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Address Line 3 | Page 1 | Missing AccessibilityLabel |
| accessibility-label | City | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Individual State | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Individual Province | Page 1 | Missing AccessibilityLabel |
| accessibility-label | County | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Form Saved | Page 1 | Missing AccessibilityLabel |
| accessibility-label | User Groups | Page 1 | Missing AccessibilityLabel |
| accessibility-required | First Name | Page 1 | Required field AccessibilityLabel "First Name" should end with "field Required" |
| accessibility-required | Last Name | Page 1 | Required field AccessibilityLabel "Last Name" should end with "field Required" |
| accessibility-required | Email | Page 1 | Required field AccessibilityLabel "Email" should end with "field Required" |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| script-unused-template | AddressFieldNamesMap | — | Template helper "AddressFieldNamesMap" is never referenced from any other script |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| label-overlap | Zip Code | Page 1 | Label "Label77" overlaps field by 13px |
| label-overlap | Address Line 1 | Page 1 | Label "Label79" overlaps field by 40px |
| label-overlap | Address Line 2 | Page 1 | Label "Label81" overlaps field by 40px |
| label-overlap | Address Line 3 | Page 1 | Label "Label82" overlaps field by 40px |
| label-overlap | City | Page 1 | Label "Label83" overlaps field by 40px |
| label-overlap | County | Page 1 | Label "Label90" overlaps field by 110px |
| accessibility-label-match | External Reviewer | Page 1 | AccessibilityLabel "External Reviewer" does not match expected "Is Reviewer" |
| accessibility-label-match | Phone | Page 1 | AccessibilityLabel "Email" does not match expected "Phone" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| accessibility-label-match | State | Page 1 | AccessibilityLabel "User ID" does not match expected "State" |
| button-label-camelcase | User Registration Label | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | fpOnlineTitle | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | Lbl_State | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | Lbl_Province | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | bntSave | Page 1 | Button name should start with "btn" prefix (camelCase convention) |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| group-override-condition | Read Only Reviewer Field | — | Group does not reference an override field in its conditions |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| listener-disabled | First Name | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Last Name | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Email | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Phone | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Country | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Zip Code | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Address Line 1 | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Address Line 2 | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Address Line 3 | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | City | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Individual State | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | County | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | User ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | State | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| field-max-length | First Name | Page 1 | MaxLength is 50 for name field — recommended minimum is 100 |
| field-max-length | Last Name | Page 1 | MaxLength is 50 for name field — recommended minimum is 100 |
| field-max-length | Address Line 1 | Page 1 | MaxLength is 50 for address field — recommended minimum is 300 |
| field-max-length | Address Line 2 | Page 1 | MaxLength is 50 for address field — recommended minimum is 300 |
| field-max-length | Address Line 3 | Page 1 | MaxLength is 50 for address field — recommended minimum is 300 |
| field-max-length | User Groups | Page 1 | TextArea MaxLength is 250 — recommended minimum is 3000 for notes/text fields |
