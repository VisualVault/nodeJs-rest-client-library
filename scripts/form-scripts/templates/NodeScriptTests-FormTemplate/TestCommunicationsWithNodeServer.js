
//example of executing a server-side Node.Js script from the client

var callServerScript = function () {
    var formData = VV.Form.getFormDataCollection();

    var data = JSON.stringify(formData);
    var requestObject = $.ajax({
        type: "POST",
        url: VV.BaseAppUrl + 'api/v1/' + VV.CustomerAlias + '/' + VV.CustomerDatabaseAlias + '/scripts?name=TestCommunications',
        contentType: "application/json; charset=utf-8",
        data: data,
        success: '',
        error: ''
    });

    return requestObject
}

$.when(
    callServerScript()
).always(function (resp) {
    console.log(resp);
    // VV.Form.Global.DisplayMessaging(messageData);
});
