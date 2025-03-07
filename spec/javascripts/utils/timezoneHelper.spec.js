import expect from 'expect';
import moment from 'moment';
import {
  elnTimestampFormat,
  parseDate,
  formatDate,
  formatTimeStampsOfElement
} from '@src/utilities/timezoneHelper';

describe('parseDate', () => {
  it('should return a valid moment instance when date is iso8601', () => {
    const testDateString = '2023-07-03T07:53:37.123+0000';
    const parsedDate = parseDate(testDateString);
    expect(parsedDate.isValid()).toEqual(true);
  });

  it('should return a valid moment instance when date is not iso8601', () => {
    const testDateString = '03.07.2023, 07:53:37 +0000';
    const parsedDate = parseDate(testDateString);
    expect(parsedDate.isValid()).toEqual(true);
  });
});

describe('formatDate', () => {
  it('should correctly format the date', () => {
    const testDate = moment().format(elnTimestampFormat);
    const expectedOutput = moment(testDate, elnTimestampFormat).local().format('llll');
    const actualOutput = formatDate(testDate);

    expect(actualOutput).toEqual(expectedOutput);
  });
});

describe('formatTimeStampsOfElement', () => {
  it('should correctly format the timestamps of an element', () => {
    const testElement = {
      created_at: moment().format(elnTimestampFormat),
      updated_at: moment().format(elnTimestampFormat),
    };
    const expectedOutput = `Created ${moment(testElement.created_at, elnTimestampFormat).local().format('llll')} - Updated ${moment(testElement.updated_at, elnTimestampFormat).local().format('llll')}`;
    const actualOutput = formatTimeStampsOfElement(testElement);

    expect(actualOutput).toEqual(expectedOutput);
  });
});
