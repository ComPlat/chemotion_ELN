describe('Wellplate Creation', () => {
  it('create wellplat with smile', () => {
    cy.createDefaultUser().then((user) => {
      cy.appFactories([['create', 'collection', { user_id: user[0].id }]]);
    });

    cy.login('a01', 'user_password');
    cy.visit('mydb/collection/3/');
    cy.get('div').find('[id="tree-id-Collection 1"]').click();
    cy.get('#create-split-button').click();
    cy.get('#create-sample-button').click();
    cy.get('.chem-identifiers-section > .list-group-item').click();
    cy.get('#smilesInput').type('c1cc(cc(c1)c1ccccc1)c1ccccc1');
    cy.get('#smile-create-molecule').click();
    cy.get('#txinput_name').clear().type('sample A');
    cy.get('#submit-sample-btn').click();
    cy.get('div').find('[id="tree-id-Collection 1"]').click();
    cy.get('#create-split-button').click();
    cy.get('#create-wellplate-button').click();
    cy.get('#wellplateDetailsTab-tab-designer').click();
    const dataTransfer = new DataTransfer();
    cy.get('[style=""] > [style="vertical-align: middle; text-align: center;"] > .fa').trigger('dragstart', { dataTransfer });
    cy.get('[style="width: 780px; height: 540px;"] > :nth-child(3) > [draggable="true"]').trigger('drop', { dataTransfer });
    cy.get('.btn-toolbar > .btn-warning').click();
    cy.get('.btn-toolbar > .btn-warning').click().then(() => {
      cy.get('.collection-label > .label > .icon-wellplate').should('have.class', 'icon-wellplate');
    });
  });
});
