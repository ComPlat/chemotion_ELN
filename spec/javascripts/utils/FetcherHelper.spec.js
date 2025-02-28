import expect from 'expect';
import { describe, it } from 'mocha';
import base64 from 'base-64';

import {
    parseBase64ToArrayBuffer
} from '@src/utilities/FetcherHelper';

describe('parseBase64ToArrayBuffer', () => {
  it('return array buffer', () => {
    const stringToTest = 'This is test';
    const originalByteArray = new TextEncoder().encode(stringToTest);
    const originalBuffer = originalByteArray.buffer;

    const encodedValue = base64.encode(stringToTest);
    const parsedBuffer = parseBase64ToArrayBuffer(encodedValue);
    expect(parsedBuffer).toEqual(originalBuffer);
  });
});
