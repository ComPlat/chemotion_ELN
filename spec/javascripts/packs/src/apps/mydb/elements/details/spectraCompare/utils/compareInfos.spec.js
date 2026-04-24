import expect from 'expect';
import { describe, it } from 'mocha';

import { buildCompareInfos } from 'src/apps/mydb/elements/details/spectraCompare/utils/compareInfos';

describe('compareInfos.buildCompareInfos', () => {
  it('returns [] when sample is null', () => {
    expect(buildCompareInfos(null, {})).toEqual([]);
  });

  it('returns [] when container is null', () => {
    expect(buildCompareInfos({}, null)).toEqual([]);
  });

  it('returns [] when extended_metadata.analyses_compared is missing', () => {
    expect(buildCompareInfos({}, { extended_metadata: {} })).toEqual([]);
  });

  it('skips entries without file id', () => {
    const container = {
      extended_metadata: {
        analyses_compared: [
          { file: { id: 1 }, layout: 'a' },
          { file: {} },
          { file: { id: 2 }, layout: 'b' },
        ],
      },
    };
    expect(buildCompareInfos({}, container)).toEqual([
      { idx: 1, info: { file: { id: 1 }, layout: 'a' } },
      { idx: 2, info: { file: { id: 2 }, layout: 'b' } },
    ]);
  });
});
