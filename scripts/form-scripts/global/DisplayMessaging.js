
function DisplayMessaging(messagedata,title) {

    if (!title) {
        title = 'Message';
    }

    VV.Form.HideLoadingPanel();

    var regex1 = new RegExp(/(\r\n?|\n)/g);
    messagedata = messagedata.replace(regex1, "<br/>");

    var regex2 = new RegExp(/(\t)/g);
    messagedata = messagedata.replace(regex2, "&emsp;");

    if (messagedata && messagedata.length > 0) {
        var mw = $find(VV.MasterPage.MessageWindowID);
        if (mw !== null) {
            mw.displayMessage(title, messagedata);
        } else {
            alert(messagedata);
        }
    }
    else {
        var mw = $find(VV.MasterPage.MessageWindowID);
        if (mw !== null) {
            mw.displayMessage(title, 'Message text parameter contains no value');
        } else {
            alert('Message text parameter contains no value');
        }
    }
}
