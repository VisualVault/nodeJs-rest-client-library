# WADNR Scheduled Services

Extracted from scheduleradmin on vv5dev (WADNR/fpOnline). Generated: 2026-04-08

## Disabled (8)

|   # | Schedule Name                          | Service                                                                                                     | Recurrence             | Run State | Last Run    | Next Run            |
| --: | :------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :--------------------- | :-------- | :---------- | :------------------ |
|   1 | FeeSCHFinalizePendingTransactions      | [FeeSCHFinalizePendingTransactions](../web-services/scripts/FeeSCHFinalizePendingTransactions.js)           | Every 1 Days           | Idle      | Not Run Yet | 1/9/2025 10:10 AM   |
|   2 | FeeSCHInstallmentReminderNotifications | [FeeSCHInstallmentReminderNotifications](../web-services/scripts/FeeSCHInstallmentReminderNotifications.js) | Every 1 Days           | Idle      | Not Run Yet | 1/9/2025 10:15 AM   |
|   3 | fpnpLoadTesting                        | [fpnpLoadTesting](../web-services/scripts/fpnpLoadTesting.js)                                               | Recurrence Not Enabled | Idle      | Not Run Yet | 3/13/2026 1:19 PM   |
|   4 | LibCreatezActivtyMapGISJSON            | [LibCreatezActivtyMapGISJSON](../web-services/scripts/LibCreatezActivtyMapGISJSON.js)                       | Every 1 Years          | Idle      | Not Run Yet | 12/11/2024 10:52 AM |
|   5 | PostMapToGISFolder                     | [CommunicationLogSendDigest](../web-services/scripts/CommunicationLogSendDigest.js)                         | Every 365 Days         | Idle      | Not Run Yet | 11/22/2024 7:57 AM  |
|   6 | SCHFPANExpirationClearOfflineFlags     | [SCHFPANExpirationClearOfflineFlags](../web-services/scripts/SCHFPANExpirationClearOfflineFlags.js)         | Every 24 Hours         | Idle      | Not Run Yet | 2/4/2026 7:43 AM    |
|   7 | SCHSoftDeleteWarningNotifications      | [SCHSoftDeleteWarningNotifications](../web-services/scripts/SCHSoftDeleteWarningNotifications.js)           | Every 1 Days           | Idle      | Not Run Yet | 4/10/2025 5:25 AM   |
|   8 | SendReconciliationReport               | [sendReconciliationReport](../web-services/scripts/sendReconciliationReport.js)                             | Every 1 Days           | Idle      | Not Run Yet | 11/20/2025 1:35 PM  |

## Enabled (13)

|   # | Schedule Name                         | Service                                                                                                           | Recurrence       | Run State | Last Run          | Next Run          |
| --: | :------------------------------------ | :---------------------------------------------------------------------------------------------------------------- | :--------------- | :-------- | :---------------- | :---------------- |
|   1 | AGOLPostFponlineDataToAGOLTables      | [AGOLPostFponlineDataToAGOLTables](../web-services/scripts/AGOLPostFponlineDataToAGOLTables.js)                   | Every 1 Days     | Idle      | 4/8/2026 12:15 AM | 4/9/2026 12:15 AM |
|   2 | AGOLSendUpdatedDataToPendingDataForm  | [AGOLSendUpdatedDataToPendingDataForm](../web-services/scripts/AGOLSendUpdatedDataToPendingDataForm.js)           | Every 1 Days     | Idle      | 4/8/2026 12:00 AM | 4/9/2026 12:00 AM |
|   3 | CommunicationLogSendDigest            | [CommunicationLogSendDigest](../web-services/scripts/CommunicationLogSendDigest.js)                               | Every 1 Days     | Idle      | 4/7/2026 7:00 PM  | 4/8/2026 7:00 PM  |
|   4 | CommunicationLogSendImmediate         | [CommunicationLogSendImmediate](../web-services/scripts/CommunicationLogSendImmediate.js)                         | Every 15 Minutes | Idle      | 4/8/2026 1:48 PM  | 4/8/2026 2:03 PM  |
|   5 | PostPermitsToDOR                      | [PostPermitsToDOR](../web-services/scripts/PostPermitsToDOR.js)                                                   | Every 24 Hours   | Idle      | 4/8/2026 12:01 AM | 4/9/2026 12:01 AM |
|   6 | SCH_FPNP_NotificationSystem           | [SCH_FPNP_NotificationSystem](../web-services/scripts/SCH_FPNP_NotificationSystem.js)                             | Every 1 Days     | Idle      | 4/7/2026 6:00 PM  | 4/8/2026 6:00 PM  |
|   7 | SCHExpirationMaintenanceInARP         | [SCHExpirationMaintenanceInARP](../web-services/scripts/SCHExpirationMaintenanceInARP.js)                         | Every 1 Days     | Idle      | 4/8/2026 2:00 AM  | 4/9/2026 2:00 AM  |
|   8 | SCHGenerateWorkQueueExcelFiles        | [SCHGenerateWorkQueueExcelFiles](../web-services/scripts/SCHGenerateWorkQueueExcelFiles.js)                       | Every 1 Days     | Idle      | 4/8/2026 12:01 AM | 4/9/2026 12:01 AM |
|   9 | SCHHardDeleteReadyRecords             | [SCHHardDeleteReadyRecords](../web-services/scripts/SCHHardDeleteReadyRecords.js)                                 | Every 1 Days     | Idle      | 4/8/2026 8:10 AM  | 4/9/2026 8:10 AM  |
|  10 | SCHRemindExternalReviewerNotification | [ReminderExternalReviewerEmailNotification](../web-services/scripts/ReminderExternalReviewerEmailNotification.js) | Every 1 Days     | Idle      | 4/8/2026 7:07 AM  | 4/9/2026 7:07 AM  |
|  11 | SCHRetriggerBoxWorkflow               | [SCHRetriggerBoxWorkflow](../web-services/scripts/SCHRetriggerBoxWorkflow.js)                                     | Every 5 Hours    | Idle      | 4/8/2026 11:04 AM | 4/8/2026 4:04 PM  |
|  12 | SCHSoftDeleteStaleRecords             | [SCHSoftDeleteStaleRecords](../web-services/scripts/SCHSoftDeleteStaleRecords.js)                                 | Every 1 Days     | Idle      | 4/8/2026 5:32 AM  | 4/9/2026 5:32 AM  |
|  13 | ShoppingCartSCHDisableStaleCarts      | [ShoppingCartSCHDisableStaleCarts](../web-services/scripts/ShoppingCartSCHDisableStaleCarts.js)                   | Every 1 Weeks    | Idle      | 4/7/2026 9:30 AM  | 4/14/2026 9:30 AM |

**Total**: 21 items
