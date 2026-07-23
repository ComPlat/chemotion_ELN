// eslint-disable-next-line import/no-unresolved
import { collectionHasPermission, filterParamsFromUIState } from 'src/utilities/collectionUtilities';
import { List } from 'immutable';
import expect from 'expect';
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

  describe('.filterParamsFromUIState', () => {
    const selection = (checkedIds) => ({
      checkedAll: false,
      checkedIds: List(checkedIds),
      uncheckedIds: List(),
    });

    it('includes built-in element selections', () => {
      const uiState = {
        currentCollection: { id: 1 },
        sample: selection([7]),
      };

      const params = filterParamsFromUIState(uiState);

      expect(params.sample).toEqual({
        all: false, included_ids: List([7]), excluded_ids: List(), collection_id: 1,
      });
    });

    // Regression: generic (labimotion) klass selections must be collected synchronously from
    // uiState.klasses. They were previously added inside an un-awaited promise callback that
    // resolved after the function returned, so they were silently dropped from the payload.
    it('includes generic element selections synchronously', () => {
      const uiState = {
        currentCollection: { id: 1 },
        klasses: ['my_generic'],
        my_generic: selection([42]),
      };

      const params = filterParamsFromUIState(uiState);

      expect(params.my_generic).toEqual({
        all: false, included_ids: List([42]), excluded_ids: List(), collection_id: 1,
      });
    });

    it('omits generic types with an empty selection', () => {
      const uiState = {
        currentCollection: { id: 1 },
        klasses: ['my_generic'],
        my_generic: selection([]),
      };

      const params = filterParamsFromUIState(uiState);

      expect(params.my_generic).toBe(undefined);
    });
  });
});
