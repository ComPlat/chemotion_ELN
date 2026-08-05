const moleculeSVG = '81ba09b10beaa89f190c39faa85ced3ea20728cda625d884410ac0ab96bc62824375cff5da9c3ea19bf335aa6a872591e58cf07eb7ec7878318b011e4fe362a5.svg';
const inshiString = 'InChI=1S/H2O/h1H2';
const molFileVersion = 'V2000';

describe('Research Plan', () => {
  it('creates and deletes a research plan', () => {
    cy.visit('users/sign_in');
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { label: 'Col1', user_id: user[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', {
          molecular_weight: 171.03448, inchistring: inshiString, molecule_svg_file: moleculeSVG, molfile_version: molFileVersion
        }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'PH-1234', real_amount_value: 4.671, molecule_id: molecule[0].id, collection_ids: collection[0].id, user_id: user[0].id
          }]]);
        });
      });
    });

    cy.login('cu1', 'user_password');
    cy.contains('Col1').click();
    cy.get('.create-element-button').click();
    cy.contains('Create Research Plan').click();
    cy.contains('New Research Plan');
    cy.get('input[name="research_plan_name"]').clear().type('My Research Plan');
    cy.clickDetailFooterButton('Create');
    cy.get('i.icon-research_plan').closest('button[role="tab"]').click();
    cy.get('.element-list-item.is-selected').as('listItem');
    cy.get('@listItem').contains('My Research Plan');

    cy.get('@listItem').find('input[type="checkbox"]').click();
    cy.get('#remove-or-delete-btn').click();
    cy.contains('Remove from all Collections').click();
    cy.contains('button', 'Delete').click();
    cy.contains('No elements available');
  });
});
