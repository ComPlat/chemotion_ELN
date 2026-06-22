describe('Admin', () => {
  it('adds single user', () => {
    cy.createDefaultAdmin();
    cy.visit('users/sign_in');
    cy.login('ADM', 'admin_password');
    cy.contains('User Management').click();
    cy.createUserWithCredentials('complat_user@kit.de', 'user_password', 'complat', 'user', 'cu1');
    cy.contains('complat user');
  });

  it('adds a user with wrong email', () => {
    cy.createDefaultAdmin();
    cy.visit('users/sign_in');
    cy.login('ADM', 'admin_password');
    cy.contains('User Management').click();
    cy.createUserWithCredentials('complat_user', 'user_password', 'complat', 'user', 'cu1');
    cy.get('#formControlMessage').should('have.value', 'You have entered an invalid email address!');
  });

  it('adds a user with wrong abbreviation', () => {
    cy.createDefaultAdmin();
    cy.visit('users/sign_in');
    cy.login('ADM', 'admin_password');
    cy.contains('User Management').click();
    cy.createUserWithCredentials('complat_user@kit.edu', 'user_password', 'complat', 'user', 'ADM');
    cy.get('#formControlMessage').should('have.value', 'Validation failed: Name abbreviation is already in use.');
  });
});
