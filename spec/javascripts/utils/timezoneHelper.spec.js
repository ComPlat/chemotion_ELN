import expect from 'expect';
import formatDate from 'src/utilities/timezoneHelper';

describe('formatDate', () => {
  it('should correctly format the date', () => {
    const input = '23.06.2023, 12:00:00';
    const expectedOutput = 'Friday, June 23, 2023 at 12:00 PM';

    const result = formatDate(input);

    expect(result).toEqual(expectedOutput);
  });

  it('should handle different date formats', () => {
    const input = '01.01.2023, 23:59:59';
    const expectedOutput = 'Sunday, January 1, 2023 at 11:59 PM';

    const result = formatDate(input);

    expect(result).toEqual(expectedOutput);
  });

  it('should return the correct date and time with timezone offset applied', () => {
    const dateString = '23.06.2023, 12:00:00';

    // apply formatDate to the date string
    const actualDate = formatDate(dateString);

    // calculate the expected date
    const testDate = new Date('2023-06-23T12:34:56');
    const timeZoneOffset = testDate.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timeZoneOffset / 60));
    const offsetMinutes = Math.abs(timeZoneOffset) % 60;
    testDate.setHours(
      testDate.getHours()
      + (timeZoneOffset < 0 ? offsetHours : -offsetHours)
    );
    testDate.setMinutes(
      testDate.getMinutes()
      + (timeZoneOffset < 0 ? offsetMinutes : -offsetMinutes)
    );
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const expectedDate = dateFormatter.format(testDate);

    expect(actualDate).toEqual(expectedDate);
  });
});
