describe('Manage Collections', () => {
  beforeEach(() => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1');
    cy.visit('users/sign_in');
  });

  it('create an unshared collection', () => {
    cy.login('cu1', 'user_password');
    cy.waitForCollections();
    cy.stubExperimentData();
    cy.get('#add-new-collection-button').should('be.visible');
    cy.get('#add-new-collection-button').click();
    cy.get('input[value="New Collection"]').should('be.visible');
    cy.get('input[value="New Collection"]').as('input');
    cy.get('@input').clear().type('Hello Collection');
    cy.get('#save-collections-button').click();
    cy.contains('Hello Collection');
  });

  it('rename an unshared collection', () => {
    cy.createCollection(1, 'Hello Collection');
    cy.login('cu1', 'user_password');
    cy.waitForCollections();
    cy.get('input[value="Hello Collection"]').first().as('input');
    cy.get('@input').clear().type('Foo-Bar');
    cy.get('#save-collections-button').click();
    cy.contains('Foo-Bar');
  });

  it('delete an unshared collection', () => {
    cy.createCollection(1, 'Hello Collection');
    cy.login('cu1', 'user_password');
    cy.waitForCollections();
    cy.get('#delete-collection-button_3').click();
    cy.get('#save-collections-button').click();
    cy.contains('div', 'Hello Collections').should('not.exist');
  });
});
