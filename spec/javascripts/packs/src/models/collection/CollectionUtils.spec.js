// eslint-disable-next-line import/no-unresolved
import CollectionUtils from '@src/models/collection/CollectionUtils';
import expect from 'expect';
import {
  describe, it
} from 'mocha';

function createCollectionDummy(permissionLevel = 0) {
  const currentCollection = {};
  currentCollection.is_shared = false;
  currentCollection.shared_by_id = 1;
  currentCollection.permission_level = permissionLevel;
  return currentCollection;
}

describe('CollectionUtils', () => {
  const userId = 1;

  describe('.isReadOnly', () => {
    describe(' when read-only collection is neither shared not synced', () => {
      it('readOnly is false', () => {
        expect(CollectionUtils.isReadOnly(createCollectionDummy(), userId, false)).toBe(false);
      });
    });

    describe(' when read-only collection is shared, user is owner', () => {
      const currentCollection = createCollectionDummy();
      currentCollection.is_shared = true;
      it('readOnly is false', () => {
        expect(CollectionUtils.isReadOnly(currentCollection, userId, false)).toBe(false);
      });
    });
    describe(' when read-only collection is shared, user is not owner', () => {
      const currentCollection = createCollectionDummy();
      currentCollection.is_shared = true;
      currentCollection.shared_by_id = 2;
      it('readOnly is true', () => {
        expect(CollectionUtils.isReadOnly(currentCollection, userId, false)).toBe(true);
      });
    });
    describe(' when read-only collection is synced, user is owner', () => {
      it('readOnly is false', () => {
        expect(CollectionUtils.isReadOnly(createCollectionDummy(), userId, true)).toBe(false);
      });
    });
    describe(' when read-only collection is synced, user is not owner', () => {
      const currentCollection = createCollectionDummy();
      currentCollection.shared_by_id = 2;
      it('readOnly is true', () => {
        expect(CollectionUtils.isReadOnly(currentCollection, userId, true)).toBe(true);
      });
    });
    describe(' when writeable collection is neither shared not synced', () => {
      const currentCollection = createCollectionDummy(1);
      it('readOnly is false', () => {
        expect(CollectionUtils.isReadOnly(currentCollection, userId, false)).toBe(false);
      });
    });

    describe(' when writeable collection is shared, user is owner', () => {
      const currentCollection = createCollectionDummy(1);
      currentCollection.is_shared = true;
      it('readOnly is false', () => {
        expect(CollectionUtils.isReadOnly(currentCollection, userId, false)).toBe(false);
      });
    });
    describe(' when writeable collection is shared, user is not owner', () => {
      const currentCollection = createCollectionDummy(1);
      currentCollection.is_shared = true;
      currentCollection.shared_by_id = 2;
      it('readOnly is false', () => {
        expect(CollectionUtils.isReadOnly(currentCollection, userId, false)).toBe(false);
      });
    });
    describe(' when writeable collection is synced, user is owner', () => {
      const currentCollection = createCollectionDummy(1);
      it('readOnly is false', () => {
        expect(CollectionUtils.isReadOnly(currentCollection, userId, true)).toBe(false);
      });
    });
    describe(' when writeable collection is synced, user is not owner', () => {
      const currentCollection = createCollectionDummy(1);
      currentCollection.shared_by_id = 2;
      it('readOnly is false', () => {
        expect(CollectionUtils.isReadOnly(currentCollection, userId, true)).toBe(false);
      });
    });
  });
});
