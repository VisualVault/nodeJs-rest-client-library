/**
 * VV.Form.Global.MeasureTaskComplete
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (OutputFieldName, IndexFieldName, DirectionButton) {
/*
    Script Name:    MeasureTaskComplete
    Customer:       PAELS
    Purpose:        The purpose of this function is to measure if the checklist task is complete.
    Preconditions:  The following data fields needs to be present in the form.
                    Required:
                            - Checklist Task ID
                            - Provider ID
                            - Record ID - The ID of the record that originates the process (for example, an Application ID)
                            - Comments
                    Optional:
                            - Related Record ID - The ID of the form record required to complete the task
                            - Related Record GUID - The GUID of the form record required to complete the task
                            - Uploaded Document ID - The ID of the uploaded document required to complete the task
                            - Uploaded Document GUID - The GUID of the uploaded document required to complete the task
                            - Upload Path - The path of the folder where the uploaded document needs to be saved
                            - Documentation Type - The type of required documentation to complete the task. The value can be: Document, Form or Blank
    Parameters:     
                    OutputFieldName - The name of the field in which the json data will be updated.
                    IndexFieldName - The name of the field that saves the index number.
                    DirectionButton - It can be one of two values: Next or Back. It corresponds to the navigation button that triggers the script.
 
    Return Value:   -

    Date of Dev:    11/27/2023
    Last Rev Date:  05/30/2024
    Revision Notes:
                    11/27/2023 - Fernando Culell: Initial creation of the business process.
                    12/01/2023 - Nicolás Culini: Modify index calculation for managing navigation.
                    12/12/2023 - Fernando Culell: Modify the text for the message when a task is left incomplete.
                    01/02/2024 - Petosa Ayala Franco: Modify script to populate task comments into checklist management comments field
                    01/12/2024 - Petosa Ayala Franco: Modify script to only send required data to web service call
                    01/15/2024 - Petosa Ayala Franco: Modify script to fix index calculation when task is completed and remove from JSON array
                    03/27/2024 - Fernando Culell: Set as True a checkbox in the parent form when all tasks are complete.
                    05/15/2024 - John Sevilla: Update script to use GetOrUpdateOriginatingRecord
                    05/30/2024 - John Sevilla: Add "document Upload Folder" to fields updated
*/

const outputField = OutputFieldName;
const indexField = IndexFieldName;
const direction = DirectionButton;
let tasksData = JSON.parse(VV.Form.GetFieldValue(OutputFieldName));
let index = Number(VV.Form.GetFieldValue(IndexFieldName));
let needConfirmNoPrevious = false;
let documentationType = '';

function updateFormFields() {
    // Calculate the value forthe required Documentation Type
    if (tasksData[index]["upload Required"] == 'Yes') {
        documentationType = 'Document';
    } else if (tasksData[index]["form Required"] == 'Yes') {
        documentationType = 'Form';
    }

    Promise.all([
        VV.Form.SetFieldValue(outputField, JSON.stringify(tasksData), false),
        VV.Form.SetFieldValue(indexField, String(index), false),
        VV.Form.SetFieldValue('Instructions', tasksData[index]["description For Assignee"], false),
        VV.Form.SetFieldValue('Document Type', tasksData[index]["assignee Document Type"], false),
        VV.Form.SetFieldValue('Checklist Task ID', tasksData[index]["checklist Task Form ID"], false),
        VV.Form.SetFieldValue('Provider ID', tasksData[index]["provider ID"], false),
        VV.Form.SetFieldValue('Show Task Comment', tasksData[index]["comment Visible on Checklist Management"] === 'True', true),
        VV.Form.SetFieldValue('Comments', tasksData[index]["comments"], true),
        VV.Form.SetFieldValue('Documentation Type', documentationType, true),
        VV.Form.SetFieldValue('Uploaded Document ID', '', false),
        VV.Form.SetFieldValue('Uploaded Document GUID', '', false),
        VV.Form.SetFieldValue('Related Record ID', '', false),
        VV.Form.SetFieldValue('Related Record GUID', '', false),
        VV.Form.SetFieldValue('Upload Path', tasksData[index]["document Upload Folder"], false),
    ]).then(() => {
        VV.Form.DoAjaxFormSave();
    });
}

function displayNoPreviousTaskModal() {
    let goToNextTask = () => {
        index = 1;
        updateFormFields();
    };

    let goToPreviousScreen = () => {
        // get the originating record ("previous screen")
        VV.Form.Template.GetOrUpdateOriginatingRecord('Get')
            .then((returnObj) => {
                const { originatingRecord } = returnObj;
                // redirect to the originating record
                VV.Form.Global.OpenURLFromGUID(originatingRecord['GUID'], null, '_self');
            });
    };

    let modalOptions = {
        'Title': 'No Previous Task',
        'Icon': 'question',
        'HtmlContent': '<p>There are no previous incomplete tasks. Would you like to view the next incomplete task instead, or return to the previous screen?</p>',
        'ConfirmText': 'Next Task',
        'okFunction': goToNextTask,
        'SecondaryText': 'Previous Screen',
        'secondFunction': goToPreviousScreen
    };

    VV.Form.Global.DisplayModal(modalOptions);
}

