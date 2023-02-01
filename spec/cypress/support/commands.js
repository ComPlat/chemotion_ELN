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

Cypress.Commands.add('createDefaultUser', (emailAddress, abbr) => {
  cy.appFactories([
    ['create', 'user', {
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
      email: 'admin@eln.edu',
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

// TODO
// stub these api calls in future
// https://docs.cypress.io/api/commands/intercept#Intercepted-requests
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

const staticResponse = { /* some StaticResponse properties here... */ };
Cypress.Commands.add('stubCollections', () => {
  cy.intercept('GET', '/api/v1/collections/roots.json', staticResponse).as('colletions1');
  cy.intercept('GET', '/api/v1/collections/shared_roots.json', staticResponse).as('colletions2');
  cy.intercept('GET', '/api/v1/collections/remote_roots.json', staticResponse).as('colletions3');
  cy.intercept('GET', '/api/v1/syncCollections/sync_remote_roots.json', staticResponse).as('colletions4');
  cy.intercept('PATCH', '/api/v1/collections', staticResponse).as('collections.patch');
  const ro = { requestTimeout: 60000, responseTimeout: 90000 };
  cy.get('#collection-management-button').click();
  cy.wait([
    '@colletions1',
    '@colletions2',
    '@colletions3',
    '@colletions4',
  ], ro);
});

Cypress.Commands.add('stubExperimentData', () => {
  cy.intercept('GET', '/api/v1/samples.json', staticResponse);
  cy.intercept('GET', '/api/v1/research.json', staticResponse);
  cy.intercept('GET', '/api/v1/wellplates.json', staticResponse);
  cy.intercept('GET', '/api/v1/screens.json', staticResponse);
  cy.intercept('GET', '/api/v1/research_plans.json', staticResponse);
});

Cypress.Commands.add('createMolecule', (iupacName, molWeight) => {
  cy.appFactories([
    ['create', 'molecule', {
      iupac_name: iupacName,
      inchistring: 'inchistring',
      density: 0.12345,
      molecular_weight: molWeight,
      exact_molecular_weight: 18.0106,
      molfile: `H2O Water 7732185
      ##CCCBDB 8251509:58
      Geometry Optimized at HF/STO-3G
        3  2  0  0  0  0  0  0  0  0    V2000
          0.0000    0.0000    0.1271 O  0000000000000000000
          0.0000    0.7580   -0.5085 H  0000000000000000000
          0.0000   -0.7580   -0.5085 H  0000000000000000000
        1  2  1  0     0  0
        1  3  1  0     0  0
      M  END,
      melting_point: 150.00,
      boiling_point: 100.00,
      sum_formular: 'H2O',
      names: ['name1', 'sum_formular', 'iupac_name'],
      iupac_name: iupacName,
      molecule_svg_file: 'molecule.svg'`,
    }],
  ]);
});

Cypress.Commands.add('createSample', (sampleName) => {
  cy.appFactories([
    ['create', 'sample', {
      name: sampleName,
    }],
  ]);
});
