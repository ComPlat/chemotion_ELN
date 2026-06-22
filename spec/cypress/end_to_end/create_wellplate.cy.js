describe('Wellplate Creation', () => {
  it('creates wellplate', () => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id }]]).then((collection) => {
        cy.appFactories([['create', 'molecule']]).then((molecule) => {
          cy.appFactories([['create', 'sample', {
            molecule_id: molecule[0].id,
            collection_ids: collection[0].id
          }]]);
        });
      });
    });

    cy.login('cu1', 'user_password');
    cy.contains('Collection 1').click();
    cy.contains('Create').click();
    cy.contains('Create Wellplate').click();
    cy.get('input[value="New Wellplate"]').type('{selectAll}Foo');
    cy.clickDetailFooterButton('Create');

    cy.get('i.icon-wellplate').closest('button[role="tab"]').click();
    cy.get('#elements-list-view').contains('Foo');
  });
});
