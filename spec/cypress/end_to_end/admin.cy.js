describe('Admin feature tests', () => {
  it('add single user', () => {
    cy.createDefaultAdmin();
    cy.visit('users/sign_in');
    cy.login('ADM', 'admin_password');
    cy.get('.small-col > .nav > :nth-child(2) > a').click();
    cy.createUserWithCredentials('complat_user@kit.de', 'user_password', 'complat', 'user', 'cu1');
    cy.get('.modal-footer > .btn').click();
    cy.contains('complat user');
  });

  it('add a user with wrong email', () => {
    cy.createDefaultAdmin();
    cy.visit('users/sign_in');
    cy.login('ADM', 'admin_password');
    cy.get('.small-col > .nav > :nth-child(2) > a').click();
    cy.createUserWithCredentials('complat_user', 'user_password', 'complat', 'user', 'cu1');
    cy.get('#formControlMessage').should('have.value', 'You have entered an invalid email address!');
  });

  it('add a user with wrong abbreviation', () => {
    cy.createDefaultAdmin();
    cy.visit('users/sign_in');
    cy.login('ADM', 'admin_password');
    cy.get('.small-col > .nav > :nth-child(2) > a').click();
    cy.createUserWithCredentials('complat_user@kit.edu', 'user_password', 'complat', 'user', 'ADM');
    cy.get('#formControlMessage').should('have.value', 'Validation failed: Name abbreviation is already in use.');
  });
});
