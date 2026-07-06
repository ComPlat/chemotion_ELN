
[cypress-on-rails](https://github.com/shakacode/cypress-on-rails) integrates the Cypress testing framework with the Ruby on Rails applications.

Note: You don't need to install Cypress globally.
This repository installs Cypress via yarn (see package.json), while the `cypress-on-rails` gem provides the Rails integration.

Make sure to start the Rails server prior to starting Cypress.
Note that it's important to start the server with `RAILS_ENV=test`,
Cypress won't recognize the Rails server if it's running in the `development` or `production` env; see [here](https://github.com/shakacode/cypress-playwright-on-rails/issues/25) for more.

```bash
RAILS_ENV=test $(which bundle) exec rails server -b 0.0.0.0 -p 3000
```

You might have to prepare the test database prior to starting the test server

```bash
RAILS_ENV=test bundle exec rails db:prepare
```

Additionally, you have to compile the JS assets for the test environment, since those aren't precompiled in the devcontainer. Without this step, the test server renders a broken UI.

```bash
RAILS_ENV=test bundle exec rails assets:precompile
```

Subsequently, use another tab to run the following command.

```bash
yarn cypress open --project spec
```

When you run Cypress from the VSCode devcontainer you can open the Cypress app in the browser (outside of VSCode) at localhost:6080. See also https://github.com/cypress-io/cypress-documentation/issues/2956.

To run all tests headless (i.e., without opening a browser), use the following command

```bash
yarn cypress run --headless --project spec
```

Run the tests from a specific file with

```bash
yarn cypress run --headless --project spec --spec 'spec/cypress/end_to_end/<file_name>.cy.js'
``` 