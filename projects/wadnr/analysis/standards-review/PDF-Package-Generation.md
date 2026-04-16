# Standards Review: PDF-Package-Generation

Generated: 2026-04-15 | Rules: 40 | Findings: 22 (0 errors, 16 warnings, 6 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 16 |
| Info     | 6 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| title-case | Legacy PDF Processed | Page 1 | Field name "Legacy PDF Processed" is not in Title Case |
| default-name | Image57 | Page 1 | Default field name "Image57" — use a descriptive name |
| accessibility-label | Date Print Queued | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Date Printed | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Message | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Related Record ID | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Printing Order Read Only | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Legacy PDF Processed | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Print Order | Page 1 | Missing AccessibilityLabel |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| accessibility-label-match | btnQueueforPrinting | Page 1 | AccessibilityLabel "Save Button" does not match expected "Queue for Printing" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| group-override-condition | Printing Order Read Only | — | Group does not reference an override field in its conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | lbl123 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| spelling | DG PDF | Page 1 | Possible misspelling: "DG" (suggestions: CG, DB, DH) |
| listener-disabled | Related Record ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| field-max-length | Message | Page 1 | TextArea MaxLength is 50 — recommended minimum is 3000 for notes/text fields |
