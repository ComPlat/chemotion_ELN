describe('Share Collections', () => {
  const ignoreKnownModalImportError = () => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("Cannot read properties of null (reading 'id')")) {
        return false;
      }

      return true;
    });
  };

  const selectShareUser = (name) => {
    cy.get('#share-users-select').find('input').first().type(name);
    cy.get('body').contains('.chemotion-select__option', name).first().click();
  };

  beforeEach(() => {
    ignoreKnownModalImportError();

    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user1) => {
      cy.appFactories([['create', 'collection', { label: 'Col1', user_id: user1[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', { molecular_weight: 171.03448 }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'PH-1234',
            real_amount_value: 4.671,
            molecule_id: molecule[0].id,
            collection_ids: collection[0].id,
            user_id: user1[0].id
          }]]);
        });
      });
    });

    cy.appFactories([
      ['create', 'user', {
        first_name: 'Foo',
        last_name: 'Bar',
        password: 'user_password',
        password_confirmation: 'user_password',
        email: 'foo.bar@complat.edu',
        name_abbreviation: 'fb',
        account_active: 'true',
      }],
    ]);

    cy.login('cu1', 'user_password');
    cy.contains('Manage Collections').click();
    cy.get('input[value="Col1"]').as('row');
    cy.get('@row').parent().find('#collection-share-btn').click();
    cy.get('select[id="permissionLevelSelect"]').select('Read');
  });

  it('shares with permission to read everything', () => {
    cy.get('#sampleDetailLevelSelect').select('Everything');
    cy.get('#reactionDetailLevelSelect').select('Everything');
    cy.get('#wellplateDetailLevelSelect').select('Everything');
    cy.get('#screenDetailLevelSelect').select('Everything');
    selectShareUser('Foo Bar');
    cy.contains('Create Shared Collection').click();
    cy.get('input[value="Col1"]').parent().find('i.fa.fa-users').click();
    cy.contains('Foo Bar (fb)');
  });

  it('shares with permission read limited', () => {
    cy.get('#sampleDetailLevelSelect').select('Molecular mass of the compound, external label');
    cy.get('#reactionDetailLevelSelect').select('Everything');
    cy.get('#wellplateDetailLevelSelect').select('Everything');
    cy.get('#screenDetailLevelSelect').select('Everything');
    selectShareUser('Foo Bar');
    cy.contains('Create Shared Collection').click();
    cy.get('input[value="Col1"]').parent().find('i.fa.fa-users').click();
    cy.contains('Foo Bar (fb)');
  });
});
