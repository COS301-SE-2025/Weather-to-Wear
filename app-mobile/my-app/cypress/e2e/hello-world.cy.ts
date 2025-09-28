describe('Hello World Test', () => {
  it('Visits the app and checks if it loads', () => {
    cy.visit('/'); // Uses baseUrl from config
    cy.get('body').should('be.visible');
    cy.title().should('not.be.empty');
  });

  it('Should display the app content', () => {
    cy.visit('/');
    // Update this selector based on your actual app content
    cy.get('[data-testid="app-root"], #root, .App').should('exist');
  });
});