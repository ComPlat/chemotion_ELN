function getMonthNames() {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();

  const prevMonth = (currentMonth === 0) ? 11 : currentMonth - 1;
  const nextMonth = (currentMonth === 11) ? 0 : currentMonth + 1;

  return {
    previousMonth: months[prevMonth],
    currentMonth: months[currentMonth],
    nextMonth: months[nextMonth]
  };
}


describe('Calendar specs', () => {
  beforeEach(() => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1');
    cy.visit('users/sign_in');
  });

  it('open and close Calendar with close button', () => {
    cy.login('cu1', 'user_password');

    cy.get('#navigationCalendarButton').click();
    cy.get('.modal-header > .btn-close').as('close');
    cy.get('@close').click();
  });

  it('open and close Calendar when click on background', () => {
    cy.login('cu1', 'user_password');
    cy.get('#navigationCalendarButton').click();
    cy.get('.rbc-toolbar > :nth-child(3) > :nth-child(1)').click();
    cy.get('#app').as('bg');
    cy.get('@bg').click({ force: true });
  });

  it('check Today/Back/Next month', () => {
    cy.login('cu1', 'user_password');
    cy.get('#navigationCalendarButton').click();

    const { previousMonth, currentMonth, nextMonth } = getMonthNames();

    cy.get('.rbc-toolbar > :nth-child(3) > :nth-child(1)').as('month');
    cy.get('@month').click();

    cy.get('.rbc-toolbar > :nth-child(1) > :nth-child(1)').as('today');
    cy.get('@today').click();
    cy.get('.rbc-toolbar-label').contains(currentMonth);

    cy.get('.rbc-toolbar > :nth-child(1) > :nth-child(2)').as('back');
    cy.get('@back').click();
    cy.get('.rbc-toolbar-label').contains(previousMonth);

    cy.get('.rbc-toolbar > :nth-child(1) > :nth-child(3)').as('next');
    cy.get('@next').click();
    cy.get('@next').click();
    cy.get('.rbc-toolbar-label').contains(nextMonth);
  });
});