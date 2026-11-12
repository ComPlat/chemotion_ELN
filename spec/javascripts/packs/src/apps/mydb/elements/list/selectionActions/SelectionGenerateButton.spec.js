import expect from 'expect';
import { List } from 'immutable';
import {
  buildPrintCodeUrls,
  getPrintableSelections,
} from 'src/apps/mydb/elements/list/selectionActions/PrintCodeUtils';

const buildUIState = (overrides = {}) => ({
  sample: { checkedIds: List() },
  reaction: { checkedIds: List() },
  wellplate: { checkedIds: List() },
  screen: { checkedIds: List() },
  device_description: { checkedIds: List() },
  sequence_based_macromolecule_sample: { checkedIds: List() },
  research_plan: { checkedIds: List([99]) },
  ...overrides,
});

describe('SelectionGenerateButton', () => {
  it('tracks selected reactions and other printable element types', () => {
    const selections = getPrintableSelections(buildUIState({
      reaction: { checkedIds: List([17]) },
      sample: { checkedIds: List([3]) },
    }));

    expect(selections).toMatchObject({
      reaction: List([17]),
      sample: List([3]),
    });
    expect(selections.research_plan).toBe(undefined);
  });

  it('builds a PDF-fetcher URL for each selected element type and ID', () => {
    const selections = getPrintableSelections(buildUIState({
      sample: { checkedIds: List([3]) },
      reaction: { checkedIds: List([17, 18]) },
    }));
    const urls = buildPrintCodeUrls(selections, {
      code_type: 'qr_code',
      width: 100,
      displaySample: true,
    });
    expect(urls).toEqual([
      '/api/v1/code_logs/print_codes?element_type=sample&ids%5B%5D=3&code_type=qr_code&width=100&displaySample=true',
      '/api/v1/code_logs/print_codes?element_type=reaction&ids%5B%5D=17&code_type=qr_code&width=100&displaySample=true',
      '/api/v1/code_logs/print_codes?element_type=reaction&ids%5B%5D=18&code_type=qr_code&width=100&displaySample=true',
    ]);
  });
});
