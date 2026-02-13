const { defineConfig } = require('cypress');

const port = 3000;

module.exports = defineConfig({
  viewportWidth: 1536,
  viewportHeight: 960,

  e2e: {
    defaultCommandTimeout: 5000,
    baseUrl: `http://localhost:${port}/`,
    video: false,

    // This repo keeps Cypress specs under spec/cypress/
    specPattern: 'spec/cypress/end_to_end/**/*.cy.js',
    supportFile: 'spec/cypress/support/index.js',
    fixturesFolder: 'spec/cypress/fixtures',

    env: {
      reservedList: ['CRR', 'CRS', 'CRD'],
      lengthGroup: [2, 5],
      lengthDevice: [2, 6],
      lengthDefault: [2, 3],
      formatAbbr: "!ruby/regexp '/\\A[a-zA-Z][a-zA-Z0-9\\-_]*[a-zA-Z0-9]\\Z/'",
      formatAbbrErrMsg:
        "can be alphanumeric, middle '_' and '-' are allowed, but leading digit, or trailing '-' and '_' are not.",
    },
  },
});

