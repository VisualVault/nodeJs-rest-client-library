

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

Install node.js version 4.2.6 on your dev machine.  

**The VisualVault node.js client library requires node version 4.2.6 which is not the latest version of node.  Prior node release downloads can be found here:  https://nodejs.org/en/download/releases/**

**If you have a newer version of node.js on your development machine and don't wish to downgrade we suggest using the Node Version Manager available for [Linux / Mac](https://github.com/creationix/nvm) and [Windows](https://github.com/coreybutler/nvm-windows)**

Download and install Visual Studio Code (or your favorite JavaScript IDE)
------

There is a good Node.js tutorial for Visual Studio code with platform specific installation instructions located here:

https://code.visualstudio.com/docs/nodejs/nodejs-tutorial

Clone this repository
 ------
 
 **If using Visual Studio Code**
 
1. Navigate to the View menu and select the 'Command Palette" option.  
2. Enter GIT:Clone into the Command Palette text box, press enter.
3. You will be prompted for the URL of a GIT repository. Paste in: https://github.com/VisualVault/nodeJs-rest-client-library
4. You will be prompted for a local folder path where the respository files will be placed.  Select a folder path.
5. Repository will be cloned to your local workspace.  Open the Repository folder, continue followng the instructions below.
 
 **If adding the node.js client library to an existing project, create the following subdirectory structure in the existing project**
```shell
\lib
\lib\VVRestApi
\lib\VVRestApi\VVRestApiNodeJs
\lib\VVRestApi\VVRestApiNodeJs\files
\lib\VVRestApi\VVRestApiNodeJs\routes
```

**If adding the node.js client library to an existing project, copy the following files into the existing project**

```shell
\lib\VVRestApi\VVRestApiNodeJs\app.js
\lib\VVRestApi\VVRestApiNodeJs\config.yml
\lib\VVRestApi\VVRestApiNodeJs\VVRestApi.js
\lib\VVRestApi\VVRestApiNodeJs\log.js
\lib\VVRestApi\VVRestApiNodeJs\package.json

\lib\VVRestApi\VVRestApiNodeJs\routes\scheduledscripts.js
\lib\VVRestApi\VVRestApiNodeJs\routes\scripts.js
```

Install required NPM packages
------

After cloning the repository OR copying the repository files to your existing project, you will need to install the NPM packages required by the VisualVault node.js client library.  

Navgiate to the directory containting \lib\VVRestApi\VVRestApiNodeJs\package.json file and execute the following the npm install command  from a terminal window.  npm install will use the Package.json file to determine which packages and package versions to install.

```shell
    npm install
```

Configure your IDE for debugging
 ------
If using Visual Studio Code, create a "launch configuration" file which instructs VS Code that you wish to launch a Node.js script. By launching the \vvnodeserver\app.js script, you will have a debug environment which is listening for http requests on port 3001.

To create a launch.json file, open your project folder in VS Code (File > Open Folder) and then click on the Configure gear icon on the Debug view top bar.

![Configure launch.json](https://code.visualstudio.com/assets/docs/editor/debugging/launch-configuration.png)


VS Code will try to automatically detect your debug environment but if this fails, you will have to choose your debug environment manually:

![If prompted select Node.js](https://code.visualstudio.com/assets/docs/editor/debugging/debug-environments.png)

If you go back to the File Explorer view (Ctrl+Shift+E), you'll see that VS Code has created a .vscode folder in the root of your project and added the launch.json file to your workspace.

![Default launch.json file](https://code.visualstudio.com/assets/docs/editor/debugging/launch-json-in-explorer.png)

**Example launch configuration to launch Node.js and execute the VisualVault node.js client library.**

```json
{    
    "version": "0.2.0",
    "configurations": [
    {
        "type": "node",
        "request": "attach",
        "name": "Attach to Process",
        "processId": "${command:PickProcess}",
        "port": 5858
    },
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "program": "${workspaceRoot}/lib/VVRestApi/VVRestApiNodeJS/app.js"
        },
        {
            "type": "node",
            "request": "attach",
            "name": "Attach to Process",
            "address": "localhost",
            "port": 5858
        }
    ]
}

```
 
How to execute script files on your Development machine
------

VisualVault will execute node scripts using Form buttons, Form scripts, or the script scheduler which executes a script at pre-defined intervals.

If you have not already read the section "How node.js scripts are used with VisualVault" please take a moment to read.  VisualVault sends a script to execute to a node server which invokes the script's "Main" function.

When developing scripts, you can instruct VisualVault to send scripts to your development machine vs. sending the scripts to servers located within the VisualVault cloud.

The redirection of scripts to your development machine is enabled on a per user basis and does not affect all users.  

Redirection steps:

1. Authenticate with the VisualVault Web user interface using an admin account (member of the VaultAdmin or VaultAccess role).
1. Navigate to your user preferences screen (user drop down menu in top right corner of screen)
1. Scroll down to the bottom of the user preferences screen and enter your development machine's public URL

   If you do not have a public URL for your development machine, follow steps 3-4 below and use the free service provided by NGROK to create one.

1. Install NGROK using the instructions for your OS
1. From a terminal window in the NGROK directory, enter the command below which assumes your VisualVault Node.Js Client Library app is listening on port 3000 which is the default.  The port number can be changed within the app.js file.

```shell
    ngrok http 3000
```
1. If using NGROK as a secure reverse proxy to your machine, copy the NGROK Public URL generated by the command.
1. Past the public development machine URL into your VisualVault user preferences screen's Development Node Server field and save.
 
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



