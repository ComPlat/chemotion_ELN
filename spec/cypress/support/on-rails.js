// CypressOnRails: dont remove these command
Cypress.Commands.add('appCommands', (body) => {
  Object.keys(body).forEach((key) => (body[key] === undefined ? delete body[key] : {}));
  const log = Cypress.log({ name: 'APP', message: body, autoEnd: false });
  return cy.request({
    method: 'POST',
    url: '/__cypress__/command',
    body: JSON.stringify(body),
    log: false,
    failOnStatusCode: false
  }).then((response) => {
    log.end();
    if (response.status !== 201) {
      expect(response.body.message).to.equal('');
      expect(response.status).to.be.equal(201);
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
