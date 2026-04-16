# Standards Review: Timber

Generated: 2026-04-15 | Rules: 40 | Findings: 88 (0 errors, 37 warnings, 51 info)

## Summary

| Severity | Count |
| :------- | ----: |
| Error    | 0 |
| Warning  | 37 |
| Info     | 51 |

## Warnings

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| title-case | Greater than or equal to 10 dbh | Page 1 | Field name "Greater than or equal to 10 dbh" is not in Title Case |
| title-case | Less than 10 dbh | Page 1 | Field name "Less than 10 dbh" is not in Title Case |
| default-name | Image64 | Page 1 | Default field name "Image64" — use a descriptive name |
| accessibility-label | Acres Harvested | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Volume Harvested | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Biomass Volume Harvested | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Volume Harvested Percentage | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Steepest Slope Harvest Unit | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Salvage Volume Harvested | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Greater than or equal to 10 dbh | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Less than 10 dbh | Page 1 | Missing AccessibilityLabel |
| accessibility-label | Temp Data Migration ID | Page 1 | Missing AccessibilityLabel |
| script-orphan-assignment | Salvage_Volume_Harvested_onBlur | — | Script assignment references non-existent control ID: 2d9f05c2-d918-91a3-5508-f19dc65ac040 |
| script-orphan-assignment | btnTabFourOne_onClick | — | Script assignment references non-existent control ID: ede21e46-85e5-9232-15c3-572e995ebf29 |
| script-orphan-assignment | Harvest_Type_All_onChange | — | Script assignment references non-existent control ID: 6786a259-e9b1-a516-6722-dde5b0d61073 |
| script-orphan-assignment | Logging_System_All_onChange | — | Script assignment references non-existent control ID: cdc2199f-e1ca-a0b5-e2b6-c3825154e047 |
| script-orphan-assignment | Volume_Harvested_Percentage_onBlur | — | Script assignment references non-existent control ID: eb4bb6d6-3251-9d66-2b06-427f8777151b |
| script-orphan-assignment | Harvest_Type_All_onBlur | — | Script assignment references non-existent control ID: 6786a259-e9b1-a516-6722-dde5b0d61073 |
| script-orphan-assignment | Less_than_10_dbh_onBlur | — | Script assignment references non-existent control ID: c7b7e591-aaae-3a69-19b9-3ae55a785775 |
| script-orphan-assignment | Greater_than_or_equal_to_10_dbh_onBlur | — | Script assignment references non-existent control ID: e239afd1-853a-f93f-b982-745cb7af9e42 |
| script-orphan-assignment | Logging_System_All_onBlur | — | Script assignment references non-existent control ID: cdc2199f-e1ca-a0b5-e2b6-c3825154e047 |
| script-orphan-assignment | btnTabFourTwo_onClick | — | Script assignment references non-existent control ID: 63d8f4ec-1ad7-e63b-78c0-862e7b86c7fb |
| script-orphan-assignment | Acres_Harvested_onBlur | — | Script assignment references non-existent control ID: 3d80d4de-8416-3365-7170-72f2d9b4df5f |
| script-orphan-assignment | Biomass_Volume_Harvested_onBlur | — | Script assignment references non-existent control ID: 81a00665-ee4d-a453-3e64-a015d33ea691 |
| script-orphan-assignment | btnClose1_onClick | — | Script assignment references non-existent control ID: a4f97f0c-71b3-74d4-4ac2-3a7e899a1bce |
| script-orphan-assignment | Volume_Harvested_onBlur | — | Script assignment references non-existent control ID: 46f44f8d-03da-cf0d-db8f-134ec261c78b |
| script-orphan-assignment | btnClose2_onClick | — | Script assignment references non-existent control ID: dcc4c208-d05e-cac1-fade-70334c13b657 |
| script-orphan-assignment | Steepest_Slope_Harvested_Unit_onBlur | — | Script assignment references non-existent control ID: 29b1c2a7-4395-268e-1df8-e2d8d643589c |
| distance-to-border | Timber ID | Page 1 | Field is 10px from the right border (minimum: 30px) |
| accessibility-label-match | Cable Assist Tethered | Page 1 | AccessibilityLabel "Cable Assist Tethered" does not match expected "Cable assist/tethered" |
| accessibility-label-match | btnSave | Page 1 | AccessibilityLabel "Save Button" does not match expected "Save" |
| accessibility-label-match | btnAdminSave | Page 1 | AccessibilityLabel "Admin Save Button" does not match expected "Admin Save" |
| accessibility-label-match | Harvest Method List | Page 1 | AccessibilityLabel "Harvest Type List" does not match expected "Harvest Method List" |
| accessibility-label-match | Logging System List | Page 1 | AccessibilityLabel "Harvest Type List" does not match expected "Logging System List" |
| button-label-camelcase | Harvest Method | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| button-label-camelcase | Logging System | Page 1 | Label name should start with "lbl" prefix (camelCase convention) |
| tab-control-visible | TabControl | — | TabControl is in group "Hide Form Tabs" — tab visibility should be controlled via Menu tab, not groups |

## Info

| Rule | Field | Page | Message |
| :--- | :---- | :--- | :------ |
| group-override-condition | Hide Form Tabs | — | Group does not reference an override field in its conditions |
| label-unnamed-in-group | DataField2 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField1 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | Harvest Method | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | Logging System | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | lblSalvageVolumeHarvested | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | lblEstimatedNumOfTreesRemaining | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | lblGEQ10dbh | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | lblLT10dbh | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField3 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| label-unnamed-in-group | DataField4 | Page 1 | Label has a custom name but is not referenced in any group — only rename labels used in groups/conditions |
| spelling | Rubber Tired Skidder | Page 1 | Possible misspelling: "Skidder" (suggestions: Skidded, Kidder) |
| spelling | Tracked Skidder | Page 1 | Possible misspelling: "Skidder" (suggestions: Skidded, Kidder) |
| spelling | Dozer | Page 1 | Possible misspelling: "Dozer" (suggestions: Doper, Doter, Dower) |
| spelling | Slash Bundler | Page 1 | Possible misspelling: "Bundler" (suggestions: Bundled, Bundle, Bundles) |
| spelling | Greater than or equal to 10 dbh | Page 1 | Possible misspelling: "10" (suggestions: 0, 1) |
| spelling | Greater than or equal to 10 dbh | Page 1 | Possible misspelling: "dbh" (suggestions: db, dbl, duh) |
| spelling | Less than 10 dbh | Page 1 | Possible misspelling: "10" (suggestions: 0, 1) |
| spelling | Less than 10 dbh | Page 1 | Possible misspelling: "dbh" (suggestions: db, dbl, duh) |
| listener-disabled | Region Zone | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Harvest Unit Number | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Even Aged | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Uneven Aged | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Salvage | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Right of Way | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Rubber Tired Skidder | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Tracked Skidder | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Dozer | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Shovel | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Full Suspension Cable | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Leading End Suspension Cable | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Helicopter | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Cable Assist Tethered | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Animal | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Chipper | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Forwarder | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Slash Bundler | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Other | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Acres Harvested | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Volume Harvested | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Biomass Volume Harvested | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Volume Harvested Percentage | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Steepest Slope Harvest Unit | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Salvage Volume Harvested | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Greater than or equal to 10 dbh | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Less than 10 dbh | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Related Record ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Region | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Temp Data Migration ID | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Harvest Method List | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
| listener-disabled | Logging System List | Page 1 | EnableQListener is enabled — verify this field requires query string fill-in/relate capability |
