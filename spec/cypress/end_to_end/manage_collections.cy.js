describe('Manage Collections', () => {
  beforeEach(() => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { label: 'Foo', user_id: user[0].id }]]);
    });
    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');
    cy.contains('Manage Collections').click();
    cy.contains('Foo');
  });

  it('creates an unshared collection', () => {
    cy.get('#add-new-collection-button').click();
    cy.get('input[value="New Collection"]').clear().type('Bar');
    cy.get('#save-collections-button').click();
    cy.get('.collection-node').find('input[value="Bar"]');
  });

  it('renames an unshared collection', () => {
    cy.get('input[value="Foo"]').clear().type('Bar');
    cy.get('#save-collections-button').click();
    cy.get('.collection-node').find('input[value="Bar"]');
  });

  it('deletes an unshared collection', () => {
    cy.get('.collection-node').find('i.fa-trash-o').parent('button').click({ force: true });
    cy.contains('Do you really want to delete "Foo"?');
    cy.contains('button', 'Yes').click();
    cy.get('.collection-node').find('input[value="Foo"]').should('not.exist');
  });
});
