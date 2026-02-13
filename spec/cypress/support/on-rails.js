// CypressOnRails: dont remove these command
Cypress.Commands.add('appCommands', (body) => {
  Object.keys(body).forEach((key) => (body[key] === undefined ? delete body[key] : {}));
  const log = Cypress.log({ name: 'APP', message: body, autoEnd: false });
  return cy.request({
    method: 'POST',
    url: '/__cypress__/command',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    log: false,
    failOnStatusCode: false,
    // Avoid hanging forever if Rails is stuck / DB cleaning is slow.
    timeout: 120000,
  }).then((response) => {
    log.end();
    if (response.status !== 201) {
      // Give a useful error when Rails is not running / middleware not mounted.
      // cypress-on-rails should respond with 201 and a JSON array payload.
      const bodyPreview = (() => {
        try {
          if (response && typeof response.body === 'string') return response.body.slice(0, 500);
          return JSON.stringify(response && response.body ? response.body : null).slice(0, 500);
        } catch (e) {
          return '<unserializable response body>';
        }
      })();

      throw new Error(
        `CypressOnRails command failed (HTTP ${response.status}). ` +
          `Body: ${bodyPreview}. ` +
          `Make sure the Rails server is running and cypress-on-rails middleware is enabled (non-production).`
      );
    }
    return response.body;
  });
});

Cypress.Commands.add('app', (name, command_options) => cy.appCommands({ name, options: command_options }).then((body) => body[0]));

Cypress.Commands.add('appScenario', (name, options = {}) => cy.app(`scenarios/${name}`, options));

Cypress.Commands.add('appEval', (code) => cy.app('eval', code));

Cypress.Commands.add('appFactories', (options) => cy.app('factory_bot', options));

Cypress.Commands.add('appFixtures', (options) => {
  cy.app('activerecord_fixtures', options);
});

// comment this out if you do not want to attempt to log additional info on test fail
Cypress.on('fail', (err, runnable) => {
  // allow app to generate additional logging data
  Cypress.$.ajax({
    url: '/__cypress__/command',
    data: JSON.stringify({ name: 'log_fail', options: { error_message: err.message, runnable_full_title: runnable.fullTitle() } }),
    async: false,
    method: 'POST'
  });

  throw err;
});
