/// <reference types="cypress" />

describe('Basic Smoke Tests', () => {
  it('Should load the landing page', () => {
    cy.visit('/');
    
    // Verify page loads
    cy.get('body').should('be.visible');
    
    // Should contain WeatherToWear branding
    cy.contains('WeatherToWear').should('be.visible');
    
    // Should have auth links
    cy.get('a[href="/signup"]').should('contain', 'Sign Up');
    cy.get('a[href="/login"]').should('contain', 'Log In');
  });

  it('Should navigate to signup page', () => {
    cy.visit('/');
    cy.get('a[href="/signup"]').click();
    
    cy.url().should('contain', '/signup');
    cy.get('h2').should('contain', 'Sign up');
    
    // Should have form fields
    cy.get('input[name="username"]').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('input[name="confirmPassword"]').should('be.visible');
  });

  it('Should navigate to login page', () => {
    cy.visit('/');
    cy.get('a[href="/login"]').click();
    
    cy.url().should('contain', '/login');
    cy.get('h2').should('contain', 'Login');
    
    // Should have form fields
    cy.get('input[placeholder="Email"]').should('be.visible');
    cy.get('input[placeholder="Password"]').should('be.visible');
  });

  it('Should redirect to dashboard after successful login', () => {
    cy.visit('/login');
    
    // Login with test user
    cy.get('input[placeholder="Email"]').type('testuser123@example.com');
    cy.get('input[placeholder="Password"]').type('TestPassword123!');
    cy.get('button[type="submit"]').click();
    
    // Should redirect to dashboard
    cy.url().should('contain', '/dashboard');
    cy.get('main').should('be.visible');
  });

  it('Should show navigation after login', () => {
    cy.visit('/login');
    cy.get('input[placeholder="Email"]').type('testuser123@example.com');
    cy.get('input[placeholder="Password"]').type('TestPassword123!');
    cy.get('button[type="submit"]').click();
    
    cy.url().should('contain', '/dashboard');
    
    // Should have navigation links
    cy.get('a[href="/dashboard"]').should('contain', 'Home');
    cy.get('a[href="/closet"]').should('contain', 'Closet');
    cy.get('a[href="/feed"]').should('contain', 'Feed');
    cy.get('a[href="/inspo"]').should('contain', 'Inspo');
    
    // Should have add button
    cy.get('button[aria-label="Add options"]').should('be.visible');
  });
});
