
//display wait animation
VV.Form.ShowLoadingPanel();

//call validate address function which returns a promise object
return VV.Form.Template.VerifyAddress().then(function(messageData){
    //hide wait animation
    VV.Form.HideLoadingPanel();

    //display message returned from ValidateAddress
    VV.Form.Global.DisplayMessaging(messageData);
});