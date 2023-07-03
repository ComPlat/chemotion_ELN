import expect from 'expect';
import moment from 'moment';
import formatDate from 'src/utilities/timezoneHelper';

describe('formatDate', () => {
  it('formats a date string into a local date string', () => {
    const testDateString = '01.01.2023, 00:00:00 +00:00';
    const expectedFormattedDate = moment(testDateString, 'DD.MM.YYYY, HH:mm:ss Z').local().format('LLLL');

    const actualFormattedDate = formatDate(testDateString);

    expect(actualFormattedDate).toEqual(expectedFormattedDate);
  });
});
