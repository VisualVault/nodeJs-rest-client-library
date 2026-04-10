/**
 * VV.Form.Global.DisplayMessaging
 * Parameters: 2
 * Extracted: 2026-04-10
 */
function (messageData, title) {
/*
	Script Name:   DisplayMessaging
	Customer:      VisualVault
	Purpose:       The purpose of this function is to display a VisualVault skinned alert message.
	Parameters:    The following represent variables passed into the function:
				   Passed Parameters:  messageData,title
				   messageData - HTML formatted string with the detailed message.
				   title - Title applied to the confirmation dialog box.
				  
	Return Value:  The following represents the value being returned from this function:
						   
	Date of Dev: 06/01/2017
	Last Rev Date: 06/17/2022
	Revision Notes:
				06/01/2017 - Tod Olsen: Initial creation of the business process.
				07/15/2021 - Jon Brown:   Update to work with VV version 5.
				06/17/2022 - Franco Petosa Ayala: update to ES6.
*/

const confirmDialog = $(`<div id="dialog-message" title="${title}"></div>`)
	.hide()
	.append($(`<p>${messageData}</p>`));
const dialogStyle = $('<style id="dialog-message-style">body { overflow: hidden; }</style>');

$('body').append(dialogStyle);
$('body').append(confirmDialog);

$('#dialog-message').dialog({
	//animation settings when opening the dialog. Remove to have no animation
	show: { 
		effect: 'drop', 
		direction: 'up', 
		duration: 250 },
	//animation settings when closing the dialog. Remove to have no animation
	hide: { 
		effect: 'drop', 
		direction: 'up', 
		duration: 250 },
	//buttons shown on modal
	buttons: [
		{
			text: "OK",
			click: function () {
                                VV.Form.HideLoadingPanel();
				$(this).dialog('close');
			},
			class: 'k-button'
		}
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
		overlay.css('position', 'fixed')
			.css('top', '0')
			.css('left', '0')
			.css('width', '100%')
			.css('height', '100%')
	},
	classes: {
	    'ui-dialog': 'k-window',
		'ui-dialog-titlebar': 'k-window-titlebar',
		'ui-dialog-content': 'k-dialog-content',
		'ui-dialog-buttonpane': 'k-dialog-buttongroup',
	},
	resizable: false,
	height: "auto",
	width: 500,
	modal: true
});
}
