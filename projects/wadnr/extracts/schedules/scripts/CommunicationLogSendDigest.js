/**
 * CommunicationLogSendDigest
 * Category: Scheduled
 * Modified: 2025-12-10T20:53:40.88Z by roobini.krishnandam@visualvault.com
 * Script ID: Script Id: d656f00d-c290-ef11-82ae-862bfd7a22f1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-10
 */
var logger = require("../log");

module.exports.getCredentials = function () {
  var options = {};
  options.customerAlias = 'WADNR';
  options.databaseAlias = 'fpOnline';
  options.userId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
  options.password = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
  options.clientId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
  options.clientSecret = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
  return options;
};

module.exports.main = async function (vvClient, response, token) {
  /*Script Name:   CommunicationLogSendDigest
     Customer:      VisualVault
     Purpose:       Purpose of this script is acquire list of communication logs that need to be sent as a digest and send them to recipients together.
     Parameters:    The following represent variables passed into the function: None.
     Return Array:  The following represents the array of information returned to the calling function.  This is a standardized response.  Any item in the array at points 2 or above can be used to return multiple items of information.
                    - Message will be sent back to VV as part of the ending of this scheduled process.
    Process Pseudocode:   The following documents the pseudo code for this process.
                    Step1:  Run a query to acquire list of communications logs that are marked to be sent.
                    Step2:  Create an array of recipients.  Load into an array.
                    Step3:  Send an email and update the form with sending information if the send was successful.
                    Step4:  Measure results and communicate completion.
           
     Date of Dev:   05/20/2019
     Last Rev Date: 03/31/2023

     Revision Notes:
     05/20/2019 - Jason Hatch:  Initial creation of the business process. 
     08/02/2019 - Jason Hatch:  Added throttling mechanisms to slow down the emails.
     08/03/2019 - Jason Hatch:  Added timezone mechanisms to set communication time in Eastern time.
     08/06/2019 - Rufus Peoples: For use in Lincoln Comm Log
     09/06/2019 - Jonathan Mitchell: Update error email list to be a configurable group of users rather than hard-coded email addresses.
     09/08/2019 - Kendra Austin: QA of 9/6 work and troubleshooting bugs. Resolved issue with duplicate emails to same email address, 
                                 blank emails, and posting too many form revisions of the comm logs.
     11/13/2019 - Michael Rainey: updated time zone to New York for DOH
     04/27/2020 - Kendra Austin: Update to async to ensure throttling mechanism is functional.
     02/21/2022 - Fabian Montero: Updated communication sent date to be a UTC ISO string. 
     03/31/2023 - Michael Rainey: Clean up code and implement for PA
     05/16/2023 - Michael Rainey: Updated Messagesloaded error checking to actually check for messages loaded.
     06/18/2025 - Fernando Chamorro: Define dynamic Subject and removing Subject in the body
     */

  logger.info("Start of the process CommunicationLogSendDigest at " + Date());

  response.json(
    "200",
    "Process started, please check back in this log for more information as the process completes.",
  );

  //CONFIGURABLE VALUES IN THE FOLLOWING AREA.
  var commLogTemplateID = "Communications Log"; //This is the communication log form template name.
    var commLogQuery = "zWebSvc Communication Send Digest"; //This is the name of the query that will be used to get digest emails.
    //var commLogQuery = "Communication Send Digest"; //This is the name of the query that will be used to get digest emails.
  var subjectForDigest = "Daily Digest Email"; //This is the subject of the digest email.
  var groupsToNotifyOfError = ["VaultAccess"]; //These are the groups to notify if an error occurs during this process.

  var frequencyEmailSendinms = 5000; //This is the number of milleseconds delay between sending each email.
  //END OF CONFIGURABLE VALUES

  //Other globally used variables.
  var errorLog = []; //Array for capturing error messages that may occur.
  var recipientArray = []; //Array of objects for all the recipients.
  var guidArray = []; //Variable for list of GUIDS associated with the communication logs so they can be marked as sent.

  try {
    //This function takes a configurable number of milliseconds to complete and returns a promise
    var waitFunction = function () {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve("Waited");
        }, frequencyEmailSendinms);
      });
    };

    //Function to load the recipientArray
    var LoadRecipientArray = function (communicationArray) {
      //Load the recipient array.
      communicationArray.forEach(function (item) {
        //We will load an object into an array for each recipient.  The object will identify the recipient.
        //It will also have an array of messages.  Each array will have an object of Subject and Body.

        //Take the item being passed in and extract it into an array of recipients.
        var recipientList = item["email Recipients"].split(",");
        if (recipientArray.length === 0) {
          //Load for the first time.  Go throug complete list of recipients.
          recipientList.forEach(function (recipItem) {
            var recipObj = {};
            recipObj.recipient = recipItem.toLowerCase().trim();
            recipObj.messageArrays = [];
            recipientArray.push(recipObj);
          });
        } else {
          //Go through each recipient to see if they are in the recipientArray already.  If not, add to the array.
          recipientList.forEach(function (recipItem) {
            var foundRecip = "No";
            recipientArray.forEach(function (recipArrayItem) {
              if (
                recipItem.toLowerCase().trim() ===
                recipArrayItem.recipient.toLowerCase().trim()
              ) {
                foundRecip = "Yes";
              }
            });

            if (foundRecip === "No") {
              var recipObj = {};
              recipObj.recipient = recipItem.toLowerCase().trim();
              recipObj.messageArrays = [];
              recipientArray.push(recipObj);
            }
          });
        }
      });
      return true;
    };

    //The following function will be used to load the digest message information into the RecipientArray
    var LoadMessageData = function (communicationArray) {
      communicationArray.forEach(function (commItem) {
        //We will load an object into an array for each recipient.  The object will identify the recipient.
        //It will also have an array of messages.  Each array will have an object of Subject and Body.

        //Take the item being passed in and extract it into an array of recipients.
        var recipientList = commItem["email Recipients"].split(",");

        //Go through each recipient to see if they are in the recipientArray already.  If not, add to the array.
        recipientList.forEach(function (recipItem) {
          //Go through the array of recipients and their messages to add to the messageArray.
          recipientArray.forEach(function (recipArrayItem) {
            //locate recipient.
            if (
              recipItem.toLowerCase().trim() ===
              recipArrayItem.recipient.toLowerCase().trim()
            ) {
              //recipient is found.  Look for the message and load it.
              if (recipArrayItem.messageArrays.length === 0) {
                var messageObj = {};
                messageObj.subject = commItem["subject"];
                messageObj.body = commItem["email Body"];
                messageObj.messageGUIDS = commItem["dhid"];
                recipArrayItem.messageArrays.push(messageObj);
              } else {
                //Go through each recipient to see if the message exits or not.  If not, add to the array.
                var messageFound = "No";
                recipArrayItem.messageArrays.forEach(function (messageItem) {
                  if (
                    messageItem.subject.toLowerCase().trim() ===
                    commItem.subject.toLowerCase().trim()
                  ) {
                    messageFound = "Yes";
                    //Message is found so add to the body and messageGUIDS of the message
                    messageItem.body =
                      messageItem.body + "<br>" + commItem["email Body"];
                    messageItem.messageGUIDS =
                      messageItem.messageGUIDS + ", " + commItem["dhid"];
                  }
                });

                //Not found so push the information to the recipArrayItem
                if (messageFound === "No") {
                  var messageObj = {};
                  messageObj.subject = commItem["subject"];
                  messageObj.body = commItem["email Body"];
                  messageObj.messageGUIDS = commItem["dhid"];
                  recipArrayItem.messageArrays.push(messageObj);
                }
              }
            }
          });
        });
      });
      return true;
    };

    //The following function will get user email addresses from the groups identified to send any errors to.
    const getUserEmailsByGroups = async function (vvClient, groupArray) {
      try {
        let userInfoResponse = await vvClient.scripts.runWebService(
          "LibGroupGetGroupUserEmails",
          [
            {
              name: "groups",
              value: groupArray,
            },
          ],
        );
        if (userInfoResponse.meta.status === 200) {
          if (userInfoResponse.data[0] === "Success") {
            return userInfoResponse.data[2]
              .map((entry) => entry["emailAddress"])
              .join();
          } else {
            //Log errors so they aren't lost
            errorLog.forEach(function (log) {
              logger.info(log);
            });

            //Then throw error
            throw new Error(
              "The call to get notification emails returned with an error.",
            );
          }
        } else {
          //Log errors so they aren't lost
          errorLog.forEach(function (log) {
            logger.info(log);
          });

          //Then throw error
          throw new Error(userInfoResponse.meta.statusMsg);
        }
      } catch (error) {
        logger.info(error);
        return false;
      }
    };

    /*
                START OF MAIN CODE
        */

    //Parameter for the query.  Does not need a filter at this time.    Query looks like the following:
    // SELECT *
    // FROM [Communications Log]
    // WHERE [Communication Type] = 'Email' AND
    //             [Email Type] = 'Digest' AND
    //             [Communication Sent] <> 'Yes' AND
    //             [Scheduled Date] < GetDate() AND
    //             [Approved] = 'Yes'
    // ORDER BY [Email Recipients], [Subject]

    var queryparams = {};
    queryparams = { filter: "" };

    //Run query to get the communication log items.
    let queryResponse = await vvClient.customQuery.getCustomQueryResultsByName(
      commLogQuery,
      queryparams,
    );
    var responseData = JSON.parse(queryResponse);
    if (responseData.data.length === 0) {
      throw new Error("No communication log records found.");
    }

    //Put the array of communication logs into an array.
    let commArray = responseData.data;

    //Load the recipients into the recipient array.
    let recipientsLoaded = LoadRecipientArray(commArray);
    if (!recipientsLoaded) {
      throw new Error("Unable to load the array of recipients.");
    }

    //Load the messages into the recipient array.
    let messagesLoaded = LoadMessageData(commArray);
    if (!messagesLoaded) {
      throw new Error("Unable to load messages into the array of recipients.");
    }

    //Send each item
    let numberToSend = recipientArray.length;
    for (var i = 0; i < numberToSend; i++) {
      var item = recipientArray[i];

      //Load the email object.
      var emailObj = {};
      emailObj.recipients = item["recipient"];
      //emailObj.ccrecipients = item['cc'];
      emailObj.subject = subjectForDigest;
      emailObj.body = "";

      //Load each of the messages into the body.  Subject is used as section header.
      item.messageArrays.forEach(function (messageItem) {
        // Define dynamic Subject
        if (messageItem.subject) {
          emailObj.subject = messageItem.subject;
        }

        emailObj.body += messageItem.body + "<br><br><br>";

        //Load the GUIDS into an array so each form can be updated that it has been sent to the recipient.
        var splitGUID = messageItem.messageGUIDS.split(", ");
        splitGUID.forEach(function (guidItem) {
          //Assume not going to find this guid in the array
          var guidFound = false;

          //Go through the existing list of GUIDs handled to see if it's there already
          guidArray.forEach(function (existingGuid) {
            if (guidItem === existingGuid) {
              guidFound = true;
            }
          });

          //If it wasn't there already, add it.
          if (!guidFound) {
            guidArray.push(guidItem);
          }
        });
      });

      //Send email
      let emailResp = await vvClient.email.postEmails(null, emailObj);
      if (emailResp.meta.status !== 201) {
        errorLog.push(
          "Email could not be sent to " +
            emailObj.recipients +
            " with subject of " +
            emailObj.subject,
        );
      }

      //Wait the configurable number of milliseconds.
      let waitingPeriod = await waitFunction();
      if (waitingPeriod !== "Waited") {
        errorLog.push("The waiting period did not behave as expected.");
      }
    }

    //Now update the form that it was sent. Need to process each form/guid that is present.
    var numberFormsToUpdate = guidArray.length;
    for (var j = 0; j < numberFormsToUpdate; j++) {
      var guidItem = guidArray[j];

      //Load the update object. Include a local timestamp.
      var updateObj = {};
      var utcScheduledTime = new Date().toISOString();
      updateObj["Communication Date"] = utcScheduledTime; //Set time to right now, in UTC. The form viewer and VV will display in client time zone.
      updateObj["Communication Sent"] = "Yes";

      let updateResp = await vvClient.forms.postFormRevision(
        null,
        updateObj,
        commLogTemplateID,
        guidItem,
      );
      if (updateResp.meta.status !== 201) {
        errorLog.push(
          "Error encountered when updating Comm Log form id " + guidItem,
        );
      }
    }

    // For testing, force an error into array to trigger getUsersToNotifyOnError lookup
    //errorLog.push('Example error for testing');
    if (errorLog.length > 0) {
      //Get the group of users who should get the error log.
      var errorLogRecipients = await getUserEmailsByGroups(
        vvClient,
        groupsToNotifyOfError,
      );

      //If recipients were returned, send the error log email to them
      if (errorLogRecipients) {
        var errorEmailObj = {};
        errorEmailObj.recipients = errorLogRecipients;
        errorEmailObj.subject = "Error Occurred with Digest Email";
        errorEmailObj.body =
          "An error occurred when when attempting to send digest emails.  Errors were as follows: <br><br>";
        errorLog.forEach(function (error) {
          errorEmailObj.body += error + "<br>";
        });
        let errorEmailResp = await vvClient.email.postEmails(
          null,
          errorEmailObj,
        );
        if (errorEmailResp.meta.status !== 201) {
          logger.info(
            "The error email for CommunicationLogSendDigest was not sent on " +
              new Date(),
          );
        }
      }
    }

    //Last Thing: Measure results and return responses.
    if (errorLog.length > 0) {
      //Errors captured
      // response.json('200', 'Error encountered during processing.  Please contact support to troubleshoot the errors that are occurring.' );
      return vvClient.scheduledProcess.postCompletion(
        token,
        "complete",
        true,
        "Error encountered during processing.  Please contact support to troubleshoot the errors that are occurring.",
      );
    } else {
      // response.json('200', 'Emails processed successfully');
      return vvClient.scheduledProcess.postCompletion(
        token,
        "complete",
        true,
        "Emails processed successfully",
      );
    }
  } catch (err) {
    return vvClient.scheduledProcess.postCompletion(
      token,
      "complete",
      true,
      "Error encountered during processing.  Error was " + err,
    );
  }
};

