/// <reference types="cypress" />

describe('App Structure Discovery', () => {
  it('Should discover landing page structure', () => {
    cy.visit('/');
    cy.wait(3000); // Wait for TypingSlogan component to load
    
    console.log('=== LANDING PAGE DISCOVERY ===');
    
    // Log the page title and URL
    cy.title().then(title => {
      console.log('Page title:', title);
    });
    cy.url().then(url => {
      console.log('Current URL:', url);
    });
    
    // Check for WeatherToWear branding (from LandingPage.tsx)
    cy.get('h1').then($h1 => {
      if ($h1.length) {
        console.log('Main heading found:', $h1.text());
      }
    });
    
    // Log auth links (Sign Up / Log In from LandingPage.tsx)
    cy.get('a[href="/signup"], a[href="/login"]').then($authLinks => {
      console.log('Auth links found:');
      $authLinks.each((index, link) => {
        const text = Cypress.$(link).text().trim();
        const href = Cypress.$(link).attr('href');
        console.log(`  Link ${index}: "${text}" -> ${href}`);
      });
    });
    
    // Check if we can see the expected landing page content
    cy.get('body').then($body => {
      const bodyText = $body.text();
      console.log('Landing page content check:');
      console.log('  Contains "Sign Up":', bodyText.includes('Sign Up'));
      console.log('  Contains "Log In":', bodyText.includes('Log In'));
      console.log('  Contains "WeatherToWear":', bodyText.includes('WeatherToWear'));
      console.log('  Contains "weather-based":', bodyText.includes('weather-based'));
    });
  });

  it('Should discover signup page structure', () => {
    cy.visit('/signup');
    cy.wait(2000);
    
    console.log('=== SIGNUP PAGE DISCOVERY ===');
    
    // Log signup form inputs (from Signup.tsx)
    cy.get('input').then($inputs => {
      console.log('Signup form inputs:');
      $inputs.each((index, input) => {
        const name = Cypress.$(input).attr('name');
        const placeholder = Cypress.$(input).attr('placeholder');
        const type = Cypress.$(input).attr('type');
        const disabled = Cypress.$(input).is(':disabled');
        console.log(`  Input ${index}: name="${name}" placeholder="${placeholder}" type="${type}" disabled=${disabled}`);
      });
    });
    
    // Check for signup button
    cy.get('button[type="submit"]').then($btn => {
      console.log('Submit button found:', $btn.text());
    });
    
    // Check for heading
    cy.get('h2').then($h2 => {
      if ($h2.length) {
        console.log('Signup heading:', $h2.text());
      }
    });
  });

  it('Should discover login page structure', () => {
    cy.visit('/login');
    cy.wait(2000);
    
    console.log('=== LOGIN PAGE DISCOVERY ===');
    
    // Log login form inputs (from Login.tsx)
    cy.get('input').then($inputs => {
      console.log('Login form inputs:');
      $inputs.each((index, input) => {
        const placeholder = Cypress.$(input).attr('placeholder');
        const type = Cypress.$(input).attr('type');
        const disabled = Cypress.$(input).is(':disabled');
        console.log(`  Input ${index}: placeholder="${placeholder}" type="${type}" disabled=${disabled}`);
      });
    });
    
    // Check for login button
    cy.get('button[type="submit"]').then($btn => {
      console.log('Login submit button found:', $btn.text());
    });
    
    // Check for heading
    cy.get('h2').then($h2 => {
      if ($h2.length) {
        console.log('Login heading:', $h2.text());
      }
    });
  });

  it('Should discover dashboard structure (after login)', () => {
    // Login first
    cy.visit('/login');
    cy.get('input[placeholder="Email"]').type('testuser123@example.com');
    cy.get('input[placeholder="Password"]').type('TestPassword123!');
    cy.get('button[type="submit"]').click();
    
    // Wait for redirect to dashboard
    cy.url().should('contain', '/dashboard');
    cy.wait(3000);
    
    console.log('=== DASHBOARD PAGE DISCOVERY ===');
    
    // Check main element (from App.tsx protected route)
    cy.get('main').then($main => {
      console.log('Main element found:', $main.length > 0);
    });
    
    // Log navigation links (from NavBar.tsx)
    cy.get('nav a, .bg-black a').then($navLinks => {
      console.log('Navigation links found:');
      $navLinks.each((index, link) => {
        const text = Cypress.$(link).text().trim();
        const href = Cypress.$(link).attr('href');
        console.log(`  Nav Link ${index}: "${text}" -> ${href}`);
      });
    });
    
    // Check for + button (Add options from NavBar.tsx)
    cy.get('button[aria-label="Add options"]').then($addBtn => {
      console.log('Add button found:', $addBtn.length > 0);
    });
    
    // Check for logout button
    cy.get('button').contains(/log out|logout/i).then($logoutBtn => {
      console.log('Logout button found:', $logoutBtn.text());
    });
  });
});
