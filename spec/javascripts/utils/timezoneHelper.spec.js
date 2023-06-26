import expect from 'expect';
import moment from 'moment';
import formatDate from 'src/utilities/timezoneHelper';

describe('formatDate', () => {
  it('should correctly parse and format the date string', () => {
    const input = '23.06.2023, 11:00';

    const expectedOutput = moment(input, 'DD.MM.YYYY, HH:mm').local().format('LLLL');

    const result = formatDate(input);

    expect(result).toEqual(expectedOutput);
  });
});
