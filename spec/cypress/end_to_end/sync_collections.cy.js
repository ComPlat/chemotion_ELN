const moleculeSVG = '81ba09b10beaa89f190c39faa85ced3ea20728cda625d884410ac0ab96bc62824375cff5da9c3ea19bf335aa6a872591e58cf07eb7ec7878318b011e4fe362a5.svg';
const inshiString = 'InChI=1S/H2O/h1H2';
const molFileVersion = 'V2000';

describe('Synchronize Collections', () => {
  beforeEach(() => {
    cy.visit('users/sign_in');
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { label: 'Col1', user_id: user[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'reaction', { collection_ids: collection[0].id }]]);
        cy.appFactories([['create', 'molecule', {
          molecular_weight: 171.03448, inchistring: inshiString, molecule_svg_file: moleculeSVG, molfile_version: molFileVersion
        }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'Material', real_amount_value: 4.671, molecule_id: molecule[0].id, collection_ids: collection[0].id, user_id: user[0].id
          }]]);
        });
        cy.appFactories([['create', 'molecule', {
          molecular_weight: 133.15058, inchistring: inshiString, molecule_svg_file: moleculeSVG, molfile_version: molFileVersion
        }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'Product', real_amount_value: 4.671, molecule_id: molecule[0].id, collection_ids: collection[0].id
          }]]);
        });
      });
      cy.createDefaultUser('cu2@complat.edu', 'cu2').then((user2) => {
        cy.appFactories([['create', 'collection', { label: 'Collection 1', user_id: user2[0].id }]]);
      });
    });
  });

  it('sync collection with write permission', () => {
    cy.login('cu1', 'user_password');
    cy.settingPermission('Write');
    cy.login('cu2', 'user_password');
    cy.get('#synchron-home-link').click();
    cy.get('[id^=tree-id-]').find('.glyphicon').click();
    cy.get('#tree-id-Col1').click();
    cy.get('#tabList-tab-1').click();
    cy.contains('a01-R1 Reaction 1');
    cy.get('[width="unset"] > :nth-child(1)').click();
    //cy.get('input[name="reaction_name"').first().should('not.be.disabled');
  });

  it('sync collection with write permission can add a new sample', () => {
    cy.login('cu1', 'user_password');
    cy.settingPermission('Write');
    cy.login('cu2', 'user_password');
    cy.get('#synchron-home-link').click();
    cy.get('[id^=tree-id-]').find('.glyphicon').click();
    cy.get('#tree-id-Col1').last().click();
    cy.get('#tabList-tab-1').click();
    cy.contains('a01-R1 Reaction 1');
    cy.get('[width="unset"] > :nth-child(1)').click();
    cy.get('#create-split-button').should('not.be.disabled');
    cy.get('#create-split-button').click();
    cy.get('#create-sample-button').click();
    cy.get('.chem-identifiers-section > .list-group-item').click();
    cy.get('#smilesInput').type('c1cc(cc(c1)c1ccccc1)c1ccccc1');
    cy.get('#smile-create-molecule').click();
    cy.get('#submit-sample-btn').click();
    cy.get('#tabList-tab-0').click();
    cy.contains('cu2-1');
  });

  it('sync collection with read permission', () => {
    cy.login('cu1', 'user_password');
    cy.settingPermission('Read');
    cy.login('cu2', 'user_password');
    cy.get('#synchron-home-link').click();
    cy.get('[id^=tree-id-]').find('.glyphicon').click();
    cy.get('#tree-id-Col1').click();
    cy.get('#tabList-tab-1').click();
    cy.contains('a01-R1 Reaction 1');
    cy.get('[width="unset"] > :nth-child(1)').click();
    cy.get('input[name="reaction_name"').first().should('be.disabled');
  });
});
