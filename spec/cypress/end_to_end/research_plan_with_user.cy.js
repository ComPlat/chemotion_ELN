describe('Research Plan with User', () => {
  it('rename research plan', () => {
    cy.visit('users/sign_in');
    cy.createUserWithResearchPlan();
    cy.login('cu1', 'user_password');
    cy.get('#tree-id-Col1').click();
    cy.visit('/mydb/collection/3');
    cy.get('#tabList-tab-4 > span').click();
    cy.get('[data-cy="researchPLanItem-1"]').click();
    cy.get('[style="margin: 5px 0px 5px 5px;"] > .btn').click();
    cy.get('.col-lg-8 > .form-group > .form-control').first().clear().type('My Research Plan 2');
    cy.get('.btn-toolbar > .btn-warning').click();
    cy.contains('My Research Plan 2');
    cy.get('#tabList-tab-4 > span').contains('1(0)');
  });

  it('add/remove fields in research plan', () => {
    cy.visit('users/sign_in');
    cy.createUserWithResearchPlan();
    cy.login('cu1', 'user_password');
    cy.get('#tree-id-Col1').click();
    cy.visit('/mydb/collection/3');
    cy.get('#tabList-tab-4 > span').click();
    cy.get('[data-cy="researchPLanItem-1"]').click();
    cy.get('[style="margin: 5px 0px 5px 5px;"] > .btn').click();
    cy.get('*[class="ql-editor"]').clear().type("ResearchPlan description");

    cy.get('[data-cy="researchplan-item-delete"]').click();

    cy.get('[data-cy="btn_richtext"]').click();
    cy.get('.research-plan-field-header').children('.control-label').should('contain','Text');
    cy.get('[data-cy="researchplan-item-delete"]').click();

    cy.get('[data-cy="btn_table"]').click();
    cy.get('.research-plan-field-header').children('.control-label').should('contain','Table');
    cy.get('[data-cy="researchplan-item-delete"]').click();

    cy.get('[data-cy="btn_ketcher"]').click();
    cy.get('.research-plan-field-header').children('.control-label').should('contain','Ketcher schema');
    cy.get('[data-cy="researchplan-item-delete"]').click();

    cy.get('[data-cy="btn_image"]').click();
    cy.get('.research-plan-field-header').children('.control-label').should('contain','Image');
    cy.get('[data-cy="researchplan-item-delete"]').click();

    cy.get('[data-cy="btn_sample"]').click();
    cy.get('.research-plan-field-header').children('.control-label').should('contain','Sample');
    cy.get('[data-cy="researchplan-item-delete"]').click();

    cy.get('[data-cy="btn_reaction"]').click();
    cy.get('.research-plan-field-header').children('.control-label').should('contain','Reaction');
    cy.get('[data-cy="researchplan-item-delete"]').click();
  });
});
