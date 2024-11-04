describe('Text search', () => {
  beforeEach(() => {
    cy.createDefaultUser('complat.user1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id, label: 'Col1' }]])
        .then((collection) => {
          cy.appFactories([['create', 'valid_sample', {
            collection_ids: collection[0].id
          }]]);
        });
    });
    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');

    cy.get('#tabList-tabpane-0 > .list-container > .elements-list', { timeout: 4000 })
      .should('be.visible')
      .then(() => {
        cy.wait(4000);
        cy.get('#open-search-modal').click();
      });
  });

  it('search for sample name by advanced search and adopt result', () => {
    cy.get('.match-select-options').first().find('input').click({ force: true }).focus();
    cy.get('.match-select-options').first().find('[class$=-menu]')
      .find('[id^=react-select-][id$=-option-1]')
      .click({ force: true });
    cy.get('.value-select').first().type('te');
    cy.get('.advanced-search-row').should('have.length', 2);
    cy.get('#advanced-search-button').click();
    cy.contains('0 results');
    cy.get('.collapsed').click();
    cy.get('.value-select').first().clear();
    cy.get('.value-select').first().type('Sample');
    cy.get('#advanced-search-button').click();
    cy.contains('1 results').then(() => {
      cy.get('.advanced-search-buttons.results > .btn-primary').click();
      cy.get('button.btn-info').contains('Remove search result');
    });
  });

  it('search for sample name by detail search, clear search and close modal', () => {
    cy.get('.advanced-detail-switch-label').click();
    cy.get('#advanced-search-button').click();
    cy.contains('Please fill out all needed fields');
    cy.get('#input_name').type('Sample');
    cy.get('#advanced-search-button').click();
    cy.contains('1 results').then(() => {
      cy.get('.advanced-search-buttons.results > .btn-info').click();
      cy.get('#input_name').should('not.have.value', 'Sample');
      cy.get('#advanced-cancel-button').click();
      cy.get('[role="dialog"]').should('not.exist');
    });
  });
});
