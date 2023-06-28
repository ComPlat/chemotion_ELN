import expect from 'expect';
import moment from 'moment';
import formatDate from 'src/utilities/timezoneHelper';

describe('formatDate', () => {
  it('should correctly format the date', () => {
    const testDate = moment.utc().subtract(2, 'hours').format('DD.MM.YYYY, HH:mm');
    const expectedOutput = moment.utc(testDate, 'DD.MM.YYYY, HH:mm').local().format('LLLL');
    const actualOutput = formatDate(testDate);

    expect(actualOutput).toEqual(expectedOutput);
  });
});
