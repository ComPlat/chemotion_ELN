/*
State description: create a default user and Login then create a collection

Testcase 1: update sample information
Testcase 1: add attachment to a sample under analysis section

Test for drag N drop error
*/

describe('samples scenario', () => {
  it('create samples', () => {
    // setting up state
    cy.createDefaultUser();
    cy.createCollection('Col1');
    cy.login('UC', 'user_password');

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
