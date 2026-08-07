describe('Message Box', () => {
  beforeEach(() => {
    cy.createDefaultAdmin().then((admin) => {
      cy.appFactories([['create', 'channel', { subject: 'System Upgrade', channel_type: 9 }]]).then((channel) => {
        cy.createDefaultUser().then((user) => {
          cy.appFactories([['create', 'message', {
            channel_id: channel[0].id,
            content: { data: 'Thanks for using ELN!\nTo make our system better for you, we bring updates every Friday.' },
            created_by: admin[0].id
          }]]).then((message) => {
            cy.appFactories([['create', 'notification', { message_id: message[0].id, user_id: user[0].id }]]);
          });
          cy.appFactories([['create', 'message', {
            channel_id: channel[0].id,
            content: { data: 'Thanks for using ELN!\nWe have new features for you.' },
            created_by: admin[0].id
          }]]).then((message) => {
            cy.appFactories([['create', 'notification', { message_id: message[0].id, user_id: user[0].id }]]);
          });
          cy.appFactories([['create', 'message', {
            channel_id: channel[0].id,
            content: { data: 'Thanks for using ELN!\nHave a nice weekend.' },
            created_by: admin[0].id
          }]]).then((message) => {
            cy.appFactories([['create', 'notification', { message_id: message[0].id, user_id: user[0].id }]]);
          });
        });
      });
    });
    cy.visit('users/sign_in');
    cy.login('a01', 'user_password');
  });

  it('opens message box and acknowledges all messages', () => {
    cy.contains('Notifications').click();
    cy.contains('Unread (3)');
    cy.contains('Mark all as read').click();
    cy.contains('No new notifications');
  });

  it('opens message box and acknowledges single message', () => {
    cy.contains('Notifications').click();
    cy.get('#notice-button-ack-1').click();
    cy.contains('Unread (2)');
  });
});
