
//function VerifyAddress


var validateAddress = function () {
    var formData = [];
    var addressObject = {}
    addressObject.name = 'addressObject';
    addressObject.address1 = VV.Form.GetFieldValue('Street1');
    addressObject.address2 = VV.Form.GetFieldValue('Street2');
    addressObject.city = VV.Form.GetFieldValue('City');
    addressObject.state = VV.Form.GetFieldValue('State');    
    addressObject.zip = VV.Form.GetFieldValue('Zipcode');
    addressObject.country = VV.Form.GetFieldValue('Country');
    formData.push(addressObject);
        
    var data = JSON.stringify(formData);
    var requestObject = $.ajax({
        type: 'POST',
        url: VV.BaseAppUrl + 'api/v1/' + VV.CustomerAlias + '/' + VV.CustomerDatabaseAlias + '/scripts?name=VerifyAddress',
        contentType: 'application/json; charset=utf-8',
        data: data,
        success: '',
        error: ''
    });

    return requestObject;
};

var saveAddress = function (resp) {
    VV.Form.SetFieldValue('Street1',resp.data['address']['address_line1']);
    VV.Form.SetFieldValue('Street2',resp.data['address']['address_line2']);
    VV.Form.SetFieldValue('City',resp.data['address']['address_city']);
    VV.Form.SetFieldValue('State',resp.data['address']['address_state']);
    VV.Form.SetFieldValue('Zipcode',resp.data['address']['address_zip']);
}

return validateAddress().then(function (resp) {
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
            if(resp.data['ValidAddress'] === true){
              saveAddress(resp);
              //VV.Form.SetFieldValue('Address Validated','true');
              messageData = 'The address provided is valid and has been verified.'
            }
            else {
              VV.Form.SetFieldValue('Address Validated','false');
              messageData = 'The address provided may not be valid and could not be verified.'
            }
        }
    }
    else {
        messageData = resp.data.error + '\n';
    }
    return messageData;
}).then(function (messageData){   
    return messageData;
});