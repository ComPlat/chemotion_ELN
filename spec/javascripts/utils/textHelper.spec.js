import expect from 'expect';
import { capitalizeWords } from '@src/utilities/textHelper';

describe('capitalizeWords', () => {
  it('should capitalize the first letter of words in a string', () => {
    const testString = 'test_one';
    const expectedOutput = 'Test One';
    const actualOutput = capitalizeWords(testString);

    expect(actualOutput).toEqual(expectedOutput);
  });
  it('should return an empty string if the input is null', () => {
    const testString = null;
    const expectedOutput = '';
    const actualOutput = capitalizeWords(testString);

    expect(actualOutput).toEqual(expectedOutput);
  });
  it('should return an empty string if the input is undefined', () => {
    const testString = undefined;
    const expectedOutput = '';
    const actualOutput = capitalizeWords(testString);

    expect(actualOutput).toEqual(expectedOutput);
  });
  it('should replace _ and multiple blank characters with a white space', () => {
    const testString = '\u00A0test__one two \n  three';
    const expectedOutput = 'Test One Two Three';
    const actualOutput = capitalizeWords(testString);

    expect(actualOutput).toEqual(expectedOutput);
  });
});
