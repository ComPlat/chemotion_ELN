describe('Copy Samples', () => {
  it('no copy button', () => {
    cy.createDefaultUser('complat.user1@complat.edu', 'cu1').then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id, label: 'Col1' }]]);
    });
    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');
    // Why `collection/3`?
    // The collection db table is already populated with 2 entries ('All' and 'chemotion-repository.net').
    cy.visit('mydb/collection/3/');
    cy.get('#tree-id-Col1').click();
    cy.get('#create-split-button').click();
    cy.get(':nth-child(10)').should('have.class', 'disabled');
  });

  it('copy sample to same collection', () => {
    cy.appFactories([['create', 'valid_sample']]);
    cy.login('foobar1@bar.de', 'testtest');
    cy.visit('mydb/collection/3');
    cy.intercept('GET', '/api/v1/collections/roots.json').as('colletions1');
    cy.intercept('GET', '/api/v1/collections/*').as('req');
    cy.wait('@req');
    cy.get('div').find('[id="tree-id-Collection 1"]');
    cy.get('.element-checkbox').as('elem');
    cy.get('@elem').click();
    cy.get('#create-split-button').as('split_btn');
    cy.get('@split_btn').click();
    cy.get(':nth-child(10)').should('have.class', '');
    cy.get(':nth-child(10)').as('elem10');
    cy.get('@elem10').last().click();
    cy.get('#txinput_name').clear().type('sample 2');
    cy.get('#submit-sample-btn').click();
    cy.contains('a01-2');
  });

  it('copy sample to different collection', () => {
    cy.appFactories([['create', 'valid_sample']]);
    cy.appFactories([['create', 'collection', { user_id: 1, label: 'Collection 2' }]]);
    cy.login('foobar1@bar.de', 'testtest');
    cy.stubCollections();
    cy.get('div').find('[id="tree-id-Collection 1"]').click();
    cy.get('table').contains('a01-1').click();
    cy.get('#copy-element-btn').click();
    cy.get('div').find('[class="Select-input"]').find('[id="modal-collection-id-select"]').as('collectionLink');
    cy.get('@collectionLink').click({ force: true });
    cy.get('@collectionLink').trigger('keydown', { force: true, keyCode: 40 });
    cy.get('@collectionLink').type('{enter}', { force: true });
    cy.get('#submit-copy-element-btn').click();
    cy.stubExperimentData();
    cy.get('#submit-sample-btn').click();
    cy.contains('a01-2');
  });
});
