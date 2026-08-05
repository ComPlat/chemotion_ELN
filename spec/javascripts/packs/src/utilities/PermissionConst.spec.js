import { describe, it } from 'mocha';
import expect from 'expect';

import { PermissionConst } from 'src/utilities/PermissionConst';

// PermissionConst mirrors CollectionShare::PERMISSION_LEVELS (app/models/collection_share.rb).
// The two silently drifted apart once before — the frontend kept the pre-#2783 scale and went on
// posting a permission level the backend had left undefined. Pin the values so that can't recur.
describe('PermissionConst', () => {
  it('matches the backend ladder exactly', () => {
    expect(PermissionConst).toEqual({
      ReadElements: 0,
      EditElements: 1,
      AddElements: 2,
      RemoveElements: 3,
      ManageShares: 4,
      PassOwnership: 5,
    });
  });

  it('is a gapless, strictly ascending ordinal starting at zero', () => {
    const levels = Object.values(PermissionConst);

    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(levels).toEqual(levels.map((_, index) => index));
  });
});
