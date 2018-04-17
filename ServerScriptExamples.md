Server-Side Script Examples for VisualVault Node.js Microservices
=====================================

Central Form Field Validation Example
------

**The function below is used by other client-side form field validation functions**

```javascript
function CentralValidation(formFieldValue,validationType){

    if (typeof (VV.Form.Global.EmailReg) == 'undefined') {
        VV.Form.Global.SetupReg();
    }

    if(formFieldValue.length == 0 ){
        return false;
    }

    switch (validationType) {
        case 'Phone':
            if (VV.Form.Global.PhoneReg.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        case 'Email':
            if (VV.Form.Global.EmailReg.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        case 'URL':
            if (VV.Form.Global.URLReg.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        case 'Blank':
            if (VV.Form.Global.BlankReg.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        case 'Zip':
            if (VV.Form.Global.ZipReg.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        case 'DDSelect':
            if (VV.Form.Global.DDSelectReg.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        case 'SSN':
            if (VV.Form.Global.SSN.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        case 'EIN':
            if (VV.Form.Global.EIN.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        case 'NPI':
            if (VV.Form.Global.NPI.test(formFieldValue) == false) {
                return false;
            } else {
                return true;
            }
            break;
        default:
            alert('Incorrect value passed to Central Validation Function');
    }
}
```
