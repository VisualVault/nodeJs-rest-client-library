# Standards Review: Forest-Tax-Number

Generated: 2026-04-15 | Rules: 40 | Findings: 24 (0 errors, 18 warnings, 6 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 18 |
| Info     | 6 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| default-name | Image46 | Page 1 | Default field name "Image46" — use a descriptive name |
| accessibility-label | Temp Data Migration ID | Page 1 | Missing AccessibilityLabel |
| script-orphan-assignment | btnSearchWithModal_onClick | — | Script assignment references non-existent control ID: a571d7e8-2ebb-6332-6975-9e58d8c1711a |
| script-orphan-assignment | btn_SearchContact_onClick | — | Script assignment references non-existent control ID: 4258ef57-bda6-2d29-6b19-0669a2e27d16 |
| script-orphan-assignment | btn_AddContact_onClick | — | Script assignment references non-existent control ID: 7bd046c8-f30e-b42d-571c-2295b559e772 |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | btnTestCalculateBusinessDate_onClick | — | Script assignment references non-existent control ID: 75b1aebd-00a5-e5d5-2e27-f700a78e78a1 |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| script-orphan-assignment | btnSearch_onClick | — | Script assignment references non-existent control ID: 0f1c635c-599e-6cce-cc2b-00b42a8d024c |
| distance-to-border | Top Form ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| label-overlap | Status | Page 1 | Label "DataField3" overlaps field by 12px |
| accessibility-label-match | btnSave | Page 1 | AccessibilityLabel "Save Button" does not match expected "Save" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| button-label-camelcase | fpOnlineTitle | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| admin-override-security | Con_AdminSection | Page 1 | Admin Override container is not in any group — must have VaultAccess-only visibility |
| save-button-hidden | SaveButton | — | SaveButton FormControl is not in any group — it should always be hidden |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| label-unnamed-in-group | fpOnlineTitle | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| listener-disabled | Related Record ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Temp Data Migration ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
