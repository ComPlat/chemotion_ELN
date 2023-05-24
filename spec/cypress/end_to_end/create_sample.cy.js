describe('Sample Creation', () => {
  it('create sample', () => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id }]]);
    });

    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');
    cy.stubCollections();
    cy.get('div').find('[id="tree-id-Collection 1"]').click();
    cy.get('#create-split-button').click();
    cy.get('#create-sample-button').click();
    cy.get('.chem-identifiers-section > .list-group-item').click();
    cy.get('#smilesInput').type('c1cc(cc(c1)c1ccccc1)c1ccccc1');
    cy.get('#smile-create-molecule').click();
    cy.get('#submit-sample-btn').click();
    cy.url().should('include', '/sample/1');
  });
});
