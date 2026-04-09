/**
 * VV.Form.Global.DisplayConfirmMessaging
 * Parameters: 4
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (messageData, title, okFunction, cancelFunction) {
/*
Script Name: DisplayConfirmMessaging
Customer: VisualVault
Purpose: The purpose of this function is to display a confirmation message modal.
	Parameters: The following represent variables passed into the function:
	Passed Parameters: messageData, title, okFunction, cancelFunction
						messageData - HTML formatted string with the detailed message.
						title - Title applied to the confirmation dialog box.
						okFunction - name of the function to call if the user selects OK.
						cancelFunction - name of the function to call if the user selects cancel.
Return Value: The following represents the value being returned from this function:
						-Returns no value
Date of Dev:	06/01/2017
Last Rev Date:	06/07/2022
Revision Notes:
				06/01/2017 - Austin Noel:           Initial creation of the business process. 
				07/15/2021 - Jon Brown:             Update to work with VV version 5.
                06/07/2022 - Franco Petosa Ayala:   Update to ES6
                                                    The parameters were removed from the function which is triggered by the open event of dialog (Html element) as they were no used in the function
*/

const confirmDialog = $(`<div id="dialog-confirm" title="${title}"></div>`)
    .hide()
    .append($(`<p>${messageData}</p>`));
const dialogStyle = $('<style id="dialog-confirm-style">body { overflow: hidden; }</style>');

$('body').append(dialogStyle);
$('body').append(confirmDialog);

$('#dialog-confirm').dialog({
    //animation settings when opening the dialog. Remove to have no animation
    show: {
        effect: 'drop',
        direction: 'up',
        duration: 250,
    },
    //animation settings when closing the dialog. Remove to have no animation
    hide: {
        effect: 'drop',
        direction: 'up',
        duration: 250,
    },
    //buttons shown on modal
    buttons: [
        {
            text: 'OK',
            click: function () {
                try {
                    if (okFunction && typeof okFunction === 'function') {
                        okFunction();
                    } else if (okFunction && typeof okFunction === 'string') {
                        eval(okFunction);
                    }
                } catch (e) {
                    console.error('Could not evaluate okFunction:', e);
                }
                //VV.Form.HideLoadingPanel();
                $(this).dialog('close');
            },
            class: 'k-button',
        },
        {
            text: 'Cancel',
            click: function () {
                try {
                    if (cancelFunction && typeof cancelFunction === 'function') {
                        cancelFunction();
                    } else if (cancelFunction && typeof cancelFunction === 'string') {
                        eval(cancelFunction);
                    }
                } catch (e) {
                    console.error('Could not evaluate cancelFunction:', e);
                }
                $(this).dialog('close');
            },
            class: 'k-button',
        },
    ],
    close: function () {
        $(this).dialog('close').remove();
        $(dialogStyle).remove();
    },
    open: function () {
        $('.ui-dialog-titlebar-close')
            .addClass('k-button-icon k-button k-bare')
            .html('<span class="k-icon">&#10006;</span>')
            .css('position', 'absolute')
            .css('right', '.3em');
        $('.ui-dialog-content').css('padding', '.5em 1em');
        const overlay = $('ui-widget-overlay');
        overlay.css('position', 'fixed').css('top', '0').css('left', '0').css('width', '100%').css('height', '100%');
    },
    dialogClass: 'k-window',
    classes: {
        'ui-dialog-titlebar': 'k-window-titlebar',
        'ui-dialog-content': 'k-dialog-content',
        'ui-dialog-buttonpane': 'k-dialog-buttongroup',
    },
    resizable: false,
    height: 'auto',
    width: 500,
    modal: true,
});
}
