// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('login', (username, password) => {
  cy.visit('users/sign_in');
  cy.get('#user_login').type(username);
  cy.get('#user_password').type(`${password}{enter}`, { log: false });
});

Cypress.Commands.add('createDefaultUser', () => {
  cy.appFactories([
    ['create', 'user', {
      password: 'user_password',
      password_confirmation: 'user_password',
      first_name: 'User',
      last_name: 'Complat',
      email: 'complat.user@eln.edu',
      name_abbreviation: 'UC',
      account_active: 'true',
      id: 1,
    }],
  ]);
});

Cypress.Commands.add('createDefaultAdmin', () => {
  cy.appFactories([
    ['create', 'admin', {
      password: 'admin_password',
      password_confirmation: 'admin_password',
      name_abbreviation: 'ADM',
      account_active: 'true'
    }],
  ]);
});

Cypress.Commands.add('createCollection', (label) => {
  cy.appFactories([
    ['create', 'collection', {
      user_id: 1,
      label,
      sample_detail_level: 10,
    }],
  ]);
});
