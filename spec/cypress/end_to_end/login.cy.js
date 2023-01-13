describe('sign_in page', () => {
  beforeEach(() => {
    cy.visit('users/sign_in');
  });

  it('allows registered user to log in', () => {
    cy.createDefaultUser();

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
});

describe('home page', () => {
  beforeEach(() => {
    cy.visit('home');
  });

  it('allows registered user to log in', () => {
    cy.createDefaultUser();

    cy.get('#user_login').type('UC');
    cy.get('#user_password').type('user_password');
    cy.get('#new_user > .btn').click();
    cy.contains('User Complat');
    cy.url().should('include', '/mydb/collection/all');
  });

  it('rejects unregistered user', () => {
    cy.get('#user_login').type('foo');
    cy.get('#user_password').type('bar');
    cy.get('#new_user > .btn').click();
    cy.get('.alert').contains('Invalid Login or password.');
    cy.url().should('include', '/users/sign_in');
  });

  it('allows admin to log in', () => {
    cy.createDefaultAdmin();

    cy.get('#user_login').type('ADM');
    cy.get('#user_password').type('admin_password');
    cy.get('#new_user > .btn').click();
    cy.contains('ELN Admin');
  });
});
