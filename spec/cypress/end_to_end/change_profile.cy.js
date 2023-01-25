describe('Self describing test group name', () => {
  beforeEach(() => {
    cy.createDefaultUser(1, 'complat.user@complat.edu', 'CU');
    cy.visit('users/sign_in');
  });

  it('sets "Show external name" from false to true, and vice versa', () => {
    // add test code here
    cy.login('CU', 'user_password');
    cy.visit('pages/profiles');
    cy.get('#profile_show_external_name').should('not.be.checked');
    cy.get('#profile_show_external_name').check();
    // expect(john.reload.profile.show_external_name).to eq !bool_flag
    cy.get('.btn').last().click();
    cy.visit('pages/profiles');
    cy.get('#profile_show_external_name').should('be.checked');
  });
});
