describe('Message Box', () => {
  beforeEach(() => {
    cy.createDefaultAdmin().then((admin) => {
      cy.appFactories([['create', 'channel', { subject: 'System Upgrade', channel_type: 9 }]]).then((channel) => {
        cy.createDefaultUser().then((user) => {
          cy.createMessages(admin[0].id, channel[0].id, user[0].id);
        });
      });
    });
    cy.visit('users/sign_in');
  });

  it('check message box and acknowledge messages', () => {
    cy.login('a01', 'user_password');
    cy.get('.badge').contains('3');
  });

  it('open message box and acknowledge all messages', () => {
    cy.login('a01', 'user_password');
    cy.get('.badge').as('messages');
    cy.get('@messages').contains('3');
    cy.get('@messages').click();
    cy.get('#notice-button-ack-all').click();
    cy.get('.close > [aria-hidden="true"]').click();
  });

  it('open message box and acknowledge the message one by one', () => {
    cy.login('a01', 'user_password');
    cy.get('.badge').contains('3').click();
    cy.get('#notice-button-ack-1').click();
    cy.get('#notice-button-ack-2').click();
    cy.get('#notice-button-ack-3').click();
    cy.get('.close > [aria-hidden="true"]').click();
    cy.get('.badge').should('not.exist');
  });
});
