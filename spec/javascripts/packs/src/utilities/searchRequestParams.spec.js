import expect from 'expect';
import { listFilterParams, byIdsModelParams } from 'src/utilities/searchRequestParams';

describe('searchRequestParams', () => {
  describe('listFilterParams', () => {
    it('is empty when no chip is active', () => {
      expect(listFilterParams({ filterCreatedAt: true, productOnly: false })).toEqual({});
    });

    it('sends dates as unix seconds next to the label and product only flags', () => {
      const from = new Date(2025, 8, 20);
      expect(listFilterParams({
        filterCreatedAt: false, fromDate: from, toDate: null, userLabel: 7, productOnly: true,
      })).toEqual({
        filter_created_at: false,
        from_date: Math.floor(from.getTime() / 1000),
        to_date: null,
        user_label: 7,
        product_only: true,
      });
    });
  });

  describe('byIdsModelParams', () => {
    [
      ['sample', 'sample'],
      ['reaction', 'reaction'],
      ['wellplate', 'wellplate'],
      ['screen', 'screen'],
      ['research_plan', 'research_plan'],
      ['cell_line', 'cell_lines'],
      ['device_description', 'device_description'],
      ['sequence_based_macromolecule_sample', 'sequence_based_macromolecule_sample'],
    ].forEach(([type, modelName]) => {
      it(`sends ${type} as ${modelName}`, () => {
        expect(byIdsModelParams(type)).toEqual({ model_name: modelName });
      });
    });

    it('sends a generic klass as an element and names the klass', () => {
      expect(byIdsModelParams('mixture')).toEqual({ model_name: 'element', element_klass: 'mixture' });
    });
  });
});
