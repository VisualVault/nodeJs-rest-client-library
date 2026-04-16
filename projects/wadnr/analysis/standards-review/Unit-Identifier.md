# Standards Review: Unit-Identifier

Generated: 2026-04-15 | Rules: 40 | Findings: 24 (0 errors, 17 warnings, 7 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 17 |
| Info     | 7 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| default-name | Image57 | Page 1 | Default field name "Image57" — use a descriptive name |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| field-multiple-groups | Con_HiddenSection | — | Field appears in 2 groups: Hidden Fields, HideFormControls |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| label-overlap | btnHelpUnitIdentifier | Page 1 | Label "Label61" overlaps field by 152px |
| label-overlap | btnHelpDescription | Page 1 | Label "DataField4" overlaps field by 30px |
| button-min-size | btnHelpUnitIdentifier | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| button-min-size | btnHelpDescription | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| accessibility-label-match | btnHelpUnitIdentifier | Page 1 | AccessibilityLabel "Quick help unit identifier" does not match expected "?" |
| accessibility-label-match | btnHelpDescription | Page 1 | AccessibilityLabel "Quick help description" does not match expected "?" |
| accessibility-label-match | btnSave | Page 1 | AccessibilityLabel "Save button" does not match expected "Save" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| accessibility-label-match | Related Record ID | Page 1 | AccessibilityLabel "Tab Control" does not match expected "Related Record ID" |
| accessibility-label-match | btnSaveDraft | Page 1 | AccessibilityLabel "Save draft button" does not match expected "Save Draft" |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField4 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| spelling | Within 300 of the Unit | Page 1 | Possible misspelling: "300" (suggestions: 0, 300th, 30th) |
| listener-disabled | Related Record ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| field-max-length | Description | Page 1 | TextArea MaxLength is 1000 — recommended minimum is 3000 for notes/text fields |
