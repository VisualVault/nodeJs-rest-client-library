// credentials
module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = "customer";
    options.databaseAlias = "alias";
    options.userId = "userId";    
    options.password = "password";
    options.clientId = "clientId";
    options.clientSecret = "clientSecret";

    return options;
};

module.exports.main = function (vvClient, response, token) {   
    var Q = require('q');
    // message for writing file called
    function err(){console.log("wrote file!");}    
    // first promise to get related documents of a form by id
    Q
    .when(
        // get form related documents
        vvClient.forms.getFormRelatedDocs('34260ABE-22C1-E511-A698-E094676F83F7')
        )
        
    .then(
        function (result) {
            var response = JSON.parse(result);
            // grabs the first id from response object
            var id = response.data[0].id;
                // 2nd promise taking in the id from the first promise and passing it into the second. 
                Q
                .when( 
                    // request file bytes by id
                    vvClient.files.getFileBytesId(id)
                    )
                .then(
                    function (result) {
                        // the result will be the buffer (byte array) of requested file.
                        var bytes = result;
                        // log bytes to console or proceed with buisness logic.
                        // Here I write the bytes to the file system.
                        console.log(bytes);
                        var fs = require('fs');
                        fs.writeFile("c:/nodeTest/textNEW.xlsx",bytes,err);
                        }
                    )                 
                
                .fail(
                function (error) {
                    console.log(error);
                });  
                        
            }
        )                 
    
    .fail(
     function (error) {
        console.log(error);
     });
};