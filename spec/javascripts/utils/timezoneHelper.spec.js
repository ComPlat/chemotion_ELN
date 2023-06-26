import expect from 'expect';
import moment from 'moment';
import formatDate from 'src/utilities/timezoneHelper';

describe('formatDate', () => {
  it('should correctly parse and format the date string', () => {
    let input = '23.06.2023, 11:00';

    // subtracting 2 hours from the input time to match the testing environment UTC+2 timezone
    const inputDate = moment.utc(input, 'DD.MM.YYYY, HH:mm').subtract(2, 'hours');

    input = inputDate.format('DD.MM.YYYY, HH:mm');

    const expectedOutput = inputDate.local().format('LLLL');

    const result = formatDate(input);

    expect(result).toEqual(expectedOutput);
  });
});
