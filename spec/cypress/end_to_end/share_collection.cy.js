describe('Share Collections', () => {
  beforeEach(() => {
    cy.visit('users/sign_in');
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user1) => {
      cy.appFactories([['create', 'collection', { label: 'Col1', user_id: user1[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', { molecular_weight: 171.03448 }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'PH-1234', real_amount_value: 4.671, molecule_id: molecule[0].id, collection_ids: collection[0].id, user_id: user1[0].id
          }]]);
        });
      });
      cy.appFactories([['create', 'collection', { label: 'Col2', user_id: user1[0].id }]]);
      cy.createDefaultUser('cu2@complat.edu', 'cu2');
    });
  });

  it('share with permission to read everything', () => {
    cy.login('cu1', 'user_password');
    cy.get('#tree-id-Col1').click();
    cy.visit('/mydb/collection/3');
    cy.get('.element-checkbox').click();
    cy.get('#share-btn').click();
    cy.get(':nth-child(2) > #permissionLevelSelect').select('Read');
    cy.get('#sampleDetailLevelSelect').select('Everything');
    cy.get('#reactionDetailLevelSelect').select('Everything');
    cy.get('#wellplateDetailLevelSelect').select('Everything');
    cy.get(':nth-child(6) > #screenDetailLevelSelect').select('Everything');
    cy.get('#react-select-4--value').as('user').click();
    cy.get('@user').type('User').type('{downArrow}').type('{enter}');
    cy.get('#create-sync-shared-col-btn').click();
    Cypress.on('uncaught:exception', () =>
      // returning false here prevents Cypress from failing the test
      false);
    cy.clearCookie('_chemotion_session');
    cy.get('a[title="Log out"]').click();
    cy.login('cu2', 'user_password');
    cy.get('#shared-home-link').click();
    cy.contains('My project with User Complat');
  });

  it('share with permission read limited', () => {
    cy.login('cu1', 'user_password');
    cy.get('#tree-id-Col1').click();
    cy.visit('/mydb/collection/3');
    cy.get('.element-checkbox').click();
    cy.get('#share-btn').click();
    cy.get(':nth-child(2) > #permissionLevelSelect').select('Read');
    cy.get('#sampleDetailLevelSelect').select('Molecular mass of the compound, external label');
    cy.get('#reactionDetailLevelSelect').select('Everything');
    cy.get('#wellplateDetailLevelSelect').select('Everything');
    cy.get(':nth-child(6) > #screenDetailLevelSelect').select('Everything');
    cy.get('#react-select-4--value').type('User').type('{downArrow}').type('{enter}');
    cy.get('#create-sync-shared-col-btn').click();
    Cypress.on('uncaught:exception', () =>
      false);
    cy.clearCookie('_chemotion_session');
    cy.get('a[title="Log out"]').click();
    cy.login('cu2', 'user_password');
    cy.get('#shared-home-link').click();
    cy.contains('My project with User Complat').then(() => {
      cy.get('[id^=tree-id-]').find('.glyphicon').click();
      cy.get('[id="tree-id-My project with User Complat"]').click();
      cy.contains('***');
    });
  });
});
