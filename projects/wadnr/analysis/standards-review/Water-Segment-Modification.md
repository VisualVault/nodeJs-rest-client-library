# Standards Review: Water-Segment-Modification

Generated: 2026-04-15 | Rules: 40 | Findings: 29 (0 errors, 22 warnings, 7 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 22 |
| Info     | 7 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| default-name | Image57 | Page 1 | Default field name "Image57" — use a descriptive name |
| accessibility-label | Water Segment Identifier | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Name of Water | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Tributary To | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Current Water Type | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Proposed Water Type | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Dates of Field Assessment | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Temp Data Migration ID | Page 1 | Missing AccessibilityLabel |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| button-min-size | btn_HelpWaterSegmentIdentifier | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| button-min-size | btn_HelpNameofWater | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| button-min-size | btn_HelpTributaryTo | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| button-min-size | btn_HelpCurrentWaterType | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| button-min-size | btn_HelpProposedWaterType | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| button-min-size | btn_HelpDatesofFieldAssessment | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| accessibility-label-match | Related Record ID | Page 1 | AccessibilityLabel "Tab Control" does not match expected "Related Record ID" |
| tab-control-visible | TabControl | — | TabControl is in group "Hide Form Tabs" — tab visibility should be controlled via Menu tab, not groups |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| group-override-condition | Hide Form Tabs | — | Group does not reference an override field in its conditions |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| listener-disabled | Related Record ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Temp Data Migration ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| field-max-length | Name of Water | Page 1 | MaxLength is 50 for name field — recommended minimum is 100 |
