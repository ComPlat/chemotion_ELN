describe('Research Plan with User', () => {
  beforeEach(() => {
    cy.visit('users/sign_in');
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user1) => {
      cy.appFactories([['create', 'collection', { label: 'Col1', user_id: user1[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', { molecular_weight: 171.03448 }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            name: 'PH-1234', real_amount_value: 4.671, molecule_id: molecule[0].id, collection_ids: collection[0].id, user_id: user1[0].id
          }]]);
        });
        cy.appFactories([['create', 'research_plan', { name: 'FooBar' }]]).then((researchPlan) => {
          cy.appFactories([['create', 'collections_research_plan', { research_plan_id: researchPlan[0].id, collection_id: collection[0].id }]]);
        });
      });
    });
    cy.login('cu1', 'user_password');
    cy.contains('Col1').click();
    cy.get('i.icon-research_plan').closest('button[role="tab"]').click();
    cy.contains('FooBar').click();
    cy.get('i.fa.fa-pencil').parent('button').click({ force: true });
  });

  it('renames research plan', () => {
    cy.get('input[name="research_plan_name"]').clear().type('My Research Plan 2');
    cy.clickDetailFooterButton('Save');
    cy.get('.element-list-item').contains('My Research Plan 2');
  });

  it('adds/removes fields in research plan', () => {
    ([['richtext', 'Text'],
      ['table', 'Table'],
      ['ketcher', 'Ketcher schema'],
      ['image', 'Image'],
      ['sample', 'Sample'],
      ['reaction', 'Reaction']]
    ).forEach(([buttonText, titleText]) => {
      cy.get(`[data-cy="btn_${buttonText}"]`).click();
      cy.contains('label', titleText).as('title');
      cy.get('@title').parent().find('[data-cy="researchplan-item-delete"]').click();
    });
  });
});
