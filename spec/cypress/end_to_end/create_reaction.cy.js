describe('Reaction', () => {
  it('creates a reaction', () => {
    const reactionName = `Reaction A ${Date.now()}`;

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
    cy.get('input[name="reaction_name"]').should('be.visible').clear().type(reactionName);
    // Valid reaction requires sample
    cy.contains('Reactants').find('.chemotion-select').click();
    cy.get('body').contains('.chemotion-select__option', /Material|ferrocene/i).click();
    cy.clickDetailFooterButton('Create');

    cy.get('i.icon-reaction').closest('button[id*="tabList-tab"]').click();
    cy.contains('#elements-list-view .element-list-item', reactionName);
  });
});
