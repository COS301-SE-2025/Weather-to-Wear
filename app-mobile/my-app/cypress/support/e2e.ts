/// <reference types="cypress" />

import './commands';

// Prevent Cypress from failing on uncaught exceptions
// This is useful during development when the app might have console errors
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent the test from failing
  // You can add specific error handling logic here if needed
  console.warn('Uncaught exception:', err.message);
  return false;
});