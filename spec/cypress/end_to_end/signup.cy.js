describe('Signup Page', () => {
  beforeEach(() => {
    cy.visit('users/sign_up');
    cy.get('#user_email').type('foobar@baz.com');
    cy.get('#user_first_name').type('foo');
    cy.get('#user_last_name').type('bar');
    cy.get('#user_name_abbreviation').type('fb');
    cy.get('#organization-select').type('baz');
  });

  it('rejects signup without password', () => {
    cy.get('.btn').contains('Sign up').click();
    cy.get('#error_explanation').contains("Password can't be blank");
  });

  it('rejects signup with invalid password', () => {
    cy.get('#user_password').type('pswd');
    cy.get('#user_password_confirmation').type('pswd');
    cy.get('.btn').contains('Sign up').click();
    cy.get('#error_explanation').contains('Password is too short');
  });

  it('rejects signup with invalid password confirmation', () => {
    cy.get('#user_password').type('password');
    cy.get('#user_password_confirmation').type('passwort');
    cy.get('.btn').contains('Sign up').click();
    cy.get('#error_explanation').contains("Password confirmation doesn't match Password");
  });

  it('rejects signup with invalid name abbreviation', () => {
    cy.get('#user_name_abbreviation').clear();
    cy.get('#user_name_abbreviation').type('f');
    cy.get('.btn').contains('Sign up').click();
    cy.get('#error_explanation').contains('Name abbreviation has to be 2 to 3 characters long');
    cy.get('#error_explanation').contains("Name abbreviation can be alphanumeric, middle '_' and '-' are allowed, but leading digit, or trailing '-' and '_' are not.");
  });

  it('rejects signup with existing name abbreviation', () => {
    cy.createDefaultUser('foobar@kit.edu', 'UC');
    cy.get('#user_password').type('password');
    cy.get('#user_password_confirmation').type('password');
    cy.get('#user_name_abbreviation').clear();
    cy.get('#user_name_abbreviation').type('UC');
    cy.get('.btn').contains('Sign up').click();
    cy.get('#error_explanation').contains('Name abbreviation is already in use');
  });

  it('rejects signup with existing email', () => {
    cy.createDefaultUser('complat.user@eln.edu', 'UC');
    cy.get('#user_email').clear();
    cy.get('#user_email').type('complat.user@eln.edu');
    cy.get('.btn').contains('Sign up').click();
    cy.get('#error_explanation').contains('Email has already been taken');
  });

  it('allows sign up with valid data', () => {
    cy.get('#user_password').type('password');
    cy.get('#user_password_confirmation').type('password');
    cy.get('.btn').contains('Sign up').click();
  });
});

describe('Signup Page Links', () => {
  it('contains links relevant to signup', () => {
    cy.visit('home');
    cy.contains('Sign Up')
      .should('have.attr', 'href', '/users/sign_up');
    cy.visit('users/sign_in');
    cy.contains('Sign up')
      .should('have.attr', 'href', '/users/sign_up');
  });
});
