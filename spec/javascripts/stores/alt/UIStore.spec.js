import expect from 'expect';
import sinon from 'sinon';
import { twoSampleState } from '../../fixture/elementStore';
import alt from 'src/stores/alt/alt';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
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

  describe('with an adopted search result', () => {
    const collection = { id: 42 };
    let byIdsFetch;
    let userStub;

    beforeEach(() => {
      byIdsFetch = sinon.stub(ElementActions.fetchBasedOnSearchResultIds, 'defer');
      userStub = sinon.stub(UserStore, 'getState').returns({
        profile: { data: { layout: { sample: 1 } } },
      });
      UIActions.selectCollectionWithoutUpdating(collection);
      UIActions.setSearchById({
        samples: {
          ids: [1, 2, 3], totalElements: 3, page: 1, pages: 1, perPage: 15, elements: []
        },
      });
    });

    afterEach(() => {
      byIdsFetch.restore();
      userStub.restore();
      UIActions.clearSearchById();
      UIActions.setUserLabel(null);
      UIActions.setFromDate(null);
    });

    it('refetches the adopted ids when a label filter is removed again', () => {
      UIActions.setUserLabel(7);
      byIdsFetch.resetHistory();
      UIActions.setUserLabel(null);

      expect(byIdsFetch.callCount).toEqual(1);
      expect(byIdsFetch.firstCall.args[0].selection.list_filter_params).toEqual({});
    });

    it('asks for the adopted ids under their own model, not as generic elements', () => {
      UIActions.setUserLabel(7);

      const { id_params: idParams } = byIdsFetch.firstCall.args[0].selection;
      expect(idParams.model_name).toEqual('sample');
      expect(idParams.ids).toEqual([1, 2, 3]);
    });

    it('drops the quick search so it cannot shadow the adopted result', () => {
      expect(UIStore.getState().currentSearchSelection).toEqual(null);
    });

    it('sends a date filter as unix seconds, as the listing endpoints take it', () => {
      const from = new Date(2025, 8, 20);
      UIActions.setFromDate(from);

      const { list_filter_params: filters } = byIdsFetch.firstCall.args[0].selection;
      expect(filters.from_date).toEqual(Math.floor(from.getTime() / 1000));
      expect(filters.to_date).toEqual(null);
    });

    it('carries a label and a date filter together', () => {
      UIActions.setUserLabel(7);
      const from = new Date(2025, 8, 20);
      byIdsFetch.resetHistory();
      UIActions.setFromDate(from);

      const { list_filter_params: filters } = byIdsFetch.firstCall.args[0].selection;
      expect(filters.user_label).toEqual(7);
      expect(filters.from_date).toEqual(Math.floor(from.getTime() / 1000));
    });
  });
});
