/**
 * VV.Form.Global.AddRecordModal
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (records, callback) {
/*
    Script Name:   AddRecordModal
    Customer:      PAELS
    Purpose:       The purpose of this process is to create a central modal for Relating a record to the current record 

    Parameters:   records[] - {text, form ID}
                  callback - the function to call when clicking the add button
    Date of Dev:   
    Last Rev Date: 3/20/2024
    Revision Notes:
    2/17/2023  - Jess Daniel: Script created.
    4/10/2024 - Moises Savelli: Add DisplayModalRemoveHiddenSweetAlertElements() for non-used elements - Accessibility Feature.
*/

// Create an array to store HTML strings for each suggestion
let recordHtmlArray = [];

// Loop through records array and create an HTML string for each suggestion
recordHtmlArray = records.map((rec, idx) => {
  return `<div class="record" data-index="${idx}" data-formid="${rec["form ID"]}">
            ${rec.text}
            <button class="k-button ng-star-inserted add-btn">Add</button>
          </div>`;
});

// Combine all the record HTML strings into one HTML string
const recordsHtml = recordHtmlArray.join("");

const recordHtml = `
        <p>
            Please choose one of the Records below and click 'Add' or 'Cancel' to return to the form.
        </p>
        <div class="records-container">
            ${recordsHtml}
        </div>
    `;

// Create the modal object with the HTML content
let modalObject = {
  Icon: "info",
  Title: `Search Records`,
  HtmlContent: recordHtml,
  Width: "50rem",
  okFunction: function () {},
  cancelFunction: function () {},
};

Swal.fire({
  icon: modalObject.Icon,
  title: modalObject.Title,
  html: modalObject.HtmlContent,
  width: modalObject.Width,
  showConfirmButton: false,
  showCancelButton: true,
}).then((result) => {
  if (result.isDismissed) {
    modalObject.cancelFunction();
  }
});

// Style each record element
$(".record").css({
  padding: "10px",
  "border-bottom": "1px solid #e0e0e0", // Light gray border
  color: "#333",
  "background-color": "transparent",
  cursor: "pointer",
  display: "flex",
  "justify-content": "space-between",
});

// Style alternate record elements
$(".record:nth-child(odd)").css({
  "background-color": "#f9f9f9", // Alternate white and light gray background
});

// Add scrollbar to records container if necessary
const recordsContainer = $(".records-container");
recordsContainer.css({
  "max-height": "300px", //This value detemines when to display the scroll bar.
  "overflow-y": "auto",
  "overflow-x": "hidden",
});

// Add hover effects to each record element
$(".record").hover(
  function () {
    $(this).css({
      "background-color": "#eaf5ff", // Subtle blue background
    });
  },
  function () {
    $(this).css({
      "background-color": "transparent",
    });
  }
);

// Add click event to each Add button
$(".add-btn").click(function () {
  const formID = $(this).parent().data("formid");

  // Display a confirmation modal
  let modalContent = `Do you want to add the selected record to the current record?`
  VV.Form.Global.DisplayModal({
    Icon: "question",
    Title: "Confirm",
    HtmlContent: modalContent,
    okFunction: okFunction 
  })

  function okFunction() {
    callback(formID)
  }
});

VV.Form.Global.DisplayModalRemoveHiddenSweetAlertElements();
}
