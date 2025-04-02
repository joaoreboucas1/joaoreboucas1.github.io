// This file contains JavaScript code for interactivity on the website. 
// You can add functions for handling user interactions, animations, or any dynamic content.

document.addEventListener('DOMContentLoaded', function() {
    console.log("Welcome to João Rebouças' academic website!");

    // Example function to handle a button click
    const exampleButton = document.getElementById('exampleButton');
    if (exampleButton) {
        exampleButton.addEventListener('click', function() {
            alert('Button clicked!');
        });
    }
});