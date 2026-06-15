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
    cy.login('a01', 'user_password');
  });

  it('open message box and acknowledge all messages', () => {
    cy.contains('Notifications').click();
    cy.contains('Unread (3)');
    cy.contains('Mark all as read').click();
    cy.contains('No new notifications');
  });

  it('open message box and acknowledge single message', () => {
    cy.contains('Notifications').click();
    cy.get('#notice-button-ack-1').click();
    cy.contains('Unread (2)');
  });
});
