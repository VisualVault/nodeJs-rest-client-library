

NodeJs Client Library for VisualVault
=====================================

VisualVault allows you to define microservices (Outside Services) which may be called from Form Buttons, Form Scripts, event handlers, and on a scheduled basis.  Two types of Outside Services you can create are Web services or NodeJs Scripts.  The Web service type of outside service is discussed on our developer site at [http:/developer.visualvault.com][1].  

VisualVault Node.js integration allows you to store and execute JavaScript files capable of interacting with the VisualVault API. The scripts are stored and executed server-side allowing you to build a re-useable script library of business processes and automation.

How node.js scripts are used with VisualVault
------

If you create node.js scripts that you wish to be executed by VisualVault Servers these scripts must be uploaded into the VisualVault microservices library (Outside Process library) from within the VisualVault control panel.

For production use, VisualVault will select an available node.js server and transmit your script to the node server for execution when required.  VisualVault can execute a node.js script on a scheduled basis or as the result of a VisualVault iForm event handler function.

For development and debugging you can instruct VisualVault to send scripts to be executed to your development machine.  A public IP or DNS host name is required.  To specify a node.js debugging server address, log into VisualVault and click on the User menu (top right), next select the "My Preferences" menu option.  Within the preferences screen scroll down to locate the node.js server option.  Enable the debugging server and enter your node.js server URL where scripts will be posted to.

Note:  The node.js server option will only be displayed on the my preferences screen if your account has developer access.

Setup your development machine with a JavaScript IDE and node.js
------

Install node.js on your dev machine.  

There is a good tutorial with platform specific installation instructions located here:

https://code.visualstudio.com/docs/nodejs/nodejs-tutorial

**The VisualVault node.js client library requires node version 4.2.6 which is not the latest version of node.  Prior node release downloads can be found here:  https://nodejs.org/en/download/releases/**

**If you have a newer version of node.js on your development machine and don't wish to downgrade we suggest using the Node Version Manager available for [Linux / Mac](https://github.com/creationix/nvm) and [Windows](https://github.com/coreybutler/nvm-windows)**



After installing node.js on your development machine you will need to install NPM packages required by the VisualVault node.js client library.  Install the following node packages using node package manager.  

Note: the packages must be installed using the optional version number for each package for compatibility.
```shell
    npm install aws-sdk@2.63.0
    npm install express@3.4.1
    npm install js-yaml@2.1.3
    npm install q@0.9.7
    npm install request@2.27.0
    npm install node-uuid@1.4.1
    npm install winston@2.3.1
    npm install winston-cloudwatch-transport@1.0.8
```
Clone this repository OR copy the following files into your node project folder
 ------

 **If adding the node.js client library to your project, create the following subdirectory structure**

\vvnodeserver
    \files
    \routes

**If adding the node.js client library to your project, include the following files**

\vvnodeserver\app.js
\vvnodeserver\config.yml
\vvnodeserver\VVRestApi.js
\vvnodeserver\web.config

\vvnodeserver\routes\scheduledscripts.js
\vvnodeserver\routes\scripts.js

 
 Example node.js script using VisualVault node.js client library
 ------

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
How to publish script files to VisualVault and debug
------

coming soon

How to execute script files on your Development machine
------

VisualVault will execute node scripts using Form buttons, Form scripts, or the script scheduler which executes a script at pre-defined intervals.

You can also execute a script directly on your development machine by following these instructions:

coming soon


