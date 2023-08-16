const moleculeSVG = '81ba09b10beaa89f190c39faa85ced3ea20728cda625d884410ac0ab96bc62824375cff5da9c3ea19bf335aa6a872591e58cf07eb7ec7878318b011e4fe362a5.svg';
const inshiString = 'InChI=1S/H2O/h1H2';
const molFileVersion = 'V2000';

describe('Research Plan', () => {
  it('create and delete a research plan', () => {
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
    cy.get('#tree-id-Col1').click();
    cy.visit('/mydb/collection/3');
    cy.intercept('GET', '/api/v1/collections/roots.json');
    cy.intercept('GET', '/api/v1/collections/*').as('req');
    cy.wait('@req');
    cy.get('#create-split-button').click().then(() => {
      cy.contains('Create Research Plan');
      cy.get('#create-research_plan-button').as('btn');
      cy.get('@btn').click();
    });
    cy.get('.col-lg-8 > .form-group > .form-control').first().clear().type('My Research Plan 1');
    cy.get('.btn-toolbar > .btn-warning').click();
    cy.contains('My Research Plan 1');
    cy.get('#tabList-tab-4 > span').contains('1(0)');
    cy.get('#tabList-tab-4').click();
    cy.get('.elements > tbody > tr > [width="30px"] > .element-checkbox').click();
    cy.get('#remove-or-delete-btn').click();
    cy.get('.open > .dropdown-menu > :nth-child(2) > a').click();
    cy.get('.btn-toolbar > .btn-warning').click();

    cy.get('#tabList-tab-0').click();
    cy.get('#tabList-tab-4').click();
    cy.get('#tabList-tab-4 > span').contains('0(0)');
  });
});
