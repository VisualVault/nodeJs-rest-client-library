
//function FetchFormData


var getFormsFromApi = function () {
    var formData = VV.Form.getFormDataCollection();
       
    var data = JSON.stringify(formData);
    var requestObject = $.ajax({
        type: 'POST',
        url: VV.BaseAppUrl + 'api/v1/' + VV.CustomerAlias + '/' + VV.CustomerDatabaseAlias + '/scripts?name=FetchCities',
        contentType: 'application/json; charset=utf-8',
        data: data,
        success: '',
        error: ''
    });

    return requestObject;
};

return getFormsFromApi().then(function (resp) {
    var messageData = '';
    var isValid = false;
    if (typeof (resp.status) != 'undefined') {
        messageData = "A status code of " + resp.status + " returned from the server.  There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occured.";
    }
    else if (typeof (resp.statusCode) != 'undefined') {
        messageData = "A status code of " + resp.statusCode + " with a message of '" + resp.errorMessages[0].message + "' returned from the server. This may mean that the servers to run the business logic are not available.";
    }
    else if (resp.meta.status == '200') {
        if (typeof (resp.data[0]) != undefined) {    
            messageData = 'The data has been retrieved'
        }
    }
    else {
        messageData = resp.data.error + '\n';
    }
    return messageData;
}).then(function (messageData){   
    return messageData;
});