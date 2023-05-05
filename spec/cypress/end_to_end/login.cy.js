describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('users/sign_in');
  });

  it('allows registered user to log in', () => {
    cy.createDefaultUser('cu1@complat.edu', 'UC');
    cy.get('#user_login').type('UC');
    cy.get('#user_password').type('user_password');
    cy.get('.btn').contains('Log in').click();
    cy.contains('User Complat');
    cy.url().should('include', '/mydb/collection/all');
  });

  it('rejects unregistered user', () => {
    cy.get('#user_login').type('foo');
    cy.get('#user_password').type('bar');
    cy.get('.btn').contains('Log in').click();
    cy.get('.alert').contains('Invalid Login or password.');
  });

  it('allows admin to log in', () => {
    cy.createDefaultAdmin();
    cy.get('#user_login').type('ADM');
    cy.get('#user_password').type('admin_password');
    cy.get('.btn').contains('Log in').click();
    cy.contains('ELN Admin');
  });

  it('contains links relevant to login', () => {
    cy.contains('Forgot your password?')
      .should('have.attr', 'href', '/users/password/new');
    cy.contains("Didn't receive confirmation instructions?")
      .should('have.attr', 'href', '/users/confirmation/new');
  });

  it('login with locked account', () => {
    cy.createDefaultAdmin();
    cy.createDefaultUser('cu1@complat.edu', 'cu1');
    cy.login('ADM', 'admin_password');
    cy.get('.small-col > .nav > :nth-child(2) > a').click();
    cy.get('tbody > :nth-child(1) > :nth-child(2) > :nth-child(4)').click();
    Cypress.on('uncaught:exception', () =>
      // returning false here prevents Cypress from failing the test
      false);
    cy.clearCookie('_chemotion_session');
    cy.get('a[title="Log out"]').click();
    cy.login('cu1', 'user_password');
    cy.contains('Your account is locked');
  });
});
