import expect from 'expect';
import sinon from 'sinon';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import { adoptSearchResult } from 'src/components/searchModal/forms/SearchResult';

describe('adoptSearchResult', () => {
  const collection = { id: 42 };
  const modalResult = () => ({
    samples: {
      elements: [{ id: 1 }, { id: 2 }], ids: [1, 2], page: 1, pages: 1, perPage: 15, totalElements: 2
    },
    reactions: {
      elements: [{ id: 3 }], ids: [3], page: 1, pages: 1, perPage: 15, totalElements: 1
    },
  });
  let stubs;
  let uiState;

  beforeEach(() => {
    uiState = { currentCollection: collection, userLabel: null, productOnly: false };
    stubs = {
      getState: sinon.stub(UIStore, 'getState').callsFake(() => uiState),
      setSearchById: sinon.stub(UIActions, 'setSearchById'),
      selectCollection: sinon.stub(UIActions, 'selectCollection'),
      changeSorting: sinon.stub(ElementActions, 'changeSorting'),
      dispatch: sinon.stub(ElementActions, 'dispatchSearchResult'),
    };
  });

  afterEach(() => {
    Object.values(stubs).forEach((stub) => stub.restore());
  });

  const dispatchedRows = () => stubs.dispatch.getCalls()
    .flatMap((call) => Object.values(call.args[0]).flatMap((list) => list.elements));

  context('when a list filter chip is active', () => {
    beforeEach(() => {
      uiState.userLabel = 7;
      adoptSearchResult(modalResult());
    });

    it('never puts the unfiltered rows into the list', () => {
      expect(dispatchedRows()).toEqual([]);
    });

    it('empties every adopted list until the refetch fills it', () => {
      const placeholder = stubs.dispatch.lastCall.args[0];
      expect(placeholder.samples.totalElements).toEqual(0);
      expect(placeholder.reactions.totalElements).toEqual(0);
    });

    it('keeps the full ids for the filtered refetch', () => {
      expect(stubs.setSearchById.firstCall.args[0].samples.ids).toEqual([1, 2]);
      expect(stubs.selectCollection.calledOnceWith(collection)).toEqual(true);
    });
  });

  context('when product only is the only active chip', () => {
    it('still waits for the refetch', () => {
      uiState.productOnly = true;
      adoptSearchResult(modalResult());

      expect(dispatchedRows()).toEqual([]);
      expect(stubs.selectCollection.callCount).toEqual(1);
    });
  });

  context('when no list filter chip is active', () => {
    it('shows the modal result as it is, without a refetch', () => {
      adoptSearchResult(modalResult());

      expect(dispatchedRows().map((row) => row.id)).toEqual([1, 2, 3]);
      expect(stubs.selectCollection.callCount).toEqual(0);
    });
  });
});
