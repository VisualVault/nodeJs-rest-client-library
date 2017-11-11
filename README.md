

NodeJs Client Library for VisualVault
=====================================

VisualVault allows you to define Outside Services which may be called from Form Buttons, Form Scripts, event handlers, and on a scheduled basis.  Two types of Outside Services you can create are Web services or NodeJs Scripts.  The Web service type of outside service is discussed on our developer site at [http:/developer.visualvault.com][1].  

VisualVault Node.js integration allows you to store and execute JavaScript files capable of interacting with the VisualVault API. The scripts are stored and executed server-side allowing you to build a re-useable script library of business processes and automation.

Getting Started
-----------
 ***(1) Tell VisualVault where to find the node.js server***.

For production use no action is required, VisualVault will select an available node.js server which has been pre-configured for you. 

 ***(2) Setup your development machine with a JavaScript IDE and node.js***

For development, install node.js on your dev machine there is a good tutorial with platform specific installation instructions located here:

https://code.visualstudio.com/docs/nodejs/nodejs-tutorial

The VisualVault node.js client library requires node version 4.2.6 which is not the latest version of node.  Prior node release downloads can be found here:  https://nodejs.org/en/download/releases/

After installing node.js on your development machine you will need to install NPM packages required by the VisualVault node.js client library.  Install the following node packages using node package manager.  

Note: the packages must be installed using the optional version number for each package for compatibility.

    npm install express@3.4.1
    npm install js-yaml@2.1.3
    npm install q@0.9.7
    npm install request@2.27.0
    npm install node-uuid@1.4.1
    npm install winston@0.7.3

 ***(3) Copy the files from the VisualVault node.js client library into your node project folder***.

 ###Create the following subdirectory structure in your project

####vvnodeserver\
    \files
    \routes

###Place VisualVault node.js client library files in the \vvnodeserver and \vvnodeserver\routes directories

####vvnodeserver\
    app.js
    config.yml
    VVRestApi.js
    web.config

####vvnodeserver\routes
    scheduledscripts.js
    scripts.js

***(3) How to publish script files to VisualVault and debug***

coming soon

***(4) How to execute script files on your Development machine***

VisualVault will execute node scripts using Form buttons, Form scripts, or the script scheduler which executes a script at pre-defined intervals.

You can also execute a script directly on your development machine by following these instructions:

coming soon
    
 ***(5) Example node.js script using VisualVault node.js client library***   

Additional examples available at [http:/developer.visualvault.com]

```javascript
//Example of a script which authenticates with VisualVault API, sends an email, 
//gets a list of VisualVault folders, and gets a list of VisualVault sites

//This script can be executed within your IDE.  
//Note:  When VisualVault servers invoke your script (vs. you executing the script) 
//a specific function name and parameter list is required.  
//See the "Script invoked by VisualVault" example below.

var fs = require('fs');
var Q = require('q');

var vaultServerUrl = 'https://demo.visualvault.com/';
var customerAlias = 'VaultTest';
var databaseAlias = 'Main';
var apiKey = 'YOUR API KEY';
var developerId = 'YOUR API KEY';
var developerSecret = 'YOUR API SECRET';

//import the VisualVault node.js client library
var clientLibrary = require('./vvRestApi');

var vvAuthorize = new clientLibrary.authorize();

Q
    .when(
        vvAuthorize.getVaultApi(apiKey, developerId, developerSecret, vaultServerUrl, customerAlias, databaseAlias)
    )
    .then(function (result) {
    console.log("getVaultApi succeeded");
    var myVault = result;
    debugger;

    var toField = "test@visualvault.com";
    var ccField = "test@visualvault.com";
    var subjectField = "Test Subject";
    var bodyField = "Test Body";
    var emailData = {
        recipients: '',
        ccrecipients: '',
        subject: '',
        body: ''
    };

    emailData.recipients = toField;
    emailData.ccrecipients = ccField;
    emailData.subject = subjectField;
    emailData.body = bodyField;

    //send email using VisualVault API
    var emailParams = null;
    myVault.email.postEmails(emailParams, emailData);

    //get list of folders using VisualVault API
    //null parameter value will return all folders user has access to
    var folders = myVault.library.getFolders(null);

    //get list of VisualVault sites (sites are user containers) using a filter
    //q: "name eq 'home'" is a filter to return only the site named 'Home'
    //fields: comma separated list of the Site fields to return
    //A list of all field names and filter criteria can be found at http://developer.visualvault.com/api/v1/RestApi/Data/datatypeslist
    var data = {
        q: "name eq 'Home'",
        fields: "id, name"
    };

    myVault.sites.getSites(data);

    //get list of all VisualVault sites user has access to (q:null = no filter condition)
    var data2 = {
        q: null,
        fields: "id, name"
    };

    myVault.sites.getSites(data2);
    })
    .fail(function (tokenError) {
        //VisualVault node client library 
        console.log("Error response: " + tokenError.message);
    });
```

  ***(6) Example of script executed by VisualVault servers***  
  
  coming soon

