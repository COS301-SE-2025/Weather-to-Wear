/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login a user
       * @example cy.login('username', 'password')
       */
      login(username: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (username: string, password: string) => {
  // Wait for the login page to fully load
  // cy.get('main', { timeout: 10000 }).should('be.visible');
  
  // Wait for email input to be available and visible
  cy.get('input[placeholder="Email"]', { timeout: 10000 }).should('be.visible').clear().type(username);
  
  // Wait for password input to be available and visible  
  cy.get('input[placeholder="Password"]', { timeout: 10000 }).should('be.visible').clear().type(password);
  
  // Submit button
  cy.get('button[type="submit"]').should('be.enabled').click();
  
  // Wait for login to complete - look for redirect or dashboard content
  cy.url({ timeout: 15000 }).should('not.contain', '/login');
  cy.wait(3000); // Additional wait for page to stabilize
});

export {};  