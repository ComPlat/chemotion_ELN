describe('Copy samples', () => {
  beforeEach(() => {
    cy.createDefaultUser('complat.user1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id, label: 'Col1' }]]);
    });
    cy.createDefaultUser('complat.user2@complat.edu', 'cu2');
    cy.createSample('PH-1234');

    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');
  });

  it.only('no copy button', () => {
    // add test code here
    cy.visit('mydb/collection/3/');
    cy.get('#tree-id-Col1').click();
    cy.get('#create-split-button').click();
    cy.get(':nth-child(10)').should('have.class', 'disabled');
  });

  it('test name', () => {
    // add test code here
  });
});
