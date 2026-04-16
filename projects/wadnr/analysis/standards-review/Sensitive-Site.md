# Standards Review: Sensitive-Site

Generated: 2026-04-15 | Rules: 40 | Findings: 24 (0 errors, 16 warnings, 8 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 16 |
| Info     | 8 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| default-name | Image57 | Page 1 | Default field name "Image57" — use a descriptive name |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| button-min-size | btn_HelpSiteIdentifier | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| accessibility-label-match | btn_HelpSiteIdentifier | Page 1 | AccessibilityLabel "Quick Help: Site Identifier" does not match expected "?" |
| accessibility-label-match | Describe Water Type And Sensitive Sites | Page 1 | AccessibilityLabel "Describe Water Type And Sensitive Sites Field Required" does not match expected "Describe how you marked water type breaks and sensitive sites on the ground" |
| accessibility-label-match | btnSave | Page 1 | AccessibilityLabel "Save Button" does not match expected "Save" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| button-label-camelcase | Template Title | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | Section Title | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | Site Type Label | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | Description Label | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| tab-control-visible | TabControl | — | TabControl is in group "Hide Form Tabs" — tab visibility should be controlled via Menu tab, not groups |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| group-override-condition | Hide Form Tabs | — | Group does not reference an override field in its conditions |
| label-unnamed-in-group | Template Title | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | Section Title | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | Site Type Label | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | Description Label | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| listener-disabled | Related Record ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
