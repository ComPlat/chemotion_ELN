import expect from 'expect';
import { List } from 'immutable';
import sinon from 'sinon';
import {
  buildPrintCodeUrls,
  fetchCollectionIds,
  getPrintableSelections,
  resolvePrintableSelections,
} from 'src/apps/mydb/elements/list/selectionActions/PrintCodeUtils';

const buildUIState = (overrides = {}) => ({
  sample: { checkedIds: List(), uncheckedIds: List(), checkedAll: false },
  reaction: { checkedIds: List(), uncheckedIds: List(), checkedAll: false },
  wellplate: { checkedIds: List(), uncheckedIds: List(), checkedAll: false },
  screen: { checkedIds: List(), uncheckedIds: List(), checkedAll: false },
  device_description: { checkedIds: List(), uncheckedIds: List(), checkedAll: false },
  sequence_based_macromolecule_sample: {
    checkedIds: List(), uncheckedIds: List(), checkedAll: false
  },
  research_plan: { checkedIds: List([99]) },
  ...overrides,
});

describe('SelectionGenerateButton', () => {
  it('tracks selected reactions and other printable element types', () => {
    const selections = getPrintableSelections(buildUIState({
      reaction: { checkedIds: List([17]), uncheckedIds: List(), checkedAll: false },
      sample: { checkedIds: List([3]), uncheckedIds: List(), checkedAll: false },
    }));

    expect(selections).toMatchObject({
      reaction: { checkedIds: List([17]), checkedAll: false },
      sample: { checkedIds: List([3]), checkedAll: false },
    });
    expect(selections.research_plan).toBe(undefined);
  });

  it('resolves search selections against scoped IDs and excludes unchecked records', async () => {
    const uiState = buildUIState({
      currentSearchByID: { reactions: { ids: [17, 18, 19] } },
      reaction: {
        checkedIds: List(),
        uncheckedIds: List([18]),
        checkedAll: true,
      },
    });
    const selections = await resolvePrintableSelections(
      getPrintableSelections(uiState),
      uiState,
      { elements: { reactions: { ids: [17, 18, 19] } } },
    );

    expect(selections.reaction).toEqual([17, 19]);
    expect(buildPrintCodeUrls(selections, { code_type: 'qr_code' })).toEqual([
      '/api/v1/code_logs/print_codes?element_type=reaction&ids%5B%5D=17%2C19&code_type=qr_code',
    ]);
  });

  it('loads all pages from the current collection for checked-all selections', async () => {
    const fetchPage = sinon.stub();
    fetchPage.onCall(0).resolves({ elements: [{ id: 17 }], pages: 2 });
    fetchPage.onCall(1).resolves({ elements: [{ id: 18 }], pages: 2 });
    const uiState = buildUIState({
      currentCollection: { id: 5 },
      reaction: {
        checkedIds: List(),
        uncheckedIds: List([18]),
        checkedAll: true,
      },
    });

    const scopeIds = await fetchCollectionIds(fetchPage, 5, { perPage: 100 }, {});
    const selections = await resolvePrintableSelections(
      getPrintableSelections(uiState),
      uiState,
      {},
      async () => scopeIds,
    );

    expect(selections.reaction).toEqual([17]);
    expect(fetchPage.getCall(0).args[1].page).toBe(1);
    expect(fetchPage.getCall(1).args[1].page).toBe(2);
  });

  it('builds one PDF-fetcher URL per selected element type', () => {
    const uiState = buildUIState({
      sample: { checkedIds: List([3]) },
      reaction: { checkedIds: List([17, 18]) },
    });
    const selections = {
      sample: uiState.sample.checkedIds,
      reaction: uiState.reaction.checkedIds,
    };
    const urls = buildPrintCodeUrls(selections, {
      code_type: 'qr_code',
      width: 100,
      displaySample: true,
    });
    expect(urls).toEqual([
      '/api/v1/code_logs/print_codes?element_type=sample&ids%5B%5D=3&code_type=qr_code&width=100&displaySample=true',
      '/api/v1/code_logs/print_codes?element_type=reaction&ids%5B%5D=17%2C18&code_type=qr_code&width=100&displaySample=true',
    ]);
  });
});
