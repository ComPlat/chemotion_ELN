describe('Landing Page Attributes', () => {
  it('contains all links to external resources', () => {
    cy.visit('home');
    cy.contains('h3', 'Welcome to Chemotion Electronic Lab Notebook.');
    cy.contains('Documentation').should('have.attr', 'href', 'https://chemotion.net/docs/eln/ui');
    cy.contains('Search documentation').should('have.attr', 'href', 'https://chemotion.net/search');
    cy.contains('Helpdesk - Contact Us').should('have.attr', 'href', 'https://chemotion.net/helpdesk');
    cy.contains('Report an issue on Github').should('have.attr', 'href', 'https://github.com/ComPlat/chemotion_ELN/issues');
    cy.contains('Chemotion.net').should('have.attr', 'href', 'https://www.chemotion.net');
    cy.contains('Chemotion-Repository.net').should('have.attr', 'href', 'https://www.chemotion-repository.net');
    cy.contains('ELN').should('have.attr', 'href', '/mydb');
    cy.contains('About').should('have.attr', 'href', '/about');
    cy.contains('Chemotion Docs').should('have.attr', 'href', 'https://chemotion.net/docs');
    cy.contains('Helpdesk').should('have.attr', 'href', 'https://chemotion.net/helpdesk');
    cy.contains('Github Repository').should('have.attr', 'href', 'https://github.com/ComPlat/chemotion_ELN');
  });
});