function displayTaskNotCompleteModal() {
    VV.Form.Global.DisplayModal({
        Title: 'The task was not completed',
        Icon: 'warning',
        HtmlContent: 'You can come back to it later to complete it. If this is an error, please communicate this issue to support.',
    });
}

function displayErrorModal(messageData, title='Error') {
    VV.Form.Global.DisplayModal({ Title: title, Icon: 'error', HtmlContent: messageData });
}

const webServiceName = 'LibChecklistMeasureTaskComplete';
function CallServerSide() {
    VV.Form.ShowLoadingPanel();
    const formData = [
        {
            name: 'User ID',
            value: VV.Form.FormUserID
        },
        {
            name: 'Checklist Task ID',
            value: VV.Form.GetFieldValue('Checklist Task ID')
        },
        {
            name: 'Provider ID',
            value: VV.Form.GetFieldValue('Provider ID')
        },
        {
            name: 'Record ID',
            value: VV.Form.GetFieldValue('Record ID')
        },
        {
            name: 'Related Record ID',
            value: VV.Form.GetFieldValue('Related Record ID')
        },
        {
            name: 'Related Record GUID',
            value: VV.Form.GetFieldValue('Related Record GUID')
        },
        {
            name: 'Uploaded Document ID',
            value: VV.Form.GetFieldValue('Uploaded Document ID')
        },
        {
            name: 'Uploaded Document GUID',
            value: VV.Form.GetFieldValue('Uploaded Document GUID')
        },
        {
            name: 'Upload Path',
            value: VV.Form.GetFieldValue('Upload Path')
        },
        {
            name: 'Documentation Type',
            value: VV.Form.GetFieldValue('Documentation Type')
        },
        {
            name: 'Comments',
            value: VV.Form.GetFieldValue('Comments')
        }
    ];

    // Parse the data as a JSON string
    const data = JSON.stringify(formData);

    const requestObject = $.ajax({
        type: 'POST',
        url: `${VV.BaseAppUrl}api/v1/${VV.CustomerAlias}/${VV.CustomerDatabaseAlias}/scripts?name=${webServiceName}`,
        contentType: 'application/json; charset=utf-8',
        data: data,
        success: '',
        error: '',
    });

    return requestObject;
}

$.when(CallServerSide())
    .always(function (resp) {
        VV.Form.HideLoadingPanel();
        let message;
        if (typeof resp.status != 'undefined') {
            message = `A status code of ${resp.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`;
            displayErrorModal(message);
        } else if (typeof resp.statusCode != 'undefined') {
            message = `A status code of ${resp.statusCode} with a message of '${resp.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`;
            displayErrorModal(message);
        } else if (resp.meta.status == '200') {
            if (resp.data[0] != undefined) {
                if (resp.data[0] == 'Success') {
                    // Note: "Success" status signals task is complete
                    if (tasksData.length == 1) {
                        // If the current task was the last one to complete, prompt to user to return to the originating 
                        // record ("previous screen") and make any updates to that record (if necessary)
                        VV.Form.Template.DisplayChecklistTasksCompletedModal();
                    } else {
                        // Eliminate completed task from json object
                        tasksData.splice(index, 1);

                        if (direction === 'Next') {
                            index = index % tasksData.length;
                        } else if (direction === 'Back') {
                            if (index === 0) {
                                needConfirmNoPrevious = true;
                            }
                            else {
                                index = ((index-1) + tasksData.length) % tasksData.length;
                            }
                        } else {
                            throw new Error(`Direction ${direction} not defined`);
                        }

                        if (needConfirmNoPrevious) {
                            displayNoPreviousTaskModal();
                        }
                        else {
                            // Note: No modal is shown when a task completes
                            updateFormFields();
                        }
                    }
                } else if (resp.data[0] == 'Error') {
                    // Note: "Error" status signals task was not completed

                    // Update index to go to the next or previous task
                    if (direction === 'Next') {
                        index = (index + 1) % tasksData.length;
                    } else if (direction === 'Back') {
                        if (index === 0) {
                            needConfirmNoPrevious = true;
                        }
                        else {
                            index = ((index-1) + tasksData.length) % tasksData.length;
                        }
                    } else {
                        throw new Error(`Direction ${direction} not defined`);
                    }

                    if (needConfirmNoPrevious) {
                        displayNoPreviousTaskModal();
                    }
                    else {
                        displayTaskNotCompleteModal();
                        updateFormFields();
                    }
                    
                } else {
                    message = `An unhandled response occurred when calling ${webServiceName}. The form will not save at this time.  Please try again or communicate this issue to support.`;
                    displayErrorModal(message);
                }
            } else {
                message = 'The status of the response returned as undefined.';
                displayErrorModal(message);
            }
        } else {
            message = `The following unhandled response occurred while attempting to retrieve data on the server side get data logic. ${resp.data?.error} <br>`;
            displayErrorModal(message);
        }
    });
}
