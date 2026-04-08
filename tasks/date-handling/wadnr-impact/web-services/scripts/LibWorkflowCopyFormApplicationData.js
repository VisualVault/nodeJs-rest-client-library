/**
 * LibWorkflowCopyFormApplicationData
 * Category: Workflow
 * Modified: 2026-04-01T11:32:59.54Z by alfredo.scilabra@visualvault.com
 * Script ID: Script Id: 9c1e9ab0-929b-f011-82f7-d5d994194593
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const fs = require('fs');

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = 'WADNR';
    options.databaseAlias = 'fpOnline';
    options.userId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.password = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    options.clientId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.clientSecret = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    return options;
};

module.exports.main = async function (ffCollection, vvClient, response) {
    /*
    Script Name:    LibWorkflowCopyFormApplicationData
    Customer:       WADNR
    Purpose:        The LibWorkflowCopyFormApplicationData library creates a new target form and copies
                    transferable data from an existing source form to support resubmittals and similar reuse
                    scenarios. It is status-agnostic (the source may be in any status) and supports the following
                    forms in scope:
                      o Forest Practices Application/Notification (FPAN)
                      o Forest Practices Aerial Chemical Application
                      o Step 1 Long Term FPA
    Preconditions:
                    - List of libraries, form, queries, etc. that must exist in order this code to run
                    - You can also list other preconditions as users permissions, environments, etc
    Parameters:
                    - Source Form ID: (String, Required) — instanceName of the form to copy from
                    - Form Type:  (String, Required) — template type of the target form to be created.
                                  Must be one of the VALID_FORM_TYPES constant
                    - Individual ID: (String, Optional) - if present will replace Individual ID in copied application

    Pseudo code:
                    1   Creates a new target form instance of the requested FormType in status System
                        Processing with no data copied initially.
                    2   Copies user-entered answers (including Region and Project Name) while excluding
                        system/audit fields, ArcGIS AGOL files (activity map tool), and never copying FPAN
                        Number.
                    3   Discovers and copies all existing subforms related to the SourceFormID, recreates them,
                        and links the new subform records back to the target.
                    4   Copies and relates documents (attachments); because the target will not have an FPAN
                        Number at copy time, documents are always written to the target’s temp folder.
                    5   Creates all necessary subform relationships so the target is immediately usable.
                    6   Once all answers, subforms, relationships, and attachments are successfully copied,
                        updates the target form status to Draft


    Date of Dev:    09/26/2025

    Revision Notes:
                    09/26/2025 - Alfredo Scilabra: First Setup of the script
                    12/17/2025 - Mauro Rapuano - Added sectionsMap and questionsMap when copying FPAN
                    12/17/2025 - Lucas Herrera - Fixed relateRecordToDocument function usage
                    02/24/2026 - John Sevilla - Update copy subforms to use "Related Record ID" to retrieve related forms
                    03/04/2026 - Alfredo Scilabra - Set form originator for subforms so they can be opened by office staffs and proponents
                    03/06/2026 - Alfredo Scilabra - Fix S or F water subform copy
                    03/19/2026 - Alfredo Scilabra - Update Created By field so the creator of the copy can see it on draft queue
                    04/01/2026 - Alfredo Scilabra - Add missing fields for Contact Information Relation

  logger.info(`Start of the process LibWorkflowCopyFormApplicationData at ${Date()}`);

  /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */
    //Each obj contains a mapping like {filedNameInDb:fieldNameInForm}
    const FIELD_NAMES_TO_COPY_BY_FORM_TYPE = new Map([
        [
            'Forest Practices Application Notification',
            {
                'project Name': 'Project Name',
                'show All Questions': 'Show All Questions',
                region: 'Region',
                'long Term Application': 'Long Term Application',
                'multiyear Permit': 'Multiyear Permit',
                'multiple Landowners': 'Multiple Landowners',
                'multiple Timber Owners': 'Multiple Timber Owners',
                'multiple Operators': 'Multiple Operators',
                'multiple Contacts': 'Multiple Contacts',
                'land Conversion Three Years Of Harvest': 'Land Conversion Three Years Of Harvest',
                'small Forest Landowner': 'Small Forest Landowner',
                'small Forest Checklist RMAP': 'Small Forest Checklist RMAP',
                'historic Sites': 'Historic Sites',
                'historic Sites Information': 'Historic Sites Information',
                'substituting Prescriptions': 'Substituting Prescriptions',
                'unstable Slopes': 'Unstable Slopes',
                'park Name': 'Park Name',
                'water Typing Requirements': 'Water Typing Requirements',
                'hydraulic Projects Consultation': 'Hydraulic Projects Consultation',
                'structures Typed Water': 'Structures Typed Water',
                'activities Typed Water': 'Activities Typed Water',
                'constructing Abandoning Forest Roads': 'Constructing Abandoning Forest Roads',
                'depositing Spoils Rock Pit': 'Depositing Spoils Rock Pit',
                'operating Near Wetland': 'Operating Near Wetland',
                'harvesting Salvaging Timber': 'Harvesting Salvaging Timber',
                'first Name Contact Person': 'First Name Contact Person',
                'last Name Contact Person': 'Last Name Contact Person',
                'email Contact Person': 'Email Contact Person',
                earr: 'EARR',
                'reforestation Planting': 'Reforestation Planting',
                'tree Species': 'Tree Species',
                'reforestation Natural': 'Reforestation Natural',
                'reforestation Not Required': 'Reforestation Not Required',
                'over 80 Acres Ownership': 'Over 80 Acres Ownership',
                'exempt 20 Acre RMZ Rule': 'Exempt 20 Acre RMZ Rule',
                'situation Description ALL': 'Situation Description ALL',
                'situation Description ONE OR MORE': 'Situation Description ONE OR MORE',
                'exempt Parcel Harvesting': 'Exempt Parcel Harvesting',
                'exempt Parcel Type Np Harvesting': 'Exempt Parcel Type Np Harvesting',
                'harvesting Type SF Wetlands': 'Harvesting Type SF Wetlands',
                'harvesting 50 Feet Np': 'Harvesting 50 Feet Np',
                'harvest Salvage Boundaries': 'Harvest Salvage Boundaries',
                'clumped Wildlife Reserve Trees': 'Clumped Wildlife Reserve Trees',
                'right Of Way Limits': 'Right Of Way Limits',
                'stream Crossing Work': 'Stream Crossing Work',
                'riparian Management Zone Boundaries': 'Riparian Management Zone Boundaries',
                'channel Migration Zone': 'Channel Migration Zone',
                'wetland Management Zone Boundaries': 'Wetland Management Zone Boundaries',
                'small Forest One Or More Parcels': 'Small Forest One Or More Parcels',
                'small Forest Landowner Technical Assistance': 'Small Forest Landowner Technical Assistance',
                'alternative Plan': 'Alternative Plan',
                fffpp: 'FFFPP',
                'growth Area': 'Growth Area',
                cohp: 'COHP',
                'feet Public Park': 'Feet Public Park',
                cmz: 'CMZ',
                'bridge Construction Or Repair': 'Bridge Construction Or Repair',
                'multiyear Permit Length Requested': 'Multiyear Permit Length Requested',
                'public Park': 'Public Park',
                'wA Miles': 'WA Miles',
                'culvert Installation Or Repair': 'Culvert Installation Or Repair',
                'fill Placement In Floodplain': 'Fill Placement In Floodplain',
                'phone Contact Person': 'Phone Contact Person',
                'owned 80 Acres': 'Owned 80 Acres',
                'owned By 80 Acre Owner': 'Owned By 80 Acre Owner',
                'acres Contiguous': 'Acres Contiguous',
                'landowner Business Or Individual': 'Landowner Business Or Individual',
                'long Term FPA Number': 'Long Term FPA Number',
                'long Term FPA Valid': 'Long Term FPA Valid',
                'rrC Rock Pit': 'RRC Rock Pit',
                'rrC Spoils': 'RRC Spoils',
                'region Zone': 'Region Zone',
                'contact Person section read only': 'Contact Person section read only',
                'timber Owner Business Or Individual': 'Timber Owner Business Or Individual',
                'operator Business Or Individual': 'Operator Business Or Individual',
                'additional Information': 'Additional Information',
                'add Legal Description': 'Add Legal Description',
                'substituting Prescriptions State Federal': 'Substituting Prescriptions State Federal',
                'substituting Prescriptions Watershed Analysis': 'Substituting Prescriptions Watershed Analysis',
                'land Conversion': 'Land Conversion',
                'salvage of Individual Dead or Damaged Trees': 'Salvage of Individual Dead or Damaged Trees',
                'thinning Program': 'Thinning Program',
                'tree Retention': 'Tree Retention',
                'seedlings Western WA': 'Seedlings Western WA',
                'seedlings Eastern WA': 'Seedlings Eastern WA',
                'road Or Rock Pit Harvest': 'Road Or Rock Pit Harvest',
                'public Park Name': 'Public Park Name',
                'own 20 Contiguous Acres Within UGA': 'Own 20 Contiguous Acres Within UGA',
                'rrC Forest Tax Numbers': 'RRC Forest Tax Numbers',
                userID: 'UserID',
                'individual ID': 'Individual ID',
                'created by Office Staff': 'Created by Office Staff',
                'created by': 'Created by',
                'redacted Content': 'Redacted Content',
                q8Text: 'Q8Text',
                q32Text: 'Q32Text',
                'add Forest Tax Number': 'Add Forest Tax Number',
                sectionsMap: 'sectionsMap',
                questionsMap: 'questionsMap',
            },
        ],
        [
            'Forest Practices Aerial Chemical Application',
            {
                'admin Override': 'Admin Override',
                region: 'Region',
                'project Name': 'Project Name',
                'landowner Business Or Individual': 'Landowner Business Or Individual',
                'contact Person First Name': 'Contact Person First Name',
                'contact Person Last Name': 'Contact Person Last Name',
                'contact Person Email': 'Contact Person Email',
                'contact Person Phone': 'Contact Person Phone',
                'within the City Limits or an Urban Growth Area': 'Within the City Limits or an Urban Growth Area',
                'within a Public Park': 'Within a Public Park',
                'within a Public Park Name': 'Within a Public Park Name',
                'within 500 Feet of a Public Park': 'Within 500 Feet of a Public Park',
                'within 500 Feet of a Public Park Name': 'Within 500 Feet of a Public Park Name',
                'an Alternate Plan': 'An Alternate Plan',
                'applying a Pesticide in a Type A or Type B Wetland':
                    'Applying a Pesticide in a Type A or Type B Wetland',
                'spraying 240 or More Contiguous Acres': 'Spraying 240 or More Contiguous Acres',
                'reviewed for Historic Sites or Native American Resources':
                    'Reviewed for Historic Sites or Native American Resources',
                'additional Information': 'Additional Information',
                'chemical Not Registered or Allowed': 'Chemical Not Registered or Allowed',
                'timber Owner Business Or Individual': 'Timber Owner Business Or Individual',
                'operator Business Or Individual': 'Operator Business Or Individual',
                'prescription Substitution': 'Prescription Substitution',
                'reviewed for Historic Sites or Native American Resources Information':
                    'Reviewed for Historic Sites or Native American Resources Information',
                'redacted Content': 'Redacted Content',
                userID: 'UserID',
                'individual ID': 'Individual ID',
                'created by Office Staff': 'Created by Office Staff',
                'created by': 'Created by',
                'clean Text For Q8': 'Clean Text For Q8',
                'clean Text For Q7': 'Clean Text For Q7',
            },
        ],
        [
            'Step 1 Long Term FPA',
            {
                'project Name': 'Project Name',
                region: 'Region',
                'first Name Contact Person': 'First Name Contact Person',
                'last Name Contact Person': 'Last Name Contact Person',
                'email Contact Person': 'Email Contact Person',
                'phone Contact Person': 'Phone Contact Person',
                'small Forest Landowner': 'Small Forest Landowner',
                'unstable Slopes Landforms': 'Unstable Slopes Landforms',
                'within 500 Feet Public Park': 'Within 500 Feet Public Park',
                'park Name': 'Park Name',
                'within 50 Miles Saltwater Own More Than 500 Acres':
                    'Within 50 Miles Saltwater Own More Than 500 Acres',
                'critical Wildlife Habitat Areas': 'Critical Wildlife Habitat Areas',
                'adjacent Potential Channel Migration Zone': 'Adjacent Potential Channel Migration Zone',
                'historic Sites Native American Cultural Resources Review':
                    'Historic Sites Native American Cultural Resources Review',
                'harvest Area Contiguous': 'Harvest Area Contiguous',
                'dnR Technical Assistance': 'DNR Technical Assistance',
                'additional Information': 'Additional Information',
                'stream Segment': 'Stream Segment',
                'landowner Business Or Individual': 'Landowner Business Or Individual',
                'wetlands Inventory': 'Wetlands Inventory',
                'sensitive Site': 'Sensitive Site',
                'road Assessment': 'Road Assessment',
                'fN water type breaks': 'FN water type breaks',
                'npNs water type breaks': 'NpNs water type breaks',
                'redacted Content': 'Redacted Content',
                userID: 'UserID',
                'individual ID': 'Individual ID',
                'created by Office Staff': 'Created by Office Staff',
                'created by': 'Created by',
                'add Legal Description': 'Add Legal Description',
                'clean Text For Q12 Additional Information': 'Clean Text For Q12 Additional Information',
                'clean Text For Q12 Redacted Content': 'Clean Text For Q12 Redacted Content',
            },
        ],
    ]);
    const VALID_FORM_TYPES = [...FIELD_NAMES_TO_COPY_BY_FORM_TYPE.keys()];
    const FIELD_NAMES_TO_COPY_BY_SUBFORM_TYPE = new Map([
        [
            'Contact Information Relation',
            {
                'relation Type': 'Relation Type',
                proponent: 'Proponent',
                landowner: 'Landowner',
                'timber Owner': 'Timber Owner',
                operator: 'Operator',
                'contact Person': 'Contact Person',
                surveyor: 'Surveyor',
                buyer: 'Buyer',
                seller: 'Seller',
                'business Signer': 'Business Signer',
                other: 'Other',
                'contact Information ID': 'Contact Information ID',
                'business ID': 'Business ID',
                'landowner Type': 'Landowner Type',
                status: 'Status',
            },
        ],
        [
            'Legal Description',
            {
                'unit Number': 'Unit Number',
                acres: 'Acres',
                section: 'Section',
                township: 'Township',
                range: 'Range',
                'range Direction': 'Range Direction',
                'tax Parcel Number': 'Tax Parcel Number',
                county: 'County',
                status: 'Status',
            },
        ],
        [
            'Appendix D Slope Stability Informational',
            {
                'question 1a Aerial Photo': 'Question 1a Aerial Photo',
                'question 1a Field Review': 'Question 1a Field Review',
                'question 1a Forest Practices Application Mapping Tool':
                    'Question 1a Forest Practices Application Mapping Tool',
                'question 1a GIS': 'Question 1a GIS',
                'question 1a Landslide': 'Question 1a Landslide',
                'question 1a Lidar': 'Question 1a Lidar',
                'question 1a Other': 'Question 1a Other',
                'question 1a Other Describe': 'Question 1a Other Describe',
                'question 1b Describe': 'Question 1b Describe',
                'question 1b Select Yes Or No': 'Question 1b Select Yes Or No',
                'question 2a Bedrock Hollow': 'Question 2a Bedrock Hollow',
                'question 2a Category E': 'Question 2a Category E',
                'question 2a Category E Describe': 'Question 2a Category E Describe',
                'question 2a Convergent Headwall': 'Question 2a Convergent Headwall',
                'question 2a Groundwater': 'Question 2a Groundwater',
                'question 2a Inner Gorge': 'Question 2a Inner Gorge',
                'question 2a Other': 'Question 2a Other',
                'question 2a Other Describe': 'Question 2a Other Describe',
                'question 2a Outher Edges': 'Question 2a Outher Edges',
                'question 2a Select Yes Or No': 'Question 2a Select Yes Or No',
                'question 2a Toe Of Deep Seated Landslide With Slopes Greater Than 30 Degrees':
                    'Question 2a Toe Of Deep Seated Landslide With Slopes Greater Than 30 Degrees',
                'question 2b Other': 'Question 2b Other',
                'question 2b Other Describe': 'Question 2b Other Describe',
                'question 2b Road Construction': 'Question 2b Road Construction',
                'question 2b Road Maintenance': 'Question 2b Road Maintenance',
                'question 2b Suspending Cables': 'Question 2b Suspending Cables',
                'question 2b Tailholds': 'Question 2b Tailholds',
                'question 2b Timber Harvest': 'Question 2b Timber Harvest',
                'question 2b Yarding': 'Question 2b Yarding',
                'question 3a Bedrock Hollow': 'Question 3a Bedrock Hollow',
                'question 3a Category E': 'Question 3a Category E',
                'question 3a Category E Describe': 'Question 3a Category E Describe',
                'question 3a Convergent Headwall': 'Question 3a Convergent Headwall',
                'question 3a Groundwater': 'Question 3a Groundwater',
                'question 3a Inner Gorge': 'Question 3a Inner Gorge',
                'question 3a Other': 'Question 3a Other',
                'question 3a Other Describe': 'Question 3a Other Describe',
                'question 3a Outher Edges': 'Question 3a Outher Edges',
                'question 3a Select Yes Or No': 'Question 3a Select Yes Or No',
                'question 3a Toe Of Deep Seated': 'Question 3a Toe Of Deep Seated',
                'question 3b Other': 'Question 3b Other',
                'question 3b Other Describe': 'Question 3b Other Describe',
                'question 3b Road Construction': 'Question 3b Road Construction',
                'question 3b Road Maintenance': 'Question 3b Road Maintenance',
                'question 3b Suspending Cables': 'Question 3b Suspending Cables',
                'question 3b Tailholds': 'Question 3b Tailholds',
                'question 3b Timber Harvest': 'Question 3b Timber Harvest',
                'question 3b Yarding': 'Question 3b Yarding',
                'question 4a Select Yes Or No': 'Question 4a Select Yes Or No',
                'question 4b Describe': 'Question 4b Describe',
                'question 5 Designated Recreation Area': 'Question 5 Designated Recreation Area',
                'question 5 Other': 'Question 5 Other',
                'question 5 Other Describe': 'Question 5 Other Describe',
                'question 5 Public Roads': 'Question 5 Public Roads',
                'question 5 Select Yes Or No': 'Question 5 Select Yes Or No',
                'question 5 Structures': 'Question 5 Structures',
                'question 5 Utilities': 'Question 5 Utilities',
                region: 'Region',
                'region Zone': 'Region Zone',
                'sensitive Content': 'Sensitive Content',
                status: 'Status',
            },
        ],
        [
            'Appendix J Forest Practices Marbled Murrelet',
            {
                'created Date': 'Created Date',
                'q1 No Option': 'Q1 No Option',
                'q1 Yes Option': 'Q1 Yes Option',
                'q4 Harvesting inner zone': 'Q4 Harvesting inner zone',
                'q4 Harvesting outer zone': 'Q4 Harvesting outer zone',
                'q4 No Option': 'Q4 No Option',
                'q4 Yes Option': 'Q4 Yes Option',
                'q5 No Option': 'Q5 No Option',
                'q5 Yes Option': 'Q5 Yes Option',
                'q6 No Option': 'Q6 No Option',
                'q6 Yes Option': 'Q6 Yes Option',
                'question 1 Checkboxes': 'Question 1 Checkboxes',
                'question 1 Survey Explanation': 'Question 1 Survey Explanation',
                'question 2 Select Yes Or No': 'Question 2 Select Yes Or No',
                'question 3 Select Yes Or No': 'Question 3 Select Yes Or No',
                'question 4 Additional Checkboxes': 'Question 4 Additional Checkboxes',
                'question 4 Checkboxes': 'Question 4 Checkboxes',
                'question 4 Description of managed buffers': 'Question 4 Description of managed buffers',
                'question 5 Checkboxes': 'Question 5 Checkboxes',
                'question 6 Checkboxes': 'Question 6 Checkboxes',
                region: 'Region',
                'region Zone': 'Region Zone',
                'sensitive Content': 'Sensitive Content',
                'survey Explanation': 'Survey Explanation',
                'valid Survey Records': 'Valid Survey Records',
                'valid Nesting Platforms Records': 'Valid Nesting Platforms Records',
                'valid Unit Identifier Records': 'Valid Unit Identifier Records',
            },
        ],
        [
            'Appendix A Water Type Classification',
            {
                'region Zone': 'Region Zone',
                region: 'Region',
                status: 'Status',
            },
        ],
        [
            'Appendix H Eastern Washington Natural Regeneration Plan',
            {
                'agrees Not To Harvest Seed Source': 'Agrees Not To Harvest Seed Source',
                'agrees to Control': 'Agrees to Control',
                'average Seed Tree Age': 'Average Seed Tree Age',
                'average Seed Tree Height': 'Average Seed Tree Height',
                'average Seed Trees After Harvest': 'Average Seed Trees After Harvest',
                'capable Seed Source': 'Capable Seed Source',
                'harvest Scheduled Date': 'Harvest Scheduled Date',
                'how is the Seed Block Marked': 'How is the Seed Block Marked',
                'includes Natural Reforestation Plan': 'Includes Natural Reforestation Plan',
                'question ID': 'Question ID',
                region: 'Region',
                'region Zone': 'Region Zone',
                'retained Acres of Seed Block': 'Retained Acres of Seed Block',
                'seed Source Harvest Date': 'Seed Source Harvest Date',
                'seed Source Shown on Map': 'Seed Source Shown on Map',
                'sensitive Upload Metadata': 'Sensitive Upload Metadata',
                'species of the Seed Trees': 'Species of the Seed Trees',
                status: 'Status',
            },
        ],
        [
            'Water Type Modification Form',
            {
                'above Normal': 'Above Normal',
                'add Channel Characteristics': 'Add Channel Characteristics',
                'add Legal Description': 'Add Legal Description',
                'add Water Segment': 'Add Water Segment',
                'adding Typed Waters': 'Adding Typed Waters',
                'additional Clarifying Information': 'Additional Clarifying Information',
                'associate With A FPAN No': 'Associate With A FPAN No',
                'associate With A FPAN Yes': 'Associate With A FPAN Yes',
                'bedrock Chutes': 'Bedrock Chutes',
                'below Normal': 'Below Normal',
                cascades: 'Cascades',
                'changing Location Of Typed Waters': 'Changing Location Of Typed Waters',
                'changing Water Type': 'Changing Water Type',
                'channel Characteristics Description': 'Channel Characteristics Description',
                'channel Is A Fish Hatchery Diversion': 'Channel Is A Fish Hatchery Diversion',
                'channel Is A Public Water Diversion': 'Channel Is A Public Water Diversion',
                'contact Information Email': 'Contact Information Email',
                'contact Information First Name': 'Contact Information First Name',
                'contact Information Last Name': 'Contact Information Last Name',
                'contact Information Phone': 'Contact Information Phone',
                'created Date': 'Created Date',
                'date of Receipt': 'Date of Receipt',
                'date Resubmitted': 'Date Resubmitted',
                'describe Downstream Barriers': 'Describe Downstream Barriers',
                'description Other Q15': 'Description Other Q15',
                'description Q13': 'Description Q13',
                'distance From Diversion': 'Distance From Diversion',
                'distance From Hatchery': 'Distance From Hatchery',
                'downstream Fish Barriers No': 'Downstream Fish Barriers No',
                'downstream Fish Barriers Unable To Access': 'Downstream Fish Barriers Unable To Access',
                'downstream Fish Barriers Yes': 'Downstream Fish Barriers Yes',
                'electrofishing Protocol Survey': 'Electrofishing Protocol Survey',
                'electrofishing Survey': 'Electrofishing Survey',
                'end Of Harvest': 'End Of Harvest',
                'estimated Occurrence Date': 'Estimated Occurrence Date',
                'event Impact Summary': 'Event Impact Summary',
                falls: 'Falls',
                'field Observations': 'Field Observations',
                'fish Above Barrier No': 'Fish Above Barrier No',
                'fish Above Barrier Yes': 'Fish Above Barrier Yes',
                'fish Found': 'Fish Found',
                'fN Type Break': 'FN Type Break',
                'form Saved': 'Form Saved',
                gradient: 'Gradient',
                'hatchery Name': 'Hatchery Name',
                height: 'Height',
                'icN Number': 'ICN Number',
                'iD Team Meeting Occur No': 'ID Team Meeting Occur No',
                'iD Team Meeting Occur Yes': 'ID Team Meeting Occur Yes',
                'incremental Measurements': 'Incremental Measurements',
                'interdisciplinary Team': 'Interdisciplinary Team',
                'landowner Business Or Individual': 'Landowner Business Or Individual',
                'landowner Business Search Address Line 1': 'Landowner Business Search Address Line 1',
                'landowner Business Search Address Line 2': 'Landowner Business Search Address Line 2',
                'landowner Business Search Address Line 3': 'Landowner Business Search Address Line 3',
                'landowner Business Search City': 'Landowner Business Search City',
                'landowner Business Search Country': 'Landowner Business Search Country',
                'landowner Business Search County': 'Landowner Business Search County',
                'landowner Business Search Email': 'Landowner Business Search Email',
                'landowner Business Search ID': 'Landowner Business Search ID',
                'landowner Business Search Name': 'Landowner Business Search Name',
                'landowner Business Search Phone': 'Landowner Business Search Phone',
                'landowner Business Search Postal Zip Code': 'Landowner Business Search Postal Zip Code',
                'landowner Business Search Province State': 'Landowner Business Search Province State',
                'landowner Individual Search Address Line 1': 'Landowner Individual Search Address Line 1',
                'landowner Individual Search Address Line 2': 'Landowner Individual Search Address Line 2',
                'landowner Individual Search Address Line 3': 'Landowner Individual Search Address Line 3',
                'landowner Individual Search City': 'Landowner Individual Search City',
                'landowner Individual Search Country': 'Landowner Individual Search Country',
                'landowner Individual Search County': 'Landowner Individual Search County',
                'landowner Individual Search Email': 'Landowner Individual Search Email',
                'landowner Individual Search First Name': 'Landowner Individual Search First Name',
                'landowner Individual Search Last Name': 'Landowner Individual Search Last Name',
                'landowner Individual Search Phone': 'Landowner Individual Search Phone',
                'landowner Individual Search Postal Zip Code': 'Landowner Individual Search Postal Zip Code',
                'landowner Individual Search Province State': 'Landowner Individual Search Province State',
                'last Fish Detected': 'Last Fish Detected',
                'last Fish Observed': 'Last Fish Observed',
                length: 'Length',
                'list Of Questions': 'List Of Questions',
                'list Species If Known': 'List Species If Known',
                'manmade Barrier': 'Manmade Barrier',
                'manmade Barrier Description': 'Manmade Barrier Description',
                maps: 'Maps',
                'natural Barrier': 'Natural Barrier',
                normal: 'Normal',
                'other Description Q12': 'Other Description Q12',
                'other Q12': 'Other Q12',
                'other Q15': 'Other Q15',
                'parent Region': 'Parent Region',
                'pdF GUID': 'PDF GUID',
                'physical Characteristics': 'Physical Characteristics',
                'physical Characteristics Q12': 'Physical Characteristics Q12',
                'proponent Business Or Individual': 'Proponent Business Or Individual',
                'proponent Business Search Address Line 1': 'Proponent Business Search Address Line 1',
                'proponent Business Search Address Line 2': 'Proponent Business Search Address Line 2',
                'proponent Business Search Address Line 3': 'Proponent Business Search Address Line 3',
                'proponent Business Search City': 'Proponent Business Search City',
                'proponent Business Search Country': 'Proponent Business Search Country',
                'proponent Business Search County': 'Proponent Business Search County',
                'proponent Business Search Email': 'Proponent Business Search Email',
                'proponent Business Search ID': 'Proponent Business Search ID',
                'proponent Business Search Name': 'Proponent Business Search Name',
                'proponent Business Search Phone': 'Proponent Business Search Phone',
                'proponent Business Search Postal Zip Code': 'Proponent Business Search Postal Zip Code',
                'proponent Business Search Province State': 'Proponent Business Search Province State',
                'proponent Individual Search Address Line 1': 'Proponent Individual Search Address Line 1',
                'proponent Individual Search Address Line 2': 'Proponent Individual Search Address Line 2',
                'proponent Individual Search Address Line 3': 'Proponent Individual Search Address Line 3',
                'proponent Individual Search City': 'Proponent Individual Search City',
                'proponent Individual Search Country': 'Proponent Individual Search Country',
                'proponent Individual Search County': 'Proponent Individual Search County',
                'proponent Individual Search Email': 'Proponent Individual Search Email',
                'proponent Individual Search First Name': 'Proponent Individual Search First Name',
                'proponent Individual Search Last Name': 'Proponent Individual Search Last Name',
                'proponent Individual Search Phone': 'Proponent Individual Search Phone',
                'proponent Individual Search Postal Zip Code': 'Proponent Individual Search Postal Zip Code',
                'proponent Individual Search Province State': 'Proponent Individual Search Province State',
                questionsMap: 'questionsMap',
                'random Measurements': 'Random Measurements',
                region: 'Region',
                'removing Typed Waters': 'Removing Typed Waters',
                sectionsMap: 'sectionsMap',
                'show Back Button': 'Show Back Button',
                'show Next Button': 'Show Next Button',
                'show Submit Button': 'Show Submit Button',
                specify: 'Specify',
                status: 'Status',
                'surveyor Business Or Individual': 'Surveyor Business Or Individual',
                'surveyor Business Search Address Line 1': 'Surveyor Business Search Address Line 1',
                'surveyor Business Search Address Line 2': 'Surveyor Business Search Address Line 2',
                'surveyor Business Search Address Line 3': 'Surveyor Business Search Address Line 3',
                'surveyor Business Search City': 'Surveyor Business Search City',
                'surveyor Business Search Country': 'Surveyor Business Search Country',
                'surveyor Business Search County': 'Surveyor Business Search County',
                'surveyor Business Search Email': 'Surveyor Business Search Email',
                'surveyor Business Search ID': 'Surveyor Business Search ID',
                'surveyor Business Search Name': 'Surveyor Business Search Name',
                'surveyor Business Search Phone': 'Surveyor Business Search Phone',
                'surveyor Business Search Postal Zip Code': 'Surveyor Business Search Postal Zip Code',
                'surveyor Business Search Province State': 'Surveyor Business Search Province State',
                'surveyor Individual Search Address Line 1': 'Surveyor Individual Search Address Line 1',
                'surveyor Individual Search Address Line 2': 'Surveyor Individual Search Address Line 2',
                'surveyor Individual Search Address Line 3': 'Surveyor Individual Search Address Line 3',
                'surveyor Individual Search City': 'Surveyor Individual Search City',
                'surveyor Individual Search Country': 'Surveyor Individual Search Country',
                'surveyor Individual Search County': 'Surveyor Individual Search County',
                'surveyor Individual Search Email': 'Surveyor Individual Search Email',
                'surveyor Individual Search First Name': 'Surveyor Individual Search First Name',
                'surveyor Individual Search Last Name': 'Surveyor Individual Search Last Name',
                'surveyor Individual Search Phone': 'Surveyor Individual Search Phone',
                'surveyor Individual Search Postal Zip Code': 'Surveyor Individual Search Postal Zip Code',
                'surveyor Individual Search Province State': 'Surveyor Individual Search Province State',
                'tab Control': 'Tab Control',
                'temporary Barrier': 'Temporary Barrier',
                'temporary Barrier Description': 'Temporary Barrier Description',
                'upper Extent Of Fish Habitat': 'Upper Extent Of Fish Habitat',
                'uppermost Point Of Perennial Flow': 'Uppermost Point Of Perennial Flow',
                'upstream Physical Characteristics No': 'Upstream Physical Characteristics No',
                'upstream Physical Characteristics Yes': 'Upstream Physical Characteristics Yes',
                'visible Section': 'Visible Section',
                'visual Observation': 'Visual Observation',
                'was A Drought Declaration Description': 'Was A Drought Declaration Description',
                'was A Drought Declaration No': 'Was A Drought Declaration No',
                'was A Drought Declaration Yes': 'Was A Drought Declaration Yes',
                'was Landowner Notified No': 'Was Landowner Notified No',
                'was Landowner Notified Yes': 'Was Landowner Notified Yes',
                'water Rights Reference Number': 'Water Rights Reference Number',
                'water Type Does Not Meet The Definition': 'Water Type Does Not Meet The Definition',
                'water Type Does Not Meet The Definition Description':
                    'Water Type Does Not Meet The Definition Description',
                'water Type Modification Other': 'Water Type Modification Other',
                'water Type Modification Other Description': 'Water Type Modification Other Description',
                waterTypeBreakDescription: 'WaterTypeBreakDescription',
                'wetland Proximity Check No': 'Wetland Proximity Check No',
                'wetland Proximity Check Yes': 'Wetland Proximity Check Yes',
                width: 'Width',
            },
        ],
        [
            'Water Crossings',
            {
                'channel Bed Width': 'Channel Bed Width',
                'crossing Identifier': 'Crossing Identifier',
                'culvert Design Method': 'Culvert Design Method',
                'culvert Design Method Option': 'Culvert Design Method Option',
                'make Questions Mandatory': 'Make Questions Mandatory',
                'planned Activity': 'Planned Activity',
                'proposed Size': 'Proposed Size',
                'proposed Size Length Feet': 'Proposed Size Length Feet',
                'proposed Size Width in Inches X': 'Proposed Size Width in Inches X',
                'proposed Size Width in Inches Y': 'Proposed Size Width in Inches Y',
                status: 'Status',
                'stream Gradient': 'Stream Gradient',
                'structure Type': 'Structure Type',
                'water Type': 'Water Type',
            },
        ],
        [
            'Typed Water',
            {
                activity: 'Activity',
                status: 'Status',
                'type F Water': 'Type F Water',
                'type Np Water': 'Type Np Water',
                'type Ns Water': 'Type Ns Water',
                'type S Water': 'Type S Water',
                'typed Water ID': 'Typed Water ID',
            },
        ],
        [
            'S or F Waters',
            {
                'adjacent Harvest Type': 'Adjacent Harvest Type',
                'bankfull Width': 'Bankfull Width',
                cmZ: 'CMZ',
                'dfC Run Number': 'DFC Run Number',
                'dnR Mapped Water Type': 'DNR Mapped Water Type',
                'eW Alternate Plan': 'EW Alternate Plan',
                'eW Clumping': 'EW Clumping',
                'eW Constructing a New Stream Crossing': 'EW Constructing a New Stream Crossing',
                'eW Dispersal': 'EW Dispersal',
                'eW Fixed Width Buffer': 'EW Fixed Width Buffer',
                'eW Hardwood Conversion Complete': 'EW Hardwood Conversion Complete',
                'eW High Elevation Habitat Type': 'EW High Elevation Habitat Type',
                'eW High Elevation Habitat Type Hardwood Conversion':
                    'EW High Elevation Habitat Type Hardwood Conversion',
                'eW M Ponderosa Pine Habitat Type': 'EW M Ponderosa Pine Habitat Type',
                'eW Mixed conifer habitat type': 'EW Mixed conifer habitat type',
                'eW N Mixed Conifer Habitat Type': 'EW N Mixed Conifer Habitat Type',
                'eW No Inner Zone Harvest': 'EW No Inner Zone Harvest',
                'eW No Outer Zone Harvest': 'EW No Outer Zone Harvest',
                'eW Other': 'EW Other',
                'eW Outer zone leave trees exchanged for CMZ basal area':
                    'EW Outer zone leave trees exchanged for CMZ basal area',
                'eW Outer zone leave trees exchanged for LWD': 'EW Outer zone leave trees exchanged for LWD',
                'eW Overstocked Stand': 'EW Overstocked Stand',
                'eW Ponderosa Pine habitat type': 'EW Ponderosa Pine habitat type',
                'eW Removing Hardwood Trees and Planting Conifers': 'EW Removing Hardwood Trees and Planting Conifers',
                'eW Road Construction or Day-lighting': 'EW Road Construction or Day-lighting',
                'eW Salvage': 'EW Salvage',
                'eW Salvage in the Inner Zone': 'EW Salvage in the Inner Zone',
                'eW Salvage Natural Disaster': 'EW Salvage Natural Disaster',
                'eW Stream-adjacent Parallel Road': 'EW Stream-adjacent Parallel Road',
                'eW Yarding Corridors': 'EW Yarding Corridors',
                'field Verified Water Type': 'Field Verified Water Type',
                'harvesting Within Maximum Width': 'Harvesting Within Maximum Width',
                'hide Region': 'Hide Region',
                'minimum Shade Required Percentage': 'Minimum Shade Required Percentage',
                region: 'Region',
                'rmZ Harvest Codes List': 'RMZ Harvest Codes List',
                'rmZ Maximum Width': 'RMZ Maximum Width',
                's Or F Waters ID': 'S Or F Waters ID',
                'segment Length': 'Segment Length',
                'shade Met Per FPBM': 'Shade Met Per FPBM',
                'site Class': 'Site Class',
                'site Class LTA': 'Site Class LTA',
                status: 'Status',
                'stream Segment Identifier': 'Stream Segment Identifier',
                'stream Width': 'Stream Width',
                'tab Control': 'Tab Control',
                'total Width RMZ': 'Total Width RMZ',
                'valid RMZ Harvest Code': 'Valid RMZ Harvest Code',
                'water Type': 'Water Type',
                'water Type Q27': 'Water Type Q27',
                'wW Alternate Plan': 'WW Alternate Plan',
                'wW Clumping': 'WW Clumping',
                'wW Constructing New Stream Crossing': 'WW Constructing New Stream Crossing',
                'wW Dispersal': 'WW Dispersal',
                'wW Fixed Width Buffer': 'WW Fixed Width Buffer',
                'wW Hardwood Conversion': 'WW Hardwood Conversion',
                'wW Hardwood Conversion Complete': 'WW Hardwood Conversion Complete',
                'wW LWD Placement Strategy': 'WW LWD Placement Strategy',
                'wW No Inner Zone Harvest': 'WW No Inner Zone Harvest',
                'wW No Outer Zone Harvest': 'WW No Outer Zone Harvest',
                'wW Option 2 Leaving Trees Closest Water': 'WW Option 2 Leaving Trees Closest Water',
                'wW Option1 Thinning from below': 'WW Option1 Thinning from below',
                'wW Other': 'WW Other',
                'wW Outer Zone leave trees exchanged for CMZ': 'WW Outer Zone leave trees exchanged for CMZ',
                'wW Outer Zone leave trees exchanged for excess': 'WW Outer Zone leave trees exchanged for excess',
                'wW Overstocked Stand': 'WW Overstocked Stand',
                'wW Removing Hardwood Trees and Planting Conifers': 'WW Removing Hardwood Trees and Planting Conifers',
                'wW Road Construction or Day-lighting': 'WW Road Construction or Day-lighting',
                'wW Salvage': 'WW Salvage',
                'wW Salvage Inner Zone': 'WW Salvage Inner Zone',
                'wW Salvage Natural Disaster': 'WW Salvage Natural Disaster',
                'wW Stream-adjacent Parallel Road': 'WW Stream-adjacent Parallel Road',
                'wW Yarding Corridors': 'WW Yarding Corridors',
                'id FPAN Question': 'Id FPAN Question',
                'rMZ Harvest Codes List': 'RMZ Harvest Codes List',
            },
        ],
        [
            'NP Waters',
            {
                'hide Region': 'Hide Region',
                'length Of No Harvest 50 Ft': 'Length Of No Harvest 50 Ft',
                region: 'Region',
                'region Zone': 'Region Zone',
                'selected Strategy': 'Selected Strategy',
                status: 'Status',
                'stream Segment Identifier': 'Stream Segment Identifier',
                'total Stream Length In Harvest Unit': 'Total Stream Length In Harvest Unit',
            },
        ],
        [
            'Forest Roads',
            {
                'abandonment Date': 'Abandonment Date',
                comments: 'Comments',
                'date Assessed': 'Date Assessed',
                'parent Context': 'Parent Context',
                'road Abandonment Length': 'Road Abandonment Length',
                'road Assessed': 'Road Assessed',
                'road Construction Length': 'Road Construction Length',
                'road Identifier': 'Road Identifier',
                status: 'Status',
                'steepest Side Slope': 'Steepest Side Slope',
                'tab Control': 'Tab Control',
            },
        ],
        [
            'Rockpit',
            {
                'acres of Existing Rock Pit Developed': 'Acres of Existing Rock Pit Developed',
                'acres of New Rock Pit Developed': 'Acres of New Rock Pit Developed',
                'rockpit Identifier': 'Rockpit Identifier',
                status: 'Status',
            },
        ],
        [
            'Spoils',
            {
                'spoils Area Identifier': 'Spoils Area Identifier',
                'amount of Spoils Deposited': 'Amount of Spoils Deposited',
                status: 'Status',
            },
        ],
        [
            'Wetlands',
            {
                'how Many Acres Will Be Drained': 'How Many Acres Will Be Drained',
                'how Many Acres Will Be Filled': 'How Many Acres Will Be Filled',
                'parent Context': 'Parent Context',
                'planned Activities In Maximum Width WMZ': 'Planned Activities In Maximum Width WMZ',
                'planned Activities In Wetland': 'Planned Activities In Wetland',
                status: 'Status',
                'total Wetland Acres': 'Total Wetland Acres',
                'wetland Identifier': 'Wetland Identifier',
                'wetland Type': 'Wetland Type',
            },
        ],
        [
            'Timber',
            {
                'acres Harvested': 'Acres Harvested',
                animal: 'Animal',
                'biomass Volume Harvested': 'Biomass Volume Harvested',
                'cable Assist Tethered': 'Cable Assist Tethered',
                chipper: 'Chipper',
                dozer: 'Dozer',
                'even Aged': 'Even Aged',
                forwarder: 'Forwarder',
                'full Suspension Cable': 'Full Suspension Cable',
                'greater than or equal to 10 dbh': 'Greater than or equal to 10 dbh',
                'harvest Method': 'Harvest Method',
                'harvest Method List': 'Harvest Method List',
                'harvest Unit Number': 'Harvest Unit Number',
                helicopter: 'Helicopter',
                'hide Region': 'Hide Region',
                'leading End Suspension Cable': 'Leading End Suspension Cable',
                'less than 10 dbh': 'Less than 10 dbh',
                'logging System': 'Logging System',
                'logging System List': 'Logging System List',
                other: 'Other',
                region: 'Region',
                'region Zone': 'Region Zone',
                'right of Way': 'Right of Way',
                'rubber Tired Skidder': 'Rubber Tired Skidder',
                salvage: 'Salvage',
                'salvage Volume Harvested': 'Salvage Volume Harvested',
                shovel: 'Shovel',
                'slash Bundler': 'Slash Bundler',
                status: 'Status',
                'steepest Slope Harvest Unit': 'Steepest Slope Harvest Unit',
                'tracked Skidder': 'Tracked Skidder',
                'uneven Aged': 'Uneven Aged',
                'volume Harvested': 'Volume Harvested',
                'volume Harvested Percentage': 'Volume Harvested Percentage',
            },
        ],
        [
            'Forest Tax Number',
            {
                'timber Owner': 'Timber Owner',
                'forest Tax Number': 'Forest Tax Number',
                status: 'Status',
            },
        ],
        [
            'Chemical Information',
            {
                'acres Treated': 'Acres Treated',
                'active Ingredient': 'Active Ingredient',
                'anticipated Fall Conifer Release Year': 'Anticipated Fall Conifer Release Year',
                'anticipated Site Prep Year': 'Anticipated Site Prep Year',
                'anticipated Spring Conifer Release Year': 'Anticipated Spring Conifer Release Year',
                'epA Number': 'EPA Number',
                status: 'Status',
                'unit Number': 'Unit Number',
                'within 100 Feet Agricultural Land': 'Within 100 Feet Agricultural Land',
                'within 100 Feet Surface Water': 'Within 100 Feet Surface Water',
                'within 200 Feet Residence': 'Within 200 Feet Residence',
            },
        ],
        [
            'Sensitive Site',
            {
                'site Identifier': 'Site Identifier',
                'type of Site': 'Type of Site',
                'describe Water Type And Sensitive Sites': 'Describe Water Type And Sensitive Sites',
                status: 'Status',
            },
        ],
        [
            'Field Representative',
            {
                date: 'Date',
                name: 'Name',
                'title Position': 'Title Position',
                status: 'Status',
            },
        ],
        [
            'Survey',
            {
                'legal Description': 'Legal Description',
                'wdfW Survey Status': 'WDFW Survey Status',
                'survey Results': 'Survey Results',
                'survey ID': 'Survey ID',
                status: 'Status',
            },
        ],
        [
            'Nesting Platforms',
            {
                'acreage of Delineated Stand': 'Acreage of Delineated Stand',
                'delineated Stand Identifier': 'Delineated Stand Identifier',
                'describe Other': 'Describe Other',
                'nesting Platforms per Acre': 'Nesting Platforms per Acre',
                'number of Trees': 'Number of Trees',
                'platform Assessment Method': 'Platform Assessment Method',
                status: 'Status',
            },
        ],
        [
            'Unit Identifier',
            {
                description: 'Description',
                status: 'Status',
                'unit Identifier': 'Unit Identifier',
                'within 300 of the Unit': 'Within 300 of the Unit',
                'within the Unit': 'Within the Unit',
            },
        ],
        [
            'Stream Segment',
            {
                'dates Observed': 'Dates Observed',
                description: 'Description',
                'q1 Yes Attach documentation or provide approved WTMF number text':
                    'Q1 Yes Attach documentation or provide approved WTMF number text',
                'question 1 Fish found Stop Type F water': 'Question 1 Fish found Stop Type F water',
                'question 1 No Continue to 2': 'Question 1 No Continue to 2',
                'question 1 No fish Skip to 6': 'Question 1 No fish Skip to 6',
                'question 1 Yes Attach documentation or provide approved WTMF number':
                    'Question 1 Yes Attach documentation or provide approved WTMF number',
                'question 1 Yes Meets waiver criteria Skip to 6': 'Question 1 Yes Meets waiver criteria Skip to 6',
                'question 2 No Continue to 3': 'Question 2 No Continue to 3',
                'question 2 Yes Stop Type F water': 'Question 2 Yes Stop Type F water',
                'question 3 No Continue to 4': 'Question 3 No Continue to 4',
                'question 3 Yes Stop Type F water': 'Question 3 Yes Stop Type F water',
                'question 4 No Continue to 5': 'Question 4 No Continue to 5',
                'question 4 Yes Stop Type F water': 'Question 4 Yes Stop Type F water',
                'question 5 No Continue to 6': 'Question 5 No Continue to 6',
                'question 5 Yes Stop Type F water': 'Question 5 Yes Stop Type F water',
                'question 6 No Continue to 7': 'Question 6 No Continue to 7',
                'question 6 Yes Type Np water Skip to 9': 'Question 6 Yes Type Np water Skip to 9',
                'question 7 No Continue to 8': 'Question 7 No Continue to 8',
                'question 7 Yes Type Np water Skip to 9': 'Question 7 Yes Type Np water Skip to 9',
                'question 8 No Non typed water': 'Question 8 No Non typed water',
                'question 8 Yes Type Ns water': 'Question 8 Yes Type Ns water',
                status: 'Status',
            },
        ],
        [
            'Water Segment Modification',
            {
                'current Water Type': 'Current Water Type',
                'dates of Field Assessment': 'Dates of Field Assessment',
                'name of Water': 'Name of Water',
                'proposed Water Type': 'Proposed Water Type',
                status: 'Status',
                'tributary To': 'Tributary To',
                'water Segment Identifier': 'Water Segment Identifier',
            },
        ],
        [
            'Channel Characteristics',
            {
                'any ponds or impoundments over 0.5 acres': 'Any ponds or impoundments over 0.5 acres',
                'average bankfull width': 'Average bankfull width',
                'average Gradient': 'Average Gradient',
                'average wetted width': 'Average wetted width',
                'number of bankfull width measurements': 'Number of bankfull width measurements',
                'number of protocol pools': 'Number of protocol pools',
                status: 'Status',
                'water Segment Identifier': 'Water Segment Identifier',
            },
        ],
    ]);
    const SUBFORM_RELATION_FIELD = new Map([
        ['Contact Information Relation', 'Related Record ID'],
        ['Legal Description', 'Related Record ID'],
        ['Appendix D Slope Stability Informational', 'Related Record ID'],
        ['Appendix J Forest Practices Marbled Murrelet', 'Related Record ID'],
        ['Appendix A Water Type Classification', 'Related Record ID'],
        ['Appendix H Eastern Washington Natural Regeneration Plan', 'Related Record ID'],
        ['Water Type Modification Form', 'Related Record ID'],
        ['Water Crossings', 'FPAN ID'],
        ['Typed Water', 'Related Record ID'],
        ['S or F Waters', 'Related Record ID'],
        ['NP Waters', 'Related Record ID'],
        ['Forest Roads', 'Related Record ID'],
        ['Rockpit', 'Related Record ID'],
        ['Spoils', 'Related Record ID'],
        ['Wetlands', 'Related Record ID'],
        ['Timber', 'Related Record ID'],
        ['Forest Tax Number', 'Related Record ID'],
        ['Chemical Information', 'Related Record ID'],
        ['Sensitive Site', 'Related Record ID'],
        ['Field Representative', 'Related Record ID'],
        ['Survey', 'Related Record ID'],
        ['Nesting Platforms', 'Related Record ID'],
        ['Unit Identifier', 'Related Record ID'],
        ['Stream Segment', 'Related Record ID'],
        ['Water Segment Modification', 'Related Record ID'],
        ['Channel Characteristics', 'Related Record ID'],
    ]);
    const VALID_SUBFORM_TYPES = [...FIELD_NAMES_TO_COPY_BY_SUBFORM_TYPE.keys()];
    const SUBFORMS_WITH_SUBFORMS = [
        'Appendix D Slope Stability Informational',
        'Appendix J Forest Practices Marbled Murrelet',
        'Appendix A Water Type Classification',
        'Water Type Modification Form',
    ];
    const DOC_INDEX_FIELDS_MAP = {
        'document type': 'Document type',
        region: 'Region',
        isinbox: 'isInBox',
        offline: 'Offline',
    };
    const COPY_FORM_INITIAL_STATUS = 'System Processing';
    const COPY_FORM_FINAL_STATUS = 'Draft';

    const enableprefixToTemplateNameMap = true; // determines whether or not to cache query results in map
    const formTemplatePrefixListQueryName = 'zWebSvc Form Template Prefix List';
    const getFormIDRelatedSubformsQueryName = 'zWebSvc Get Form ID Related Subforms';
    let prefixToTemplateNameMap;

    /* -------------------------------------------------------------------------- */
    /*                           Script Variables                                 */
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */

    function getFieldValueByName(fieldName, isOptional = false) {
        /*
            Check if a field was passed in the request and get its value
            Parameters:
                fieldName: The name of the field to be checked
                isOptional: If the field is required or not
            */
        let fieldValue = ''; // Default value

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                // Check if the value property exits
                fieldValue = 'value' in field ? field.value : fieldValue;

                // Trim the value if it's a string to avoid strings with only spaces like "   "
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                // Check if the field is required and if it has a value. Added a condition to avoid 0 to be considered a falsy value
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;

                // Check if the field is a dropdown with the default value "Select Item"
                // Some dropdowns have this value as the default one but some others don't
                const ddSelectItem = fieldValue === 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    fieldValue = '';
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }
            }
        } catch (error) {
            errorLog.push(error.message);
        } finally {
            return fieldValue;
        }
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;
        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason =
                vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                    ? vvClientRes.meta.errors[0].reason
                    : 'unspecified';
            throw new Error(`${shortDescription} error. Status: ${vvClientRes.meta.status}. Reason: ${errorReason}`);
        }
        return vvClientRes;
    }

    function checkDataPropertyExists(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        const status = vvClientRes.meta.status;
        if (status != ignoreStatusCode) {
            if (!vvClientRes.data) {
                throw new Error(
                    `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
                );
            }
        }
        return vvClientRes;
    }

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        /*
            Checks that the data property of a vvClient API response object is not empty
            Parameters:
                res: Parsed response object from the API call
                shortDescription: A string with a short description of the process
                ignoreStatusCode: An integer status code for which no error should be thrown. If you're using checkMeta(), make sure to pass the same param as well.
            */
        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = typeof vvClientRes.data === 'object';
            const isEmptyArray = dataIsArray && vvClientRes.data.length == 0;
            const isEmptyObject = dataIsObject && Object.keys(vvClientRes.data).length == 0;

            // If the data is empty, throw an error
            if (isEmptyArray || isEmptyObject) {
                throw new Error(
                    `${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`
                );
            }
            // If it is a Web Service response, check that the first value is not an Error status
            if (dataIsArray) {
                const firstValue = vvClientRes.data[0];

                if (firstValue == 'Error') {
                    throw new Error(
                        `${shortDescription} returned an error. Please, check called Web Service. Status: ${status}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    function parseRes(vvClientRes) {
        /*
              Generic JSON parsing function
              Parameters:
                  vvClientRes: JSON response from a vvClient API method
              */
        try {
            // Parses the response in case it's a JSON string
            const jsObject = JSON.parse(vvClientRes);
            // Handle non-exception-throwing cases:
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {
            // If an error occurs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function isNullEmptyUndefined(param) {
        if (param === null || param === undefined) {
            return true;
        }
        const dataType = Object.prototype.toString.call(param).slice(8, -1).toLowerCase(); //slicing the string returned by the toString method to remove the first eight characters ("[object ") and the last character (]), leaving only the name of the data type.
        switch (dataType) {
            case 'string':
                if (
                    param.trim().toLowerCase() === 'select item' ||
                    param.trim().toLowerCase() === 'null' ||
                    param.trim().toLowerCase() === 'undefined' ||
                    param.trim() === ''
                ) {
                    return true;
                }
                break;
            case 'array':
                if (param.length === 0) {
                    return true;
                }
                break;
            case 'object':
                if (Object.keys(param).length === 0) {
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    function getFormRecords(getFormsParams, templateName) {
        const shortDescription = `Get form ${templateName}`;
        const overrideGetFormsParams = {
            expand: false,
            ...getFormsParams, // overrides defaults in this object
        };

        return vvClient.forms
            .getForms(overrideGetFormsParams, templateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function updateRecord(formTemplateName, recordGUID, fieldValuesToUpdate) {
        const shortDescription = `Update form record ${recordGUID}`;

        return vvClient.forms
            .postFormRevision(null, fieldValuesToUpdate, formTemplateName, recordGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function createFormRecord(formTemplateName, newRecordData) {
        const shortDescription = `Post form ${formTemplateName}`;

        return vvClient.forms
            .postForms(null, newRecordData, formTemplateName)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function getDocument(documentIdGuid) {
        const shortDescription = `Get Documents Data for '${documentIdGuid}'`;
        const getDocsParams = {
            q: `[documentId] eq '${documentIdGuid}'`,
            indexFields: 'include',
        };

        return vvClient.documents
            .getDocuments(getDocsParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    function getUserByUserID(userID) {
        const shortDescription = `Get user GUID for user ID: ${userID}`;
        const getUserQuery = {
            q: `[userid] eq '${userID}'`,
            fields: 'id',
        };

        return vvClient.users
            .getUser(getUserQuery)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data[0]);
    }

    function getFolderGUID(folderPath) {
        const shortDescription = `Get folder ${folderPath}`;
        // Status code 403 must be ignored (not throwing error) because it means that the folder doesn't exist
        const ignoreStatusCode = 403;
        const getFolderParams = {
            folderPath,
        };

        return vvClient.library
            .getFolders(getFolderParams)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode))
            .then((res) => checkDataPropertyExists(res, shortDescription, ignoreStatusCode))
            .then((res) => res.data);
    }

    function createFolder(folderPath, folderData) {
        const shortDescription = `Post folder '${folderPath}'`;

        return vvClient.library
            .postFolderByPath(null, folderData, folderPath)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data.id);
    }

    function createDoc(docArgs) {
        const shortDescription = `Create Document`;

        return vvClient.documents
            .postDoc(docArgs)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription))
            .then((res) => res.data);
    }

    function createFile(fileParams, fileBuffer) {
        const shortDescription = `Post file for '${fileParams.name}'`;

        return vvClient.files
            .postFile(fileParams, fileBuffer)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => checkDataIsNotEmpty(res, shortDescription));
    }

    async function saveToDocLibrary(fileName, extension, folderPath, fileBytes, indexFields) {
        const foundFolder = await getFolderGUID(folderPath);

        let folderId;

        //if folder found get the id else create new folder
        if (foundFolder?.id) {
            folderId = foundFolder.id;
        } else {
            folderId = await createFolder(folderPath, {
                description: fileName,
            });
        }
        const formattedDocName = fileName;
        const stringifyIndexFields = JSON.stringify(indexFields);
        const docArgs = {
            documentState: 1,
            name: formattedDocName,
            description: formattedDocName,
            revision: '0',
            allowNoFile: true,
            fileLength: 0,
            fileName: `${fileName}.${extension}`,
            indexFields: stringifyIndexFields,
            folderId: folderId,
        };

        const newDoc = await createDoc(docArgs);

        const fileParams = {
            documentId: newDoc.id,
            name: newDoc.name,
            revision: '1',
            changeReason: '',
            checkInDocumentState: 'Released',
            fileName: newDoc.fileName,
            indexFields: stringifyIndexFields,
        };

        await createFile(fileParams, fileBytes);
        return newDoc;
    }

    function relateDocumentToRecord(recordGUID, documentGUID) {
        const shortDescription = `Relate document '${documentGUID}' to form '${recordGUID}'`;

        return vvClient.forms
            .relateDocument(recordGUID, documentGUID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function relateRecordToDocument(recordGUID, documentID) {
        const shortDescription = `Relate form '${recordGUID}' to document '${documentID}'`;

        return vvClient.forms
            .relateDocumentByDocId(recordGUID, documentID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription));
    }

    function getRecordRelatedDocs(recordGUID) {
        const shortDescription = `Get forms related to ${recordGUID}`;

        return vvClient.forms
            .getFormRelatedDocs(recordGUID, null)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /**
     * @typedef {{
     *  'form ID': string,
     *  'revision ID': string,
     *  'form Template Name': string
     * }} RelatedRecordData
     */

    /**
     * @param {string} formID
     * @returns {Promise<RelatedRecordData[]>}
     */
    function getAllRelatedRecords(formID) {
        return getCustomQueryDataBySQLParams(getFormIDRelatedSubformsQueryName, { FormID: formID });
    }

    function mapFields(original, definedMap) {
        const result = {};
        for (const [origKey, newKey] of Object.entries(definedMap)) {
            result[newKey] = original[origKey] ?? '';
        }
        return result;
    }

    function relateRecords(parentRecordGUID, childRecordID) {
        const shortDescription = `relating forms: ${parentRecordGUID} and form ${childRecordID}`;
        //404 is needed so that a hard error is not thrown when relationship already exists.
        const ignoreStatusCode = '404';

        return vvClient.forms
            .relateFormByDocId(parentRecordGUID, childRecordID)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription, ignoreStatusCode));
    }

    function getFormPrefix(formID) {
        // Capture everything up to the last hyphen followed by digits
        const prefixReg = /^(.+)-\d+$/;
        let formPrefix = '';
        try {
            const match = prefixReg.exec(formID);
            if (!match) {
                throw new Error('Invalid format');
            }
            formPrefix = match[1];
        } catch (error) {
            throw new Error(`Unable to parse form prefix for: "${formID}". ${error.message}`);
        }

        return formPrefix;
    }

    async function getTemplateNameFromID(formID) {
        let formPrefix = getFormPrefix(formID);
        formPrefix += '-'; // add trailing dash since query returns prefixes in this format

        let queryParams = {};
        if (enableprefixToTemplateNameMap === false) {
            queryParams.q = `[prefix] eq '${formPrefix}'`;
        }

        let querySearchData;
        if (enableprefixToTemplateNameMap === false || prefixToTemplateNameMap == null) {
            let queryResp = await vvClient.customQuery.getCustomQueryResultsByName(
                formTemplatePrefixListQueryName,
                queryParams
            );
            queryResp = JSON.parse(queryResp);
            if (queryResp.meta.status !== 200) {
                throw new Error(
                    `There was an error when calling the ${formTemplatePrefixListQueryName} custom query. ${errorMessageGuidance}`
                );
            }
            querySearchData = queryResp.hasOwnProperty('data') ? queryResp.data : null;
            if (Array.isArray(querySearchData) === false) {
                throw new Error(
                    `Data was not able to be returned when calling the ${formTemplatePrefixListQueryName} custom query.`
                );
            }
            if (querySearchData.length < 1) {
                throw new Error(`Unable to get template names from query ${formTemplatePrefixListQueryName}`);
            }
        }

        let templateName;
        if (enableprefixToTemplateNameMap) {
            // global map to avoid querying several times
            if (prefixToTemplateNameMap == null) {
                prefixToTemplateNameMap = new Map();
                querySearchData.forEach((template) => {
                    prefixToTemplateNameMap.set(template.prefix, template.templateName);
                });
            }
            templateName = prefixToTemplateNameMap.get(formPrefix);
        } else {
            templateName = querySearchData[0].templateName;
        }

        if (!templateName) {
            throw new Error(`Unable to find template name for ${formID}!`);
        }

        return templateName;
    }

    async function createAndCopyForm(
        formType,
        sourceFormID,
        isMainForm = true,
        parentFormID = null,
        parentFormGUID = null,
        individualID = null
    ) {
        const newSubForm = await createFormRecord(formType, {});
        const [originalRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${sourceFormID}'`,
                expand: true,
            },
            formType
        );
        const targetMapObj = isMainForm
            ? FIELD_NAMES_TO_COPY_BY_FORM_TYPE.get(formType)
            : FIELD_NAMES_TO_COPY_BY_SUBFORM_TYPE.get(formType);

        const valuesToCopy = mapFields(originalRecord, targetMapObj);

        if (isMainForm) {
            //Set main form status to System Processing
            valuesToCopy.Status = COPY_FORM_INITIAL_STATUS;
            if (!isNullEmptyUndefined(individualID)) {
                //If present equal proponet so set individual ID
                valuesToCopy['Individual ID'] = individualID;
            }
        } else {
            //If is not main form must be related
            valuesToCopy[SUBFORM_RELATION_FIELD.get(formType)] = parentFormID;
            await relateRecords(parentFormGUID, newSubForm.instanceName);
        }

        const updatedNewSubForm = await updateRecord(formType, newSubForm.revisionId, valuesToCopy);
        return updatedNewSubForm;
    }

    /**
     * @param {RelatedRecordData[]} subForms
     * @param {string} parentFormID
     * @param {string} parentFormGUID
     * @returns {object[]}
     */
    async function copySubforms(subForms, parentFormID, parentFormGUID) {
        const subFormResult = [];
        if (subForms.length === 0) return subFormResult;
        for (let i = 0; i < subForms.length; i++) {
            const subForm = subForms[i];
            const templateName = subForm['form Template Name'];
            if (VALID_SUBFORM_TYPES.includes(templateName)) {
                const newSubForm = await createAndCopyForm(
                    templateName,
                    subForm['form ID'],
                    false,
                    parentFormID,
                    parentFormGUID
                );
                //Check if subform has subforms
                if (SUBFORMS_WITH_SUBFORMS.includes(templateName)) {
                    const associatedSubForms = await getAllRelatedRecords(subForm['form ID']);
                    const copiedAssociatedSubForms = await copySubforms(
                        associatedSubForms,
                        subForm['form ID'],
                        subForm['revision ID']
                    );
                    if (copiedAssociatedSubForms.length > 0) {
                        copiedAssociatedSubForms.forEach((result) => {
                            subFormResult.push({
                                templateName: result.templateName,
                                obj: result.obj,
                            });
                        });
                    }
                }
                subFormResult.push({
                    templateName: templateName,
                    obj: newSubForm,
                });
            }
        }
        return subFormResult;
    }

    async function copyDocuments(documents, parentFormGUID, tempPath) {
        const documentsResult = [];
        if (documents.length === 0) return documentsResult;
        for (let i = 0; i < documents.length; i++) {
            const document = documents[i];
            const { id: fileRevisionId, extension, fileName, documentId } = document;
            const fileExtension = extension.toLowerCase();
            const fileBytes = await vvClient.files.getFileBytesId(fileRevisionId);
            const [docData] = await getDocument(documentId);
            const indexFields = {
                ...mapFields(docData || {}, DOC_INDEX_FIELDS_MAP),
                'Fpa number': '',
            };
            const copiedDoc = await saveToDocLibrary(fileName, fileExtension, tempPath, fileBytes, indexFields);
            //   await relateDocumentToRecord(parentFormGUID, copiedDoc.id); // Old method
            await relateRecordToDocument(parentFormGUID, copiedDoc.name);
            documentsResult.push({
                fileName,
                document: copiedDoc,
            });
        }
        return documentsResult;
    }

    function buildCopySummary({
        sourceFormID,
        formType,
        newApplicationCopy,
        copiedRelatedSubForms = [],
        copiedRelatedDocs = [],
        COPY_FORM_INITIAL_STATUS,
        COPY_FORM_FINAL_STATUS,
        FIELD_NAMES_TO_COPY_BY_FORM_TYPE,
    }) {
        const questionCount = Object.keys(FIELD_NAMES_TO_COPY_BY_FORM_TYPE.get(formType)).length - 4;

        const subFormsCount = copiedRelatedSubForms.length;
        const docsCount = copiedRelatedDocs.length;

        const subFormTemplateNames = [...new Set(copiedRelatedSubForms.map((subForm) => subForm.templateName))];

        const subFormTemplateCounts = Object.entries(
            copiedRelatedSubForms.reduce((acc, subForm) => {
                const name = subForm.templateName;
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {})
        ).map(([templateName, createdCount]) => ({
            templateName,
            createdCount,
        }));

        const docNames = copiedRelatedDocs.map((doc) => doc.fileName);

        const message = `Copy completed successfully: ${questionCount} questions, ${subFormsCount} subforms, ${docsCount} documents. Target created in ${COPY_FORM_INITIAL_STATUS} and updated to ${COPY_FORM_FINAL_STATUS}`;

        const summaryObj = {
            SourceFormID: sourceFormID,
            SourceFormType: formType,
            TargetFormID: newApplicationCopy.instanceName,
            TargetFormType: formType,
            InitialStatus: COPY_FORM_INITIAL_STATUS,
            FinalStatus: COPY_FORM_FINAL_STATUS,
            AnswersCopiedCount: questionCount,
            HiddenFieldsCopied: ['IndividualID', 'User ID', 'Created by Office Staff', 'Created by'],
            sourceSubFormsCount: subFormsCount,
            targetSubFormsCount: subFormsCount,
            CopiedSubformTemplates: subFormTemplateNames,
            Subforms: subFormTemplateCounts,
            sourceDocumentsAttachedCount: docsCount,
            targetDocumentsAttachedCount: docsCount,
            CopiedDocumentNames: docNames,
            Warnings: [],
        };

        return { message, summaryObj };
    }

    async function createFolderIfNotExists(formID) {
        const folderPath = `/FPA/TEMP/${formID}`;
        const folderExists = fs.existsSync(folderPath);
        if (!folderExists) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        return folderPath;
    }

    function updateFormOriginator(newUserId, formId) {
        const shortDescription = `Setting new originator ${newUserId} for ${formId}`;

        return vvClient.forms.updateFormInstanceOriginator(formId, newUserId);
    }

    /**
     * @param {string} queryName
     * @param {object} sqlParams An object used like a map for sql params (e.g. For @ProviderID in query,
     * sqlParams = { 'ProviderID': 'PROVIDER-00000N' })
     *
     * @returns {Promise<object[]>} VV query result data objects. May be empty.
     */
    function getCustomQueryDataBySQLParams(queryName, sqlParams) {
        const shortDescription = `Custom Query using SQL Parameters for '${queryName}'`;

        const customQueryData = {};
        if (sqlParams) {
            const sqlParamArr = [];
            for (const parameterName in sqlParams) {
                sqlParamArr.push({
                    parameterName,
                    value: sqlParams[parameterName],
                });
            }
            customQueryData.params = JSON.stringify(sqlParamArr);
        }

        return vvClient.customQuery
            .getCustomQueryResultsByName(queryName, customQueryData)
            .then((res) => parseRes(res))
            .then((res) => checkMetaAndStatus(res, shortDescription))
            .then((res) => checkDataPropertyExists(res, shortDescription))
            .then((res) => res.data);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */

    try {
        // Get parameters
        const sourceFormID = getFieldValueByName('Source Form ID');
        const formType = getFieldValueByName('Form Type');
        const individualID = getFieldValueByName('Individual ID', true);

        // Check is the required parameters are present
        if (!sourceFormID || !formType) {
            throw new Error(errorLog.join('; '));
        }

        if (!VALID_FORM_TYPES.includes(formType)) {
            throw new Error('Invalid Form Type param.');
        }

        // 1 and 2
        const [originalRecord] = await getFormRecords(
            {
                q: `[instanceName] eq '${sourceFormID}'`,
                expand: true,
            },
            formType
        );

        if (!originalRecord) {
            throw new Error('Source Form not found.');
        }

        //Update source app Copy Application field to False at the end
        await updateRecord(formType, originalRecord.revisionId, {
            IsCopying: 'True',
        });

        const newApplicationCopy = await createAndCopyForm(
            formType,
            originalRecord.instanceName,
            true,
            null,
            null,
            individualID
        );

        // 3
        const relatedSubForms = await getAllRelatedRecords(originalRecord.instanceName);
        const copiedRelatedSubForms = await copySubforms(
            relatedSubForms,
            newApplicationCopy.instanceName,
            newApplicationCopy.revisionId
        );

        // 4 and 5
        const folderPath = await createFolderIfNotExists(newApplicationCopy.instanceName);
        const relatedDocs = await getRecordRelatedDocs(originalRecord.revisionId);
        const copiedRelatedDocs = await copyDocuments(relatedDocs, newApplicationCopy.revisionId, folderPath);

        // 6
        //Update main app copy form status to Draft at the end
        const updatedMainAppCopy = await updateRecord(formType, newApplicationCopy.revisionId, {
            Status: COPY_FORM_FINAL_STATUS,
        });

        //Update source app Copy Application field to False at the end
        await updateRecord(formType, originalRecord.revisionId, {
            'Copy Application': 'False',
            IsCopying: 'False',
        });

        //In the case a proponent user ID exists, update form originator so it can be opened by proponents
        if (!isNullEmptyUndefined(originalRecord.modifyBy)) {
            // Get user id set during application flow
            const targetUser = await getUserByUserID(originalRecord.modifyBy);
            const targetUserId = targetUser.id;

            // Update originators
            await updateFormOriginator(targetUserId, updatedMainAppCopy.revisionId);

            for (const subForm of copiedRelatedSubForms) {
                if (subForm.obj?.revisionId) {
                    await updateFormOriginator(targetUserId, subForm.obj.revisionId);
                }
            }
        }

        // Build Response
        const { message, summaryObj } = buildCopySummary({
            sourceFormID,
            formType,
            newApplicationCopy,
            copiedRelatedSubForms,
            copiedRelatedDocs,
            COPY_FORM_INITIAL_STATUS,
            COPY_FORM_FINAL_STATUS,
            FIELD_NAMES_TO_COPY_BY_FORM_TYPE,
        });

        // BUILD THE SUCCESS RESPONSE ARRAY
        outputCollection[0] = 'Success'; // Don't change this
        outputCollection[1] = message;
        outputCollection[2] = summaryObj;
    } catch (error) {
        logger.info(`Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don't change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred.';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            outputCollection[1] = error.message ? error.message : `Unhandled error occurred: ${error}`;
        }
    } finally {
        // SEND THE RESPONSE
        response.json(200, outputCollection);
    }
};
