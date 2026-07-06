describe('Text search', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/units_system/units_system.json*').as('getUnitsSystem');

    cy.createDefaultUser('complat.user1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id, label: 'Col1' }]])
        .then((collection) => {
          cy.appFactories([['create', 'valid_sample', {
            collection_ids: collection[0].id, name: 'Foo'
          }]]);
        });
    });
    cy.login('cu1', 'user_password');
    cy.wait('@getUnitsSystem');
    cy.contains('Col1').click();
    cy.get('#open-search-modal').click();
  });

  it('searches for sample name by advanced search', () => {
    cy.get('input[placeholder="Search value"]').type('Foo');
    cy.get('.advanced-search-buttons').contains('Search').click();
    cy.contains('1 results');
  });

  it('searches for sample name by detail search', () => {
    cy.contains('Detail').click();
    cy.get('#input_name').type('Foo');
    cy.get('.advanced-search-buttons').contains('Search').click();
    cy.contains('1 results');
  });
});
