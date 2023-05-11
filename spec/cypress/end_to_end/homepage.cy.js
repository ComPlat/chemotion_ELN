describe('Landing Page Attributes', () => {
  it('contains all links to external resources', () => {
    cy.visit('home');
    cy.contains('h3', 'Welcome to Chemotion Electronic Lab Notebook.');
    cy.contains('Chemotion repository').should('have.attr', 'href', 'http://www.chemotion.net');
    cy.contains('Complat').should('have.attr', 'href', 'http://www.complat.kit.edu/');
    cy.contains('Complat on Github').should('have.attr', 'href', 'https://github.com/ComPlat');
    cy.contains('ELN').should('have.attr', 'href', '/');
    cy.contains('About').should('have.attr', 'href', '/about');
  });
});
