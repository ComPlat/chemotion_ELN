const { defineConfig } = require('cypress');

const port = 3000;

module.exports = defineConfig({

  viewportWidth: 1536,
  viewportHeight: 960,

  e2e: {
    defaultCommandTimeout: 5000,
    specPattern: 'cypress/end_to_end/*.cy.js',
    supportFile: 'cypress/support/index.js',
    baseUrl: `http://localhost:${port}/`,
    video: false,
    env: {
      reservedList: ['CRR', 'CRS', 'CRD'],
      lengthGroup: [2, 5],
      lengthDevice: [2, 6],
      lengthDefault: [2, 3],
      formatAbbr: "!ruby/regexp '/\A[a-zA-Z][a-zA-Z0-9\-_]*[a-zA-Z0-9]\Z/'",
      formatAbbrErrMsg: "can be alphanumeric, middle '_' and '-' are allowed, but leading digit, or trailing '-' and '_' are not."
    },
  },
});
