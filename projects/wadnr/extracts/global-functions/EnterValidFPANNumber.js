/**
 * VV.Form.Global.EnterValidFPANNumber
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (messageText, labelText, templateName = '') {
/*
    Script Name:    EnterValidFPANNumber
    Customer:       WADNR
    Purpose:        Prompts the user to enter a valid FPAN Number and calls ValidateFPANNumberOwnership to validate it.
    Parameters:     The following represent variables passed into the function: 
                    messageText (optional): Custom message text to display in the modal. 
                                           Default: "Enter the approved FPA/N Number."
                    labelText (optional): Custom label text for the input field.
                                         Default: "Approved FPA/N Number:"
    Return Value:   The following represents the value being returned from this function:
                    No data returned
    Date of Dev:    09/03/2025  
    Last Rev Date:  01/07/2025
    Revision Notes:
                    09/03/2025 - Mauro Rapuano : First setup of the script.
                    01/07/2025 - Added optional parameters messageText and labelText to allow customization of the modal message and input field label.
*/

showEnterValidFPANNumberModal(messageText, labelText, templateName);

function showEnterValidFPANNumberModal(messageText, labelText, templateName) {
    // Use default message if not provided
    const displayMessage = messageText || "Enter the approved FPA/N Number.";
    
    // Use default label if not provided
    const displayLabel = labelText || "Approved FPA/N Number:";
    
    // HTML content for the modal
    const modalHtml = `
    <p>${displayMessage}</p>
    <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem 0;">
        <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
        <label for="approvedFPANNumber" style="text-align: left; white-space: nowrap;">
            ${displayLabel}
        </label>
        <input type="text" id="approvedFPANNumber" style="padding: 0.3rem; width: 50%;" />
        </div>
    </div>
    `;

    return Swal.fire({
        icon: "question",
        title: `FPAN Number Input`,
        html: modalHtml,
        showCancelButton: true,
        showConfirmButton: true,
        allowOutsideClick: false,
        confirmButtonText: "Ok",
        cancelButtonText: "Cancel",
        width: "50rem", // Modal width
        preConfirm: () => {
            const approvedFPANNumber = document.getElementById("approvedFPANNumber").value.trim();   
            const validationMessage = validateFPANNumberInput(approvedFPANNumber);

            if(validationMessage) {
                Swal.showValidationMessage(`${validationMessage}`);
                return false;
            }            

            return { fpanNumber: approvedFPANNumber };
        },
    }).then((result) => {
        if (result.isConfirmed) {
            const approvedFPANNumber = result.value.fpanNumber;            
            const individualId = VV.Form.GetFieldValue('Individual ID');
            const formId = VV.Form.DhDocID;
            const isProponent = VV.Form.GetFieldValue('isProponent') === 'True' || VV.Form.GetFieldValue('IsProponent') === 'True';

            return VV.Form.Global.ValidateFPANNumberOwnership(approvedFPANNumber, individualId, formId, !isProponent, templateName);
            
        } else if (result.isDismissed) {
            showCloseModalConfirmation(messageText, labelText);
        }
    });
}

function showCloseModalConfirmation(messageText, labelText){
    Swal.fire({
        icon: "question",
        title: `Close the form`,
        html: 'Are you sure you want to cancel and close the form?',
        showCancelButton: true,
        showConfirmButton: true,
        allowOutsideClick: false,
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        width: "50rem", // Modal width
    }).then((result) => {
        if (result.isConfirmed) {
            // Set form as 'Ready to Delete' and close
            Promise.all([
                VV.Form.SetFieldValue('Status', 'Ready to Delete'),
                VV.Form.SetFieldValue('FPAN Number Not Provided', 'True'),
            ]).then(() => {
                VV.Form.DoAjaxFormSave().then(() => {
                    window.close();
                })
            });
        } else if (result.isDismissed) {
            showEnterValidFPANNumberModal(messageText, labelText);
        }
    });
}

function validateFPANNumberInput(value) {
    // 1. Check if not empty
    if (!value || !value.trim()) {
        return 'Field cannot be empty or contain only spaces';
    }

    const cleanValue = value.trim();

    // 2. Validate maximum length FIRST
    if (cleanValue.length > 20) {
        return 'Cannot exceed 20 characters';
    }

    // 3. Check for quotes (not allowed in any format)
    if (cleanValue.includes('"') || cleanValue.includes("'")) {
        return 'Quotes are not allowed in any format';
    }

    // 4. Check if it matches legacy format (numbers only)
    if (isLegacyFormat(cleanValue)) {
        // Additional validation for legacy format
        if (cleanValue.length < 1) {
            return 'Legacy format must contain at least 1 number';
        }
        return null; // Valid legacy format
    }

    // 5. Check if it has hyphen structure (potential standard format)
    if (cleanValue.includes('-')) {
        const parts = cleanValue.split('-');

        // Validate number of parts
        if (parts.length !== 4) {
            return 'Standard format must have exactly 4 parts separated by hyphens';
        }

        // Validate each part individually
        if (parts[0].length < 2) {
            return 'First part must be at least 2 letters';
        }

        if (!/^[A-Za-z]+$/.test(parts[0])) {
            return 'First part must contain only letters';
        }

        if (parts[1].length < 2 || parts[1].length > 3) {
            return 'Second part must be 2-3 letters';
        }

        if (!/^[A-Za-z]+$/.test(parts[1])) {
            return 'Second part must contain only letters';
        }

        if (parts[2].length < 1 || !/^\d+$/.test(parts[2])) {
            return 'Third part must be numbers only';
        }

        if (parts[3].length < 1 || !/^\d+$/.test(parts[3])) {
            return 'Fourth part must be numbers only';
        }

        return null; // Valid standard format
    }

    // 6. If neither format matches
    return 'FPAN Number must match either standard format (XX-XXX-##-####) or legacy format (numbers only)';
}

// Check if it's legacy format (numbers only)
function isLegacyFormat(value) {
    return /^\d+$/.test(value.trim());
}

// Check if it's standard format (XX-XXX-##-####)
function isStandardFormat(value) {
    // Pattern: 2+ letters, hyphen, 2-3 letters, hyphen, 1+ numbers, hyphen, 1+ numbers
    return /^[A-Za-z]{2,}-[A-Za-z]{2,3}-\d+-\d+$/.test(value.trim());
}
}
