describe('Research Plan with User', () => {
  it('rename research plan', () => {
    cy.visit('users/sign_in');
    cy.createUserWithResearchPlan();
    cy.login('cu1', 'user_password');
    cy.get('#tree-id-Col1').click();
    cy.visit('/mydb/collection/3');
    cy.get('#tabList-tab-4 > span').click();
    cy.get('[width="280px"] > :nth-child(1) > .preview-table').click();
    cy.get('[style="margin: 5px 0px 5px 5px;"] > .btn').click();
    cy.get('.col-lg-8 > .form-group > .form-control').first().clear().type('My Research Plan 2');
    cy.get('.btn-toolbar > .btn-warning').click();
    cy.contains('My Research Plan 2');
    cy.get('#tabList-tab-4 > span').contains('1(0)');
  });
});
