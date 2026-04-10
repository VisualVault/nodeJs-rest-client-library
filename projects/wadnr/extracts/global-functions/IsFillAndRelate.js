/**
 * VV.Form.Global.IsFillAndRelate
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
// Global function for determining if the current record was opened as a fill-and-relate from within another form
//Returns true or false.

let fillAndRelate; 

function getUrlParams() {
    var vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

if (getUrlParams().IsRelate == 'true') {
    fillAndRelate = true;
}
else {
    fillAndRelate = false;
}

return fillAndRelate;
}
