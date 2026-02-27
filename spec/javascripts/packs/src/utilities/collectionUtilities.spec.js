// eslint-disable-next-line import/no-unresolved
import { collectionHasPermission } from 'src/utilities/collectionUtilities';
import expect from 'expect';
import {
  describe, it
} from 'mocha';

function createCollectionDummy(collectionShareId = undefined, permissionLevel = 0) {
  const currentCollection = {};
  if (collectionShareId !== undefined) {
    currentCollection.collection_share_id = collectionShareId;
    currentCollection.permission_level = permissionLevel;
  }
  return currentCollection;
}

describe('collectionUtilities', () => {
  describe('.collectionHasPermission', () => {
    describe('when own collection', () => {
      it('has permissions', () => {
        expect(collectionHasPermission(createCollectionDummy())).toBe(true);
      });
    });
    describe('when collection is shared with me', () => {
      it('has no permissions', () => {
        expect(collectionHasPermission(createCollectionDummy(2, 0), 1)).toBe(false);
      });
    });
  });
});
