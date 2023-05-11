describe('Change Profile', () => {
  it('sets "Show external name" from false to true, and vice versa', () => {
    cy.createDefaultUser('complat.user@complat.edu', 'CU');
    cy.visit('users/sign_in');
    cy.login('CU', 'user_password');
    cy.visit('pages/profiles');
    cy.get('#profile_show_external_name').should('not.be.checked');
    cy.get('#profile_show_external_name').check();
    cy.get('.btn').last().click();
    cy.visit('pages/profiles');
    cy.get('#profile_show_external_name').should('be.checked');
  });
});
