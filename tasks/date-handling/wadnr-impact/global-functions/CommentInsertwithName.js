/**
 * VV.Form.Global.CommentInsertwithName
 * Parameters: 3
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (addingToCommentBoxFieldName, commentBoxFieldName, commenterNameType) {
/* 
Parameters: 
- addingToCommentBoxFieldName: name of the field containing the history of older comments 
- commentBoxFieldName: name of the field containing the new comment 
- commenterNameType: type of creator stamp for the comment. Possible values are: 'Initials', 'Name', 'User ID' 
*/

const comment = VV.Form.GetFieldValue(commentBoxFieldName);

//Validate required fields
if (comment.length == 0) {
    VV.Form.Global.DisplayModal({
        Icon: "error",
        Title: 'Error',
        HtmlContent: 'Comment box is empty',
    })
}
else {
    //Confirm the user wishes to continue
    VV.Form.Global.DisplayModal({
        Icon: 'question',
        Title: 'Are you sure',
        HtmlContent: 'Are you sure you want to add this comment?',
        okFunction: addComment,
    })
}

function addComment() {
    const oldComment = VV.Form.GetFieldValue(addingToCommentBoxFieldName);
    const usUserID = VV.Form.FormUserID;
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours %= 12;
    hours = hours || 12; // Handle midnight
    let dateString = `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
    let commenterInfo = '';
    let user;

    VV.Form.CustomQuery('zWebSvc User Lookup', null, `[UsUserID] = '${usUserID}'`)
        .then((res) => {
            user = res[0];
            switch (commenterNameType) {
                case 'Initials':
                    if (user['usFirstName'] != '')
                        commenterInfo = commenterInfo.concat(`${user['usFirstName'][0]}`);                                
                    if (user['usLastName'] != '')
                        commenterInfo = commenterInfo.concat(`${user['usLastName'][0]} `);                                
                    break;
                case 'Name':
                    commenterInfo = `${user['usFirstName']} ${user['usLastName']}`;
                    break;                         
                case 'User ID':
                    commenterInfo = VV.Form.FormUserID;
                    break;
                default:
                    commenterInfo = '';
            }

            let newComment = dateString + ' ';
            if (commenterInfo != '')
                newComment = newComment + commenterInfo;
            newComment = newComment + ': ' + comment + '<br>' + oldComment;

            // Set new comment and save
            Promise.all([
                VV.Form.SetFieldValue(addingToCommentBoxFieldName, newComment),
                VV.Form.SetFieldValue(commentBoxFieldName, ''),
            ]).then(() => {
                VV.Form.DoAjaxFormSave();
            });
        });
}
}
