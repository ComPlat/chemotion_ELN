import SearchFetcher from 'src/fetchers/SearchFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import expect from 'expect';
import sinon from 'sinon';

describe('SearchFetcher with an active My Labels filter', () => {
  let fetchStub;
  let uiStateStub;

  const sentSelection = () => JSON.parse(fetchStub.firstCall.args[1].body).selection;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({}), { status: 200 }));
    uiStateStub = sinon.stub(UIStore, 'getState').returns({
      userLabel: 7, fromDate: null, toDate: null, productOnly: false, filterCreatedAt: true,
    });
  });

  afterEach(() => {
    fetchStub.restore();
    uiStateStub.restore();
  });

  it('adds the label to a new search', async () => {
    await SearchFetcher.fetchBasedOnSearchSelectionAndCollection({
      selection: { elementType: 'advanced', page_size: 15 },
      collectionId: 1,
    });

    expect(sentSelection().list_filter_params.user_label).toEqual(7);
  });

  it('sends the search modal query unfiltered so its adopted ids stay complete', async () => {
    await SearchFetcher.fetchBasedOnSearchSelectionAndCollection({
      selection: { elementType: 'advanced', page_size: 15 },
      collectionId: 1,
      applyListFilters: false,
    });

    expect(sentSelection().list_filter_params).toEqual(undefined);
  });

  it('leaves the list filters of a by-ids page request to the caller', async () => {
    await SearchFetcher.fetchBasedOnSearchResultIds({
      selection: { elementType: 'by_ids', list_filter_params: {}, page_size: 15 },
      collectionId: 1,
      page: 2,
    });

    expect(sentSelection().list_filter_params).toEqual({});
  });
});
