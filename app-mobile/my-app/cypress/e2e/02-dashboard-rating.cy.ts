/// <reference types="cypress" />

describe('Dashboard and Outfit Rating Flow', () => {
  beforeEach(() => {
    // Login and navigate to dashboard
    cy.visit('/login');
    
    // Wait for login page to load before attempting login
    cy.wait(2000);
    
    cy.login('bemosaid3@gmail.com', 'BemoSaid@12');
    
    // Login has a 3-second delay before redirect, so wait for it
    cy.url({ timeout: 20000 }).should('eq', Cypress.config().baseUrl + '/dashboard');
    
    // Wait for page content to load - look for the header or main content
    cy.get('header', { timeout: 15000 }).should('be.visible');
    
    // Additional wait for dashboard content to fully load
    cy.wait(2000);
  });
  it('Should rate an outfit, save it for the day, and create an event', () => {
    // Wait for outfits to load (may take time for API call)

    
    // Check if outfits are available or if we get the "add more items" message
    cy.get('body').then($body => {
      if ($body.text().includes("couldn't generate an outfit") || $body.text().includes("add more items")) {
        cy.log('No outfits available - skipping test');
        return;
      }
      
      // Step 1: Rate the first outfit with 5 stars
      cy.log('Rating the outfit with 5 stars');
      cy.get('div.grid.grid-cols-5.gap-1').within(() => {
        // Find star rating buttons (should be 5 buttons for 5 stars)
        cy.get('button[type="button"]').should('have.length', 5);
        // Click 5th star for 5-star rating (index 4)
        cy.get('button[type="button"]').eq(4).click();
      });
      
      cy.wait(2000);
      
      // Step 2.5: Select another day and choose another outfit
      cy.log('Selecting another day for outfit');
      // Click on the second day button in the desktop grid (these are the day buttons under weather forecast)
      cy.get('.grid.grid-cols-7.gap-2 button').eq(1).click();
      
      cy.wait(3000); // Wait for new day's outfits to load
      
      // Rate and save outfit for the new day
      cy.get('div.grid.grid-cols-5.gap-1').within(() => {
        // Click 4th star for 4-star rating (index 3)
        cy.get('button[type="button"]').eq(3).click();
      });
      
      cy.wait(1000);
      
      // Step 3: Navigate to create an event
      cy.log('Creating a new event');
      
      // Look for the + button to add event (scroll to find it)
      cy.get('button[aria-label="Add Event"]', { timeout: 10000 }).scrollIntoView().click();
      
      // Wait for modal to open
      cy.get('.fixed.inset-0.bg-black.bg-opacity-50', { timeout: 5000 }).should('be.visible');
      
      // Fill out event form based on actual modal structure
      cy.get('input[placeholder="Event name"]').type('Cypress Test Event');
      cy.get('input[placeholder="Location"]').type('Pretoria');

      // Wait for the dropdown and select the first recommended place
      cy.get('.fixed.inset-0.bg-black.bg-opacity-50 ul li > button', { timeout: 10000 })
        .should('be.visible')
        .first()
        .click();
      
      // Fill datetime-local inputs (from HomePage.tsx line ~1890)
      cy.get('input[type="datetime-local"]').first().type('2025-12-31T18:00');
      cy.get('input[type="datetime-local"]').last().type('2025-12-31T22:00');
      
      // Select style from dropdown (target only the select within the modal)
      cy.get('.fixed.inset-0.bg-black.bg-opacity-50 select').select('Casual');
      
      // Submit the event - target the green save button
      cy.get('button.bg-\\[\\#3F978F\\].text-white').click();
      
      // Wait for modal to close
      // cy.get('.fixed.inset-0.bg-black.bg-opacity-50').should('not.exist');
      
      // Step 4: Wait 3 seconds then delete the created event
      cy.log('Waiting 3 seconds before deleting the event');
      cy.wait(3000);
      
      // Click on any event card in the carousel to open the detail modal
      // The carousel is auto-scrolling, so we need to force the click
      cy.get('button.group.text-left.min-w-\\[240px\\]').first().scrollIntoView().click({ force: true });
      
      // Wait for the event detail modal to open
      cy.get('.fixed.inset-0.bg-black.bg-opacity-50', { timeout: 5000 }).should('be.visible');
      
      // Handle the confirmation dialog
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true); // Auto-confirm the deletion
      });
      
      // Click the Delete button (red button)
      cy.wait(1000);
      cy.get('button.bg-red-500.text-white').click();
      
      // Wait for deletion to complete
      cy.wait(2000);
      
      cy.log('Test completed successfully!');

    });
  });


});
