describe('Landing Page Attributes', () => {
  it('contains all links to external resources', () => {
    cy.visit('home');
    cy.contains('Welcome to Chemotion Electronic Lab Notebook.');
    cy.contains('Chemotion Docs').should('have.attr', 'href', 'https://chemotion.net/docs');
    cy.contains('Helpdesk').should('have.attr', 'href', 'https://helpdesk.nfdi4chem.de/');
    cy.contains('Github Repository').should('have.attr', 'href', 'https://github.com/ComPlat/chemotion_ELN');
  });
});
