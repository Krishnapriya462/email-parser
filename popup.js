    document.addEventListener('DOMContentLoaded', () => {
        // Request the content script to extract emails
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: extractEmails,
                },
                (results) => {
                    if (results && results[0] && results[0].result) {
                        const emails = results[0].result;
                        displayEmails(emails);
                    }
                }
            );
        });

        // Add an event listener for the Copy button
        document.getElementById('copyEmailsButton').addEventListener('click', () => {
            const emails = document.getElementById('emailsContainer').innerText
                .split('\n')
                .filter(email => email.trim() !== ''); // Split and filter emails
            const formattedEmails = emails.join(', '); // Join emails with a comma and a space
            copyToClipboard(formattedEmails); // Use the formatted emails for copying
        });
    });

    // Function to extract emails from the page
    function extractEmails() {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const bodyText = document.body.innerText;
        const emails = bodyText.match(emailRegex);
        return emails || []; // Return empty array if no emails found
    }

    // Function to display emails in the popup
    function displayEmails(emails) {
        const container = document.getElementById('emailsContainer');
        container.innerHTML = ''; // Clear previous content

        // Retrieve emails from localStorage
        const storedEmails = JSON.parse(localStorage.getItem('parsedEmails')) || [];
        const combinedEmails = [...new Set([...storedEmails, ...emails])]; // Combine and remove duplicates

        if (combinedEmails.length === 0) {
            container.innerText = 'No emails found.';
            updateEmailCount(0); // Update count to 0 when no emails found
        } else {
            combinedEmails.forEach(email => {
                const emailElement = document.createElement('div');
                emailElement.innerText = email;
                container.appendChild(emailElement);
            });
            updateEmailCount(combinedEmails.length); // Update count with the total number of emails
        }

        // Update the localStorage with the combined emails
        const toggleStatus = localStorage.getItem('toggleStatus');
        if (toggleStatus === 'on') {
            localStorage.setItem('parsedEmails', JSON.stringify(combinedEmails));
        }
    }

    // Function to copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Log success to console and close the popup
            window.close(); // Close the popup
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }

    // Function to change font size for selected text or entire container
    function changeFontSize(increase = true) {
        const emailsContainer = document.getElementById('emailsContainer');
        const selection = window.getSelection();

        // If there is selected text
        if (selection.rangeCount > 0 && selection.toString()) {
            const range = selection.getRangeAt(0);
            const selectedText = range.cloneContents();

            const span = document.createElement('span');
            span.style.fontSize = increase ? 'larger' : 'smaller'; // Change size of selected text
            span.appendChild(selectedText);

            range.deleteContents();
            range.insertNode(span);

            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
        } else {
            // If no text is selected, change the font size of the entire emails container
            let currentFontSize = parseFloat(window.getComputedStyle(emailsContainer, null).getPropertyValue('font-size'));
            emailsContainer.style.fontSize = increase ? (currentFontSize + 2) + 'px' : Math.max(10, currentFontSize - 2) + 'px';
        }
    }

    // Continuous font size change variables
    let fontSizeInterval;

    function startFontSizeChange(increase) {
        fontSizeInterval = setInterval(() => {
            changeFontSize(increase);
        }, 100); // Adjust interval as needed
    }

    function stopFontSizeChange() {
        clearInterval(fontSizeInterval);
    }

    // Event listeners for continuous font size change on + and - buttons
    document.getElementById('increaseFontSize').addEventListener('mousedown', () => startFontSizeChange(true));
    document.getElementById('increaseFontSize').addEventListener('mouseup', stopFontSizeChange);
    document.getElementById('increaseFontSize').addEventListener('mouseleave', stopFontSizeChange);

    document.getElementById('decreaseFontSize').addEventListener('mousedown', () => startFontSizeChange(false));
    document.getElementById('decreaseFontSize').addEventListener('mouseup', stopFontSizeChange);
    document.getElementById('decreaseFontSize').addEventListener('mouseleave', stopFontSizeChange);

    // Function to update and display the total count of emails
    function updateEmailCount(count) {
        const emailCountElement = document.getElementById('emailCount'); // Reference to the count span
        emailCountElement.innerText = count; // Update the count displayed in the popup
    }

    function updateStatus() {
        const textArea = document.getElementById('emailsContainer'); // Reference to the editable div
        const text = textArea.innerText; // Get the text from the div

        // Split the text by new lines to get the lines
        const lines = text.split('\n');
        const emailCount = lines.filter(line => line.trim() !== '').length; // Count non-empty lines as emails

        const { line, col } = getCursorPosition(textArea);

        // Update the status bar with email count, character count, and cursor position
        document.getElementById('emailCount').textContent = emailCount; // Update email count
        document.getElementById('cursorPosition').textContent = ` Character: ${col}`; // Update cursor position
    }

    function getCursorPosition(element) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return { line: 1, col: 1 }; // Default if no selection

        const range = selection.getRangeAt(0); // Get the current selection range
        const cursorIndex = range.startOffset; // Get the cursor index

        const text = element.innerText; // Use innerText to get content of the div
        const lines = text.split("\n"); // Split by new lines to get individual lines

        let line = 0;
        let col = 0;

        // Calculate line number and column
        let characterCount = 0; // To keep track of characters
        for (let i = 0; i < lines.length; i++) {
            characterCount += lines[i].length + 1; // +1 for the line break
            if (characterCount > cursorIndex) {
                line = i + 1; // Line is 1-indexed
                col = cursorIndex - (characterCount - lines[i].length ); // Calculate column
                break;
            }
        }

        return { line, col: col + 1 }; // +1 for 1-indexed column
    }

    // Call updateStatus whenever the content of the editable div changes
    document.getElementById('emailsContainer').addEventListener('input', updateStatus);
    document.getElementById('emailsContainer').addEventListener('click', updateStatus);
    document.getElementById('emailsContainer').addEventListener('keyup', updateStatus);

    const toggleButton = document.getElementById("toggleCaptureButton");

    // Initialize toggle button state based on localStorage
    const storedStatus = localStorage.getItem("toggleStatus");
    toggleButton.checked = storedStatus === "on";

    // Listen for toggle changes and update localStorage
    toggleButton.addEventListener("change", function () {
        if (toggleButton.checked) {
            localStorage.setItem("toggleStatus", "on");
            console.log(localStorage.getItem("toggleStatus"));
            keepStoring();
        } else {
            localStorage.setItem("toggleStatus", "off");
            console.log(localStorage.getItem("toggleStatus"));
            dontStore();
        }
    
        // Re-fetch and display the emails after the toggle status changes
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: extractEmails,
                },
                (results) => {
                    if (results && results[0] && results[0].result) {
                        const emails = results[0].result;
                        displayEmails(emails); // Refresh the displayed emails
                    }
                }
            );
        });
    });
    

    // Function to store parsed emails in localStorage
    function storeEmailsInLocalStorage(emails) {
        const uniqueEmails = [...new Set(emails)]; // Remove duplicates using Set
        localStorage.setItem('parsedEmails', JSON.stringify(uniqueEmails)); // Store as JSON string
        console.log("Emails stored in localStorage:", uniqueEmails);
    }

    function keepStoring() {
        const toggleStatus = localStorage.getItem("toggleStatus"); // Check the current toggle status
        if (toggleStatus === "on") { // Only store emails when toggle is on
            console.log("Keep storing");
            // Fetch emails and store them
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        function: extractEmails,
                    },
                    (results) => {
                        if (results && results[0] && results[0].result) {
                            const emails = results[0].result;
                            storeEmailsInLocalStorage(emails); // Store emails only when toggle is ON
                        }
                    }
                );
            });
        } else {
            console.log("Don't store");
            // If the toggle is off, clear the localStorage (or simply don't store new emails)
            localStorage.removeItem("parsedEmails");
        }
    }

    function dontStore() {
        console.log("Don't store");
        // If the toggle is off, clear the localStorage to avoid storing emails
        localStorage.removeItem("parsedEmails");
    }
