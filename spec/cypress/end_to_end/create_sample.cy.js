describe('Sample Creation', () => {
  it('create sample', () => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id }]]);
    });

    cy.login('cu1', 'user_password');
    cy.contains('Collection 1').click();
    cy.contains('Create').click();
    cy.contains('Create Sample').click();
    cy.contains('Chemical identifiers').click();
    cy.contains('Canonical Smiles').siblings('input').type('c1cc(cc(c1)c1ccccc1)c1ccccc1');
    cy.get('#smile-create-molecule').click();
    cy.clickDetailFooterButton('Create');

    cy.get('i.icon-sample').closest('button[role="tab"]').click();
    cy.get('#elements-list-view').contains('cu1-1');
  });
});
