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

Cypress.Commands.add('waitForAPIs', () => {
  cy.intercept('GET', '/api/v1/collections/roots.json').as('colletions1');
  cy.intercept('GET', '/api/v1/collections/shared_roots.json').as('colletions2');
  cy.intercept('GET', '/api/v1/collections/remote_roots.json').as('colletions3');
  cy.intercept('GET', '/api/v1/syncCollections/sync_remote_roots.json').as('colletions4');
  cy.intercept('PATCH', '/api/v1/collections').as('collections.patch');
  cy.get('#collection-management-button').click();
  cy.wait([
    '@colletions1',
    '@colletions2',
    '@colletions3',
    '@colletions4',
  ]);
});

const staticResponse = {};
Cypress.Commands.add('stubCollections', () => {
  cy.intercept('GET', '/api/v1/collections/roots.json', staticResponse).as('colletions1');
  cy.intercept('GET', '/api/v1/collections/shared_roots.json', staticResponse).as('colletions2');
  cy.intercept('GET', '/api/v1/collections/remote_roots.json', staticResponse).as('colletions3');
  cy.intercept('GET', '/api/v1/syncCollections/sync_remote_roots.json', staticResponse).as('colletions4');
  cy.intercept('PATCH', '/api/v1/collections', staticResponse).as('collections.patch');
  cy.get('#collection-management-button').click();
  cy.wait([
    '@colletions1',
    '@colletions2',
    '@colletions3',
    '@colletions4',
  ]);
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

Cypress.Commands.add('createMessages', (adminID, channelID, userID) => {
  cy.appFactories([['create', 'message', {
    channel_id: channelID,
    content: { data: 'Thanks for using ELN!\nTo make our system better for you, we bring updates every Friday.' },
    created_by: adminID
  }]]).then((message) => {
    cy.appFactories([['create', 'notification', { message_id: message[0].id, user_id: userID }]]);
  });
  cy.appFactories([['create', 'message', {
    channel_id: channelID,
    content: { data: 'Thanks for using ELN!\nWe have new features for you.' },
    created_by: adminID
  }]]).then((message) => {
    cy.appFactories([['create', 'notification', { message_id: message[0].id, user_id: userID }]]);
  });
  cy.appFactories([['create', 'message', {
    channel_id: channelID,
    content: { data: 'Thanks for using ELN!\nHave a nice weekend.' },
    created_by: adminID
  }]]).then((message) => {
    cy.appFactories([['create', 'notification', { message_id: message[0].id, user_id: userID }]]);
  });
});

Cypress.Commands.add('createUserWithResearchPlan', () => {
  cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user1) => {
    cy.appFactories([['create', 'collection', { label: 'Col1', user_id: user1[0].id }]]).then((collection) => {
      cy.appFactories([['create', 'molecule', { molecular_weight: 171.03448 }]]).then((molecule) => {
        cy.appFactories([['create', 'sample', {
          name: 'PH-1234', real_amount_value: 4.671, molecule_id: molecule[0].id, collection_ids: collection[0].id, user_id: user1[0].id
        }]]);
      });
      cy.appFactories([['create', 'research_plan']]).then((researchPlan) => {
        cy.appFactories([['create', 'collections_research_plan', { research_plan_id: researchPlan[0].id, collection_id: collection[0].id }]]);
      });
    });
  });
});

Cypress.Commands.add('settingPermission', (permission) => {
  cy.get('#tree-id-Col1').click();
  cy.visit('/mydb/collection/management');
  cy.get('#sync-users-btn').click();
  cy.get(':nth-child(2) > #permissionLevelSelect').select(permission);
  cy.get('#sampleDetailLevelSelect').select('Everything');
  cy.get('#reactionDetailLevelSelect').select('Everything');
  cy.get('#wellplateDetailLevelSelect').select('Everything');
  cy.get(':nth-child(6) > #screenDetailLevelSelect').select('Everything');

  cy.get('#react-select-2--value').type('User').type('{downArrow}').type('{enter}');
  cy.get('#create-sync-shared-col-btn').click();

  Cypress.on('uncaught:exception', () =>
    false);
  cy.clearCookie('_chemotion_session');
  cy.get('a[title="Log out"]').click();
});
