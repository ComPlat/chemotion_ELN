import expect from 'expect';
import { describe, it } from 'mocha';

import { keepSupSub } from '../../../app/assets/javascripts/components/utils/quillFormat';

describe('keepSupSub', () => {
  it('does nothing special if empty ops', () => {
    const originalDelta = { ops: [{ insert: '' }] };
    const result = keepSupSub(originalDelta);
    const expected = [{ insert: '' }];
    expect(result).toEqual(expected);
  });

  it('does nothing special if one ops', () => {
    const originalDelta = {
      ops: [{
        insert: "MS (EI m/z, 70 eV, 40 °C): 181 (13) (ref-gas), 167 [M]+ (10), 140 (17), 131 (14), 123 (100), 120 (14), 104 (15), 82 (40), 69 (48), 54 (12). - HRMS (C5H4O2NF3): calc.: 167.0194; found: 167.0195.\n"
      }]
    };
    const result = keepSupSub(originalDelta);
    const expected = [{
      insert: "MS (EI m/z, 70 eV, 40 °C): 181 (13) (ref-gas), 167 [M]+ (10), 140 (17), 131 (14), 123 (100), 120 (14), 104 (15), 82 (40), 69 (48), 54 (12). - HRMS (C5H4O2NF3): calc.: 167.0194; found: 167.0195.\n"
    }];
    expect(result).toEqual(expected);
  });

  it('does nothing special if multiple ops', () => {
    const originalDelta = {
      ops: [
        { insert: "EI (m/z, 70 eV, 110 °C): 258 (9) [M]"},
        {
          attributes: {"script":"super"},
          insert:"+"
        },
        {
          insert: ", 240 (13), 225 (25), 224 (25), 223 (100), 200 (13), 199 (19), 198 (12), 196 (16), 195 (18), 183 (13), 182 (19), 154 (14), 141 (13), 115 (16), 106 (21), 77 (16), 65 (22). HRMS (C"
        },
        {
          attributes: { script: "sub" },
          insert: "14"
        },
        { insert: "H" },
        {
          attributes: { script: "sub" },
          insert: "14"
        },
        { insert: "O" },
        {
          attributes: { script: "sub" },
          insert: "3"
        },
        { insert: "N" },
        {
          attributes: {"script":"sub"},
          insert:"2"
        },
        {insert: "): calc. 258.1004, found 258.1006.  "}
      ]
    };
    const result = keepSupSub(originalDelta);
    const expected = [
      { insert: "EI (m/z, 70 eV, 110 °C): 258 (9) [M]" },
      {
        attributes: { script: "super" },
        insert: "+"
      },
      {
        insert: ", 240 (13), 225 (25), 224 (25), 223 (100), 200 (13), 199 (19), 198 (12), 196 (16), 195 (18), 183 (13), 182 (19), 154 (14), 141 (13), 115 (16), 106 (21), 77 (16), 65 (22). HRMS (C"
      },
      {
        attributes: { script: "sub" },
        insert: "14"
      },
      { insert: "H" },
      {
        attributes: { script: "sub" },
        insert: "14"
      },
      { insert: "O" },
      {
        attributes: { script: "sub" },
        insert: "3"
      },
      { insert: "N" },
      {
        attributes: { script: "sub" },
        insert: "2"
      },
      {
        insert: "): calc. 258.1004, found 258.1006.  "
      }
    ];
    expect(result).toEqual(expected);
  });
});
