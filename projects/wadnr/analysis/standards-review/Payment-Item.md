# Standards Review: Payment-Item

Generated: 2026-04-15 | Rules: 40 | Findings: 40 (0 errors, 29 warnings, 11 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 29 |
| Info     | 11 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| title-case | GL Account | Page 1 | Field name "GL Account" is not in Title Case |
| title-case | OnLoad Calculated Fee Balance | Page 1 | Field name "OnLoad Calculated Fee Balance" is not in Title Case |
| title-case | Refund GUID | Page 1 | Field name "Refund GUID" is not in Title Case |
| default-name | Image78 | Page 1 | Default field name "Image78" — use a descriptive name |
| accessibility-label | Refund Started | Page 1 | Missing AccessibilityLabel |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| field-multiple-groups | Due Date | — | Field appears in 2 groups: Read Only Fields, Visible Transaction Type - Payment |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| label-overlap | Transaction Type | Page 1 | Label "Label73" overlaps field by 92px |
| label-overlap | Date of Transaction | Page 1 | Label "Label75" overlaps field by 102px |
| label-overlap | Payment Method | Page 1 | Label "Label76" overlaps field by 92px |
| label-overlap | Item Balance Due | Page 1 | Label "Label77" overlaps field by 92px |
| label-overlap | Original Transaction Amount | Page 1 | Label "Label85" overlaps field by 92px |
| label-overlap | Date of Original Transaction | Page 1 | Label "Label59" overlaps field by 92px |
| label-overlap | Refund Reason | Page 1 | Label "Label87" overlaps field by 92px |
| label-overlap | Refund Reason Other | Page 1 | Label "Label93" overlaps field by 22px |
| label-overlap | Transaction Amount | Page 1 | Label "Label88" overlaps field by 92px |
| label-overlap | Status | Page 1 | Label "DataField3" overlaps field by 42px |
| label-overlap | OnLoad Calculated Fee Balance | Page 1 | Label "DataField1" overlaps field by 62px |
| label-overlap | Refundable | Page 1 | Label "Label68" overlaps field by 182px |
| accessibility-label-match | btnSave | Page 1 | AccessibilityLabel "Save Button" does not match expected "Save" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| accessibility-label-match | btnStartRefund | Page 1 | AccessibilityLabel "Start Refund Button" does not match expected "Start Refund" |
| accessibility-label-match | btnOpenRefund | Page 1 | AccessibilityLabel "Open Refund Button" does not match expected "Open Refund" |
| button-label-camelcase | fpOnlineTitle | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | LicenseID | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| label-unnamed-in-group | fpOnlineTitle | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | LicenseID | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField4 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| spelling | DG Fee | Page 1 | Possible misspelling: "DG" (suggestions: CG, DB, DH) |
| spelling | GL Account | Page 1 | Possible misspelling: "GL" (suggestions: BL, FL, GK) |
| spelling | OnLoad Calculated Fee Balance | Page 1 | Possible misspelling: "OnLoad" (suggestions: UnLoad) |
| spelling | Refund GUID | Page 1 | Possible misspelling: "GUID" (suggestions: GRID, GUIDE, GUIDO) |
| listener-disabled | Related Payment Item ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
