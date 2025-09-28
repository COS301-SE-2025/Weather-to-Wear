/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(2000); // Wait for landing page to fully load
  });

  it('Should allow user to sign up and login', () => {
    // From LandingPage.tsx - look for "Sign Up" link
    cy.get('a').contains('Sign Up').click();
    
    // Verify we're on signup page
    cy.url().should('contain', '/signup');
    cy.get('h2').contains('Sign up').should('be.visible');
    
    // Wait for form to be fully loaded and enabled
    cy.get('input[name="username"]').should('be.visible').and('not.be.disabled');
    
    // Fill out signup form based on actual Signup.tsx structure
    cy.get('input[name="username"]').clear().type('user');
    cy.get('input[name="email"]').clear().type('user5@example.com');
    cy.get('input[name="password"]').clear().type('User5@123');
    cy.get('input[name="confirmPassword"]').clear().type('User5@123');
    
    // Submit signup form
    cy.get('button[type="submit"]').click();
    
    // After signup, user is redirected to login page to re-enter credentials
    cy.wait(2000);
    cy.url().should('contain', '/login');
    cy.get('h2').contains('Login').should('be.visible');
    
    // Now login with the credentials we just created
    cy.login('user5@example.com', 'User5@123');
    
    // Verify successful login - should redirect to dashboard
    cy.url().should('contain', '/dashboard');
    cy.get('main').should('be.visible');
  });

  it('Should handle login with existing user', () => {
    // From LandingPage.tsx - look for "Log In" link (note the space!)
    cy.get('a').contains('Log In').click();
    
    // Verify we're on login page
    cy.url().should('contain', '/login');
    cy.get('h2').contains('Login').should('be.visible');
    
    // Use the custom login command with the actual form structure
    cy.login('user5@example.com', 'User5@123');
    
    // Verify successful login - should redirect to dashboard
    cy.url().should('contain', '/dashboard');
    cy.get('main').should('be.visible');
  });
});
