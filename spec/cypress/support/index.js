// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
// import 'cypress-on-rails/support/index'
// import '../../spec/cypress/support/commands';
// import '../../spec/cypress/support/on-rails';

// Alternatively you can use CommonJS syntax:
require('./commands');
require('./on-rails');

beforeEach(() => {
  // Runs before every test (`it()`) in every test file (`*.cy.js`).
  // Allow skipping the heavy DB clean for long-running E2E specs.
  // Example:
  //   yarn cypress run ... --env SKIP_APP_CLEAN=1
  if (Cypress.env('SKIP_APP_CLEAN')) return;
  cy.app('clean');
});
