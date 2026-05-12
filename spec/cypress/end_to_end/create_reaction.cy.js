describe('Reactions Create/Update', () => {
  it('create and update reaction', () => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule', { molecular_weight: 171.03448 }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            short_label: 'Material',
            molecule_id: molecule[0].id,
            collection_ids: collection[0].id
          }]]);
        });
        cy.appFactories([['create', 'molecule', { molecular_weight: 133.15058 }]]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            short_label: 'Product',
            molecule_id: molecule[0].id,
            collection_ids: collection[0].id
          }]]);
        });
      });
    });

    cy.login('cu1', 'user_password');
    cy.contains('Collection 1').click();

    // Create reaction
    cy.contains('Create').click();
    cy.contains('Create Reaction').click();
    cy.get('input[name="reaction_name"]').first().clear().type('Reaction A');
    // Valid reaction requires sample
    cy.contains('Reactants').find('.chemotion-select').click();
    cy.contains('ferrocene').click();
    cy.clickDetailFooterButton('Create');

    cy.get('i.icon-reaction').closest('button[role="tab"]').click();
    cy.get('#elements-list-view').contains('Reaction A');

    // Update reaction
    cy.get('input[name="reaction_name"]').first().clear().type('Reaction B');
    cy.clickDetailFooterButton('Save');

    cy.get('#elements-list-view').contains('Reaction B');
  });
});
