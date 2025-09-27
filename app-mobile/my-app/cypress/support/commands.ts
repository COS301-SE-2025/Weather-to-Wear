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
  // Based on Login.tsx - email field has placeholder "Email" 
  cy.get('input[placeholder="Email"]').clear().type(username);
  // Password field has placeholder "Password"
  cy.get('input[placeholder="Password"]').clear().type(password);
  // Submit button
  cy.get('button[type="submit"]').click();
  
  // Wait for login to complete
  cy.wait(2000);
});

export {};  