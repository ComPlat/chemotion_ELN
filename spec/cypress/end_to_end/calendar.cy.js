function getMonthNames() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
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

describe('Calendar', () => {
  beforeEach(() => {
    cy.createDefaultUser('cu1@complat.edu', 'cu1');
    cy.visit('users/sign_in');
    cy.login('cu1', 'user_password');
    cy.contains('Calendar').click();
    cy.get('div[data-type="calendar-modal"]').as('calendarModal');
  });

  it('opens and closes Calendar with close button', () => {
    cy.get('button[class="btn-close"]').click();
    cy.get('@calendarModal').should('not.exist');
  });

  it('opens and closes Calendar when click on background', () => {
    cy.get('.modal-backdrop').click('topLeft', { force: true });
    cy.get('@calendarModal').should('not.exist');
  });

  it('checks Today/Back/Next month', () => {
    const { previousMonth, currentMonth, nextMonth } = getMonthNames();

    cy.contains('Month').click();
    cy.contains('Today').click();
    cy.contains(currentMonth);

    cy.contains('Back').click();
    cy.contains(previousMonth);

    const nextButton = cy.contains('Next');
    nextButton.click();
    nextButton.click();
    cy.contains(nextMonth);
  });
});
