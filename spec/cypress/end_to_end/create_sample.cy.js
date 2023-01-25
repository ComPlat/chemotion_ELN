describe('samples scenario', () => {
  beforeEach(() => {
    cy.createDefaultUser(1, 'cu1@complat.edu', 'cu1');
    cy.visit('users/sign_in');
  });

  it('create samples', () => {
    cy.login('cu1', 'user_password');
    cy.waitForAPIs();

    cy.createCollection(1, 'Col1');

    // Testcase starts here
    cy.visit('mydb/collection/3/');
    cy.get('#tree-id-Col1').click();
    cy.get('#create-split-button').click();
    cy.get('#create-sample-button').click();
    cy.get('.chem-identifiers-section > .list-group-item').click();
    cy.get('#smilesInput').type('c1cc(cc(c1)c1ccccc1)c1ccccc1');
    cy.get('#smile-create-molecule').click();
    cy.get('#submit-sample-btn').click();
    cy.url().should('include', '/sample/1');
  });
});
