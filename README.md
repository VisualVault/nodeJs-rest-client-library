

NodeJs Client Library for VisualVault
=====================================

VisualVault allows you to define Outside Services which may be called from Form Buttons, Form Scripts, event handlers, and on a scheduled basis.  Two types of Outside Services you can create are Web services or NodeJs Scripts.  The Web service type of outside service is discussed on our developer site at [http:/developer.visualvault.com][1].  

VisualVault Node.js integration allows you to store and execute JavaScript files capable of interacting with the VisualVault API. The scripts are stored and executed server-side allowing you to build a re-useable script library of business processes and automation.

Getting Started
-----------
 ***(1) Tell VisualVault where to find the node.js server***.

For production use no action is required, VisualVault will select an available node.js server which has been pre-configured for you.  

***(2) Configure a node.js server for development and testing***

For testing and development most people will want to configure their own node.js server which allows you to debug your script files in an IDE such as WebStorm.

This installation topic below covers how to setup a node.js server running on Windows and leveraging IIS but most of the instructions are applicable to any platform.

***(3) Publish script files***

Store your script files in VisualVault

***(4) Execute script files***

Execute scripts using Form buttons, Form scripts, or schedule scripts to run at pre-defined intervals.


Setting up a node.js server for use with VisualVault
----------------------------------------------------

The steps below assume you're setting up a node.js server on Windows and optionally using IIS.

###Installation of node.js

Install may be downloaded from  - http://nodejs.org/download/
The installation on Windows will place the node.js executable in \program files\nodeJs and register a path environment variable necessary for locating the node.js exe from a command prompt.


###Install IISNode (optional)

On the VisualVault server side we use IISNode from Microsoft to receive requests and invoke the node.js executable. This approach provides the robust process management of IIS where each instance of node.js is managed similar to an asp.net worker processes.  

If you are setting up node.js to test scheduled scripts or if you're setting up node.js for server-side use with VisualVault (i.e. setting up your own instance of VisualVault) then proceeed with the installation and configuration of IIS Node.

Installing IISNode is optional and not required unless you need VisualVault to execute node.js scripts unattended (without first executing node.exe and running the app.js VisualVault node client script described in the debugging section below).

***-Install IISnode for IIS 7.x/8.x***  
x86 -  http://go.microsoft.com/?linkid=9784330
x64 - http://go.microsoft.com/?linkid=9784331

This will create the directory path C:\Program Files\iisnode, with a subdirectory named ‘www’ where applications are to be hosted.

***-Install URL Rewrite***    
http://www.iis.net/downloads/microsoft/url-rewrite
x86 - http://go.microsoft.com/?linkid=9722533
x64 - http://go.microsoft.com/?linkid=9722532

***-Grant the IIS_IUSRS group full permissions to the IISNode web site root folder*** at "c:\program files\iisnode\www"

    Using Command prompt and running in administrator mode:
    C:\windows\system32\icacls.exe "c:\program files\iisnode\www" /grant IIS_IUSRS:(OI)(CI)F


***-Create an IIS virtual directory***  
   
    Using Command prompt with running in administrator mode:
    C:\windows\system32\inetsrv\appcmd.exe add app /site.name:"Default Web Site" /path:/node /physicalPath:"c:\program files\iisnode\www"

The example above assumes you have a web site named Default Web Site

###Create directory VVNodeServer

If you installed IISNode then create the  VVNodeServer directory at:

    Physical path   -   c:\program files\iisnode\www\vvnodeserver

If you did not install IISNode the vvnodeserver directory may be created in any location you choose.


###Install node package dependencies

    Using Command prompt running in administrator mode:

    Change to the VVNodeServer directory created in previous step

    Install the following node packages using node package manager.  Note: the packages must be installed using the optional version number for each package for compatibility.

    npm install express@3.4.1
    npm install js-yaml@2.1.3
    npm install q@0.9.7
    npm install request@2.27.0
    npm install node-uuid@1.4.1


###Create subdirectory structure in the vvnodeserver directory

####vvnodeserver\
    \files
    \routes

###Place VisualVault node.js client files in the appropriate directories

####vvnodeserver\
    app.js
    config.yml
    VVClient.js
    VVEntities.js
    web.config

####vvnodeserver\routes
    scheduledscripts.js
    scripts.js
    
    
###Debugging your node.js scripts

There are many different JavaScript IDE's. The instructions below are for the JetBrains WebStorm IDE.

Download and install WebStorm from [http://www.jetbrains.com/webstorm/][1]. 

Using the WebStorm documentation as a guide, create a new "Run/debug" configuration.  In the new Run/Debug configuration define the following items:

 1. The path to your Node intrepreter (c:\program files\nodejs\node.exe) 
 2. Your working directory (C:\Program Files\iisnode\www\vvnodeserver)
 3. The JavaScript file to run when you start debugging (app.js)

This debug configuration allows you to set a breakpoint in any of the VisualVault node.js JavaScript files and click the debug icon within WebStorm.  Starting a debug session this way will launch node.js and run the app.js boot strap script which begins listening for http requests on port 3000.

When VisualVault sends a script file to the node.js server URL, the script file is written to the vvnodeserver\files directory, loaded, then executed.

If you'd like to debug your script file using break points, edit the routes\scripts.js file using the example below and hard code the script file name to be run vs. dynamically loading the script received from VisualVault.

    //load the script file we just saved to the filesystem
    var user = require("../files/" + fileId);
    
    // YOU CAN SWAP OUT YOUR SCRIPT HERE IF YOU WANT TO TEST
    //var user = require("../files/yourScriptName");


###Example node.js script

Additional examples available at [http:/developer.visualvault.com][1]

    // Send Email using VisualVault API
    
    module.exports.getCredentials = function () {
        var options = {};
    	
    	//Your customer name found in the VisualVault URL
        options.customerAlias = "ACME";
    	
    	//Your customer database name found in the VisualVault URL
        options.databaseAlias = "main5";
    	
    	//User account credentials
        options.userId = "vault.config";	
        options.password = "p";
    	
    	//Developer account or registered OAuth application credentials
    	options.clientId = "fbb02e0c-2e97-4527-a6d7-9438d8b7b23c";
        options.clientSecret = "bBb+IlcCV5duoyyHvrYYamSrDVMGf+rgJ4Gbhn6R7N4=";
    
        return options;
    };
    
    module.exports.main = function (vvClient, response) {
        var currentDate = new Date();
        var Q = require('q');
    
        var emailParams = '';
        var emailData = {};
        emailData.recipients = 'someone@visualvault.com';
        emailData.body = 'test';
        emailData.subject = 'scheduled script test';
    
    	//Q is a node package used to create promise objects
    	//Node.js scripts are asynchronous!
    	
        Q
            .allSettled(
                [
                    vvClient.email.postEmails(emailParams, emailData)
                ]
            )
            .then(function (result) {
                console.log("PostEmails success");
            })
            .fail(function (error) {
                console.log("Error response from postEmails: " + error.message);            
            });   
    }

  [1]: http:/developer.visualvault.com
