# Standards Review: Typed-Water

Generated: 2026-04-15 | Rules: 40 | Findings: 33 (0 errors, 25 warnings, 8 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 25 |
| Info     | 8 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| default-name | Image31 | Page 1 | Default field name "Image31" — use a descriptive name |
| accessibility-label | Temp Data Migration ID | Page 1 | Missing AccessibilityLabel |
| accessibility-required | Activity | Page 1 | Required field AccessibilityLabel "Activity - required field" should end with "field Required" |
| script-orphan-assignment | Water_Type_onBlur | — | Script assignment references non-existent control ID: 1fe5ff5f-69e0-d0e5-0c0c-a39abf5399b8 |
| script-orphan-assignment | Felling_And_Bucking_onBlur | — | Script assignment references non-existent control ID: a518f050-be3b-103a-e0f5-1fb45237e903 |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| script-orphan-assignment | Suspending_Cables_onBlur | — | Script assignment references non-existent control ID: 9f5fc6d2-e27b-1985-ef30-05fc64d6bc6e |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | Other_onBlur | — | Script assignment references non-existent control ID: a466ce7d-c0ab-7e1e-6b63-1f27c51fc597 |
| script-orphan-assignment | Water_Type_onChange | — | Script assignment references non-existent control ID: 1fe5ff5f-69e0-d0e5-0c0c-a39abf5399b8 |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| script-orphan-assignment | Beaver_Dam_Removal_onBlur | — | Script assignment references non-existent control ID: b886d233-1269-e95c-e14a-9135b80a228b |
| script-orphan-assignment | All_Options_onBlur | — | Script assignment references non-existent control ID: 6fd14c30-5c0e-07bc-eb88-72a6118dfe35 |
| script-orphan-assignment | LWD_Placement_Removal_onBlur | — | Script assignment references non-existent control ID: d2f46fab-bf19-b91d-1f5a-177d121a6222 |
| script-orphan-assignment | Equipment_Crossing_onBlur | — | Script assignment references non-existent control ID: e1f29508-288a-e2ee-aae4-8daf35360c01 |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | Cable_Yarding_onBlur | — | Script assignment references non-existent control ID: 26c57421-a996-60d4-b8f7-6e55d805d90d |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| button-min-size | btnHelpActivity | Page 1 | Button is 20x20px — minimum is 24x24px (508 compliance) |
| accessibility-label-match | Activity | Page 1 | AccessibilityLabel "Activity - required field" does not match expected "Activity" |
| accessibility-label-match | btnHelpActivity | Page 1 | AccessibilityLabel "Quick Help: Activity" does not match expected "?" |
| accessibility-label-match | btnSave | Page 1 | AccessibilityLabel "Save Button" does not match expected "Save" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| button-label-camelcase | fpOnlineTitle | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| tab-control-visible | TabControl | — | TabControl is in group "Hide Form Tabs" — tab visibility should be controlled via Menu tab, not groups |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| group-override-condition | Hide Form Tabs | — | Group does not reference an override field in its conditions |
| label-unnamed-in-group | fpOnlineTitle | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| spelling | Type Ns Water | Page 1 | Possible misspelling: "Ns" (suggestions: Na, Nd, Ne) |
| listener-disabled | Related Record ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Temp Data Migration ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
