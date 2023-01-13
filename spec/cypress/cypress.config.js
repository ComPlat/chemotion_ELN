const { defineConfig } = require('cypress');

module.exports = defineConfig({
  viewportWidth: 1280,
  viewportHeight: 800,
  e2e: {
    specPattern: 'spec/cypress/end_to_end/*.cy.js',
    supportFile: 'spec/cypress/support/index.js',
    baseUrl: 'http://0.0.0.0:3000',
  },
});
