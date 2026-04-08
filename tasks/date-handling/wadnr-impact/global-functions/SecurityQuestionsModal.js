/**
 * VV.Form.Global.SecurityQuestionsModal
 * Parameters: 0
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function () {
const securityQuestions = [
  "What is the first school you attended?",
  "What is your favorite author's last name?",
  "What is your favorite movie?",
  "What city was your spouse born in?",
  "What was the first name of your childhood best friend?",
  "Who do you most admire?",
  "Who is your favorite musical artist?",
  "What was the name of the hospital where you were born?",
  "What was the name of the city where you were born?",
  "What was the name of the street you lived on when you grew up?",
  "What was the model of your first automobile?",
  "What was the name of your childhood pet?",
  "Who did you want to go to the prom with?",
  "What is the last name of your first-grade teacher?",
  "What is your favorite quotation?",
  "What is the first line of your favorite song or poem?",
  "What was your favorite childhood toy?",
];

// Function to initialize dropdowns with options
function initializeDropdowns() {
  const allDropdowns = document.querySelectorAll(".swal2-select");
  allDropdowns.forEach((dropdown) => {
    const dropdownId = dropdown.id; // Get the ID of the current dropdown

    // Add the placeholder option
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "Select Item"; // Set the value to an empty string
    placeholderOption.textContent = "Select a question";
    dropdown.appendChild(placeholderOption);

    // Add the security questions
    securityQuestions.forEach((question) => {
      const optionElement = document.createElement("option");
      optionElement.value = question;
      optionElement.textContent = question;
      dropdown.appendChild(optionElement);
    });
  });

  // Set values from session storage if previously set. Note: These are cleared upon successful submission.
  if (!VV.Form.Global.isNullEmptyUndefined(sessionStorage.getItem("question1"))) {
    document.getElementById("question1").value = sessionStorage.getItem("question1");
  }
  if (!VV.Form.Global.isNullEmptyUndefined(sessionStorage.getItem("question2"))) {
    document.getElementById("question2").value = sessionStorage.getItem("question2");
  }
  if (!VV.Form.Global.isNullEmptyUndefined(sessionStorage.getItem("question3"))) {
    document.getElementById("question3").value = sessionStorage.getItem("question3");
  }  
  if (!VV.Form.Global.isNullEmptyUndefined(sessionStorage.getItem("answer1"))) {
    document.getElementById("answer1").value = sessionStorage.getItem("answer1");
  }
  if (!VV.Form.Global.isNullEmptyUndefined(sessionStorage.getItem("answer2"))) {
    document.getElementById("answer2").value = sessionStorage.getItem("answer2");
  }
  if (!VV.Form.Global.isNullEmptyUndefined(sessionStorage.getItem("answer3"))) {
    document.getElementById("answer3").value = sessionStorage.getItem("answer3");
  }  
}

function handleDropdownChange(selectedOption) {
  const allDropdowns = document.querySelectorAll(".swal2-select");

  // Create an array to store the selected questions
  const selectedQuestions = [];

  allDropdowns.forEach((dropdown) => {
    const selectedQuestion = dropdown.value;
    if (selectedQuestion !== "Select a question") {
      selectedQuestions.push(selectedQuestion);
    }
  });

  allDropdowns.forEach((dropdown) => {
    const options = dropdown.querySelectorAll("option");
    options.forEach((option) => {
      if (option.value !== selectedOption && selectedOption !== "Select a question") {
        // Remove the selected option from other dropdowns
        option.disabled = selectedQuestions.includes(option.value);
      }
    });
  });

  // Check if any question is selected more than once
  const uniqueQuestions = [...new Set(selectedQuestions)];
  if (uniqueQuestions.length !== selectedQuestions.length) {
    // Display a validation error if a question is selected more than once
    Swal.showValidationMessage("Please select three different security questions.");
  }
}

Swal.fire({
  title: "Security Questions",
  allowOutsideClick: false,
  html: `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
      <div>
        <span style="font-size: 8em;"><i class="fa-solid fa-person-circle-question" style="color: #003e51"></i></span>
        <p><b>Instructions:</b> Please choose three different security questions. Each answer must be unique, not contain special characters, and not include part of the security question.</p>
        <style>
            /* Hide the Swal validation icon */
            .swal2-validation-message::before {
                display: none !important;
            }
      
            .swal2-label {
                display: none;
                /* Hide labels */
            }
  
            .swal2-select,
            .swal2-input {
                border: none;
                /* Remove the border */
                border-radius: 5px;
                outline: none;
                color: #333;
                /* Set text color to #333 for better visibility */
            }
  
            .swal2-input::placeholder {
                color: #666;
                /* Set placeholder text color */
            }
        </style>
        <div style="display: flex; justify-content: space-between;">
            <label for="question1" class="swal2-label">Question 1:</label>
            <div style="flex: 2;">
                <select id="question1" class="swal2-select">
                    <!-- Placeholder option added here -->
                </select>
            </div>
            <div style="flex: 2;">
                <input type="text" id="answer1" class="swal2-input" placeholder="Answer 1" maxlength="300">
            </div>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <label for="question2" class="swal2-label">Question 2:</label>
            <div style="flex: 2;">
                <select id="question2" class="swal2-select">
                    <!-- Placeholder option added here -->
                </select>
            </div>
            <div style="flex: 2;">
                <input type="text" id="answer2" class="swal2-input" placeholder="Answer 2" maxlength="300">
            </div>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <label for="question3" class="swal2-label">Question 3:</label>
            <div style="flex: 2;">
                <select id="question3" class="swal2-select">
                    <!-- Placeholder option added here -->
                </select>
            </div>
            <div style="flex: 2;">
                <input type="text" id="answer3" class="swal2-input" placeholder="Answer 3" maxlength="300">
            </div>
        </div>
    </div>`,
  width: "800px", // Increased the modal width
  showConfirmButton: true,
  showCancelButton: true,
  confirmButtonColor: "#3085d6",
  confirmButtonText: "Confirm Answers",
  preConfirm: () => {
    // Get the selected questions and answers
    const question1 = document.getElementById("question1").value;
    const question2 = document.getElementById("question2").value;
    const question3 = document.getElementById("question3").value;
    const answer1 = document.getElementById("answer1").value;
    const answer2 = document.getElementById("answer2").value;
    const answer3 = document.getElementById("answer3").value;
    const validationMessages = [];

    const validationResult = validateSecurityQuestions(question1, question2, question3, answer1.trim(), answer2.trim(), answer3.trim());
    if (validationResult !== true) {
      // Split the validation result into separate errors and push them to the array
      const validationErrors = validationResult.split("\n");
      validationMessages.push(...validationErrors);
    }

    if (validationMessages.length > 0) {
      Swal.showValidationMessage(
        validationMessages.map((message) => `<div style="text-align: left;">${message}</div>`).join("<br>") // Left-justify each message
      );
      return false;
    }

    // If validation passes, set items in session storage
    sessionStorage.setItem("question1", question1);
    sessionStorage.setItem("answer1", answer1.trim());
    sessionStorage.setItem("question2", question2);
    sessionStorage.setItem("answer2", answer2.trim());
    sessionStorage.setItem("question3", question3);
    sessionStorage.setItem("answer3", answer3.trim());

    VV.Form.Template.PasswordModal();
  },
}).then((result) => {
  if (result.isConfirmed) {
    // Open the password modal
    VV.Form.Template.PasswordModal();
  } else if (result.isDismissed) {
    // Handle the Cancel button click here
    Swal.close();
  }
});

function validateSecurityQuestions(question1, question2, question3, answer1, answer2, answer3) {
  const validationMessages = [];

  // Check for unanswered questions or answers
  if (VV.Form.Global.isNullEmptyUndefined(question1) || VV.Form.Global.isNullEmptyUndefined(question2) || VV.Form.Global.isNullEmptyUndefined(question3)) {
    validationMessages.push(`<i class="fa-solid fa-exclamation fa-lg" style="color: #ff0000; padding-right: 5px;"></i><b>Please select a security question for each answer.</b>`);
  } else {
    // Check for duplicate questions
    if (question1 === question2 || question1 === question3 || question2 === question3) {
      validationMessages.push(`<i class="fa-solid fa-exclamation fa-lg" style="color: #ff0000; padding-right: 5px;"></i><b>Please select three different security questions.</b>`);
    }
  }

  // Check for unanswered questions or answers
  if (VV.Form.Global.isNullEmptyUndefined(answer1) || VV.Form.Global.isNullEmptyUndefined(answer2) || VV.Form.Global.isNullEmptyUndefined(answer3)) {
    validationMessages.push(`<i class="fa-solid fa-exclamation fa-lg" style="color: #ff0000; padding-right: 5px;"></i><b>Please answer all three security questions.</b>`);
  } else {
    // Check for duplicate answers
    if (answer1 === answer2 || answer1 === answer3 || answer2 === answer3) {
      validationMessages.push(`<i class="fa-solid fa-exclamation fa-lg" style="color: #ff0000; padding-right: 5px;"></i><b>Please provide unique answers for each question.</b>`);
    }
  }

  [answer1, answer2, answer3].forEach((answer, index) => {
    const question = [question1, question2, question3][index];

    // Check if answer is empty
    if (answer.trim().length === 0) {
      validationMessages.push(`<i class="fa-solid fa-exclamation fa-lg" style="color: #ff0000; padding-right: 5px;"></i><b>Please provide an answer for Question ${index + 1}.</b>`);
      return; // Skip further checks for this empty answer
    }

    // Check for special characters
    if (/[^a-zA-Z0-9\s]/.test(answer)) {
      validationMessages.push(`<i class="fa-solid fa-exclamation fa-lg" style="color: #ff0000; padding-right: 5px;"></i><b>Answer ${index + 1} must not contain special characters.</b>`);
    }

    // Check if the answer is in the corresponding question
    if (question.toLowerCase().includes(answer.toLowerCase())) {
      validationMessages.push(`<i class="fa-solid fa-exclamation fa-lg" style="color: #ff0000; padding-right: 5px;"></i><b>Answer ${index + 1} must not be contained within its corresponding question.</b>`);
      }
     
  });

  if (validationMessages.length > 0) {
    return validationMessages.join("<br>");
  }

  return true; // Validation passed
}


// Initialize dropdowns with options
initializeDropdowns();

}
