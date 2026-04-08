/**
 * VV.Form.Global.GIS_GetMapViewManager
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
/*
    Function Name: GIS_GetMapViewManager
    Customer:      Washington DNR
    Purpose:       The purpose of this object is to store the view of the map
                    so when the modal is closed and reopen the view/map is saved.
    Parameters:    none
    Date of Dev:   12/23/2024
    Last Rev Date: 12/23/2024
    --/--/----  - - : Function created.
    12/23/2024  - Ross Rhone: Created mapViewManager
    06/19/2025 - Ross Rhone: Added editorDrawPane to keep track of when the pane needs to be drawn when the modal closes.
                 For example the back button needs to be reinserted into the DOM because ESRI's code removes it when the modal
                 is closed.
*/
const mapViewManager = {
    _map: null,
    _view: null,
    _calciteAppNav: null,
    _calciteAppPanel: null,
    _editor: null,
    _stateBeforeClose: null,

    get map() {
        return this._map;
    },
    set map(newMap) {
        this._map = newMap;
    },
    get view() {
        return this._view;
    },
    set view(newView) {
        this._view = newView;
    },
    get calciteAppNav() {
        return this._calciteAppNav
    },
    set calciteAppNav(newAppNav) {
        this._calciteAppNav = newAppNav
    },
    get calciteAppPanel() {
        return this._calciteAppPanel
    },
    set calciteAppPanel(newAppPanel) {
        this._calciteAppPanel = newAppPanel
    },
    get editor() {
        return this._editor;
    },
    set editor(newEditor) {
        this._editor = newEditor;
    },
    get stateBeforeClose() {
        return this._stateBeforeClose;
    },
    set stateBeforeClose(newStateBeforeClose) {
        this._stateBeforeClose = newStateBeforeClose;
    }
};

return mapViewManager;
}
