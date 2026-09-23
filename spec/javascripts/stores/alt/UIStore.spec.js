import expect from 'expect';
import sinon from 'sinon';
import { twoSampleState } from '../../fixture/elementStore';
import alt from 'src/stores/alt/alt';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';

const ElementStore = alt.createStore({}, 'ElementStore');

describe('UItStore', () => {
  beforeEach(() => {
    alt.flush();
    // ElementStore.dispathToken = alt.dispatcher.register(ElementStore.getState);
    ElementStore.getState = () => twoSampleState;
  });

  it('should handleCheckAllElements', () => {
    const payload = {
      type: 'sample',
      range: 'all'
    };
    const { sample } = UIStore.getState();
    const previousCheckedAll = sample.checkedAll;
    UIActions.checkAllElements(payload);
    const newCheckedAll = UIStore.getState().sample.checkedAll;
    expect(previousCheckedAll).toEqual(false);
    expect(newCheckedAll).toEqual(true);
  });

  describe('with an active search selection', () => {
    const collection = { id: 42 };
    let searchFetch;
    let collectionFetch;

    beforeEach(() => {
      searchFetch = sinon.stub(ElementActions.fetchBasedOnSearchSelectionAndCollection, 'defer');
      collectionFetch = sinon.stub(ElementActions, 'fetchSamplesByCollectionId');
      UIActions.selectCollectionWithoutUpdating(collection);
      UIActions.setSearchSelection({ search_by_method: 'cas', name: '7664-41-7' });
      UIStore.getState().sample.page = 3;
    });

    afterEach(() => {
      searchFetch.restore();
      collectionFetch.restore();
      UIActions.clearSearchSelection();
      UIActions.setUserLabel(null);
    });

    it('re-runs the search when a user label is applied', () => {
      UIActions.setUserLabel(7);

      expect(searchFetch.callCount).toEqual(1);
      expect(collectionFetch.callCount).toEqual(0);
      expect(searchFetch.firstCall.args[0].collectionId).toEqual(collection.id);
      expect(UIStore.getState().currentSearchSelection.search_by_method).toEqual('cas');
    });

    it('resets pagination so the new result set starts at page 1', () => {
      UIActions.setUserLabel(7);

      expect(searchFetch.firstCall.args[0].page).toEqual(1);
      expect(UIStore.getState().sample.page).toEqual(1);
    });

    describe('when a search modal result is adopted afterwards', () => {
      beforeEach(() => {
        UIActions.setSearchById({ sample: { ids: [1, 2], page: 1 } });
      });

      afterEach(() => {
        UIActions.clearSearchById();
      });

      it('drops the quick search selection', () => {
        expect(UIStore.getState().currentSearchSelection).toEqual(null);
      });

      it('does not re-run the quick search when a user label is applied', () => {
        UIActions.setUserLabel(7);

        expect(searchFetch.callCount).toEqual(0);
      });

      it('falls back to the collection listing once the result is removed', () => {
        UIActions.clearSearchById();
        UIActions.selectCollection(collection);

        expect(searchFetch.callCount).toEqual(0);
      });
    });
  });
});
