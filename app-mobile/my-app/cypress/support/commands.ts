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
  cy.get('input[name="username"], input[type="email"]').type(username);
  cy.get('input[name="password"], input[type="password"]').type(password);
  cy.get('button[type="submit"], button').contains(/login|sign in/i).click();
});

export {};  