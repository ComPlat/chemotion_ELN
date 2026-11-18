describe('Login Page', () => {
  it('allows registered user to log in', () => {
    cy.appFactories([
      ['create', 'user', {
        first_name: 'Foo',
        last_name: 'Bar',
        password: 'foo_bar_baz',
        password_confirmation: 'foo_bar_baz',
        name_abbreviation: 'FB',
      }],
    ]);
    cy.login('FB', 'foo_bar_baz');

    cy.get('i.fa-user').parent().contains('Foo Bar');
  });

  it('rejects unregistered user', () => {
    cy.login('FB', 'foo_bar_baz');
    cy.contains('Invalid Login or password.');
  });

  it('allows admin to log in', () => {
    cy.appFactories([
      ['create', 'admin', {
        first_name: 'Foo',
        last_name: 'Bar',
        password: 'foo_bar_baz',
        password_confirmation: 'foo_bar_baz',
        name_abbreviation: 'FB',
        account_active: 'true',
      }],
    ]);
    cy.login('FB', 'foo_bar_baz');

    cy.get('i.fa-user').parent().contains('Foo Bar');
  });

  it('contains links relevant to login', () => {
    cy.visit('users/sign_in');
    cy.contains('Forgot your password?').should('have.attr', 'href', '/users/password/new');
    cy.contains("Didn't receive confirmation instructions?").should('have.attr', 'href', '/users/confirmation/new');
  });

  it('logs in with locked account', () => {
    cy.appFactories([
      ['create', 'user', {
        password: 'foo_bar_baz',
        password_confirmation: 'foo_bar_baz',
        name_abbreviation: 'FB',
        locked_at: new Date().toISOString(),
      }],
    ]);
    cy.login('FB', 'foo_bar_baz');
    cy.contains('Your account is locked');
  });
});
