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

Cypress.Commands.add('createDefaultUser', (userID, emailAddress, abbr) => {
  cy.appFactories([
    ['create', 'user', {
      id: userID,
      first_name: 'User',
      last_name: 'Complat',
      password: 'user_password',
      password_confirmation: 'user_password',
      email: emailAddress,
      name_abbreviation: abbr,
      account_active: 'true',
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

Cypress.Commands.add('createCollection', (userID, label) => {
  cy.appFactories([
    ['create', 'collection', {
      user_id: userID,
      label,
      sample_detail_level: 10,
    }],
  ]);
});

Cypress.Commands.add('waitForAPIs', () => {
  cy.intercept('GET', '/api/v1/collections/roots.json').as('colletions1');
  cy.intercept('GET', '/api/v1/collections/shared_roots.json').as('colletions2');
  cy.intercept('GET', '/api/v1/collections/remote_roots.json').as('colletions3');
  cy.intercept('GET', '/api/v1/syncCollections/sync_remote_roots.json').as('colletions4');
  cy.intercept('PATCH', '/api/v1/collections').as('collections.patch');
  cy.intercept(
    {
      url: '/api/v1/*ollections/*roots.json',
      middleware: true
    },
    (req) => {
      req.on('response', (res) => {
      // Throttle the response to 1 Mbps to simulate a
      // mobile 3G connection
        res.setThrottle(Math.floor(Math.random() * 10) + 10);
        res.setDelay(Math.floor(Math.random() * 500) + 1500);
      });
    }
  );
  const ro = { requestTimeout: 60000, responseTimeout: 90000 };
  cy.get('#collection-management-button').click();
  cy.wait([
    '@colletions1',
    '@colletions2',
    '@colletions3',
    '@colletions4',
  ], ro);
});
