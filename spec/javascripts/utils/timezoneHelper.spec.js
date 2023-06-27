import expect from 'expect';
import moment from 'moment';
import formatDate from 'src/utilities/timezoneHelper';

describe('formatDate', () => {
  it('should correctly format the date', () => {
    const testDate = moment().format('DD.MM.YYYY, HH:mm Z');
    const expectedOutput = moment(testDate, 'DD.MM.YYYY, HH:mm Z').local().format('LLLL');
    const actualOutput = formatDate(testDate);

    expect(actualOutput).toEqual(expectedOutput);
  });
});
