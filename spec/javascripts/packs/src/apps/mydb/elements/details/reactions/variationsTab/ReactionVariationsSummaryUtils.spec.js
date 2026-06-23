import expect from 'expect';
import { describe, it } from 'mocha';
import {
  collectSummaryGroups,
  getColumns,
  formatCell,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsSummaryUtils';

// A reaction container tree carrying two "Statistical Analysis" analyses and one
// unrelated analysis. Mirrors the shape the API serves: root.children -> analyses
// -> analysis -> dataset -> attachments.
const buildContainer = () => ({
  children: [
    {
      container_type: 'analyses',
      children: [
        {
          container_type: 'analysis',
          id: 'a1',
          name: 'Statistical Analysis',
          children: [
            {
              container_type: 'dataset',
              attachments: [
                { id: 1, filename: 'variations_summary.json' },
                { id: 2, filename: 'variations_plot_1.png' },
                { id: 3, filename: 'statistical_analysis.xlsx' },
              ],
            },
          ],
        },
        {
          container_type: 'analysis',
          id: 'a2',
          name: 'Some Other Analysis',
          children: [
            { container_type: 'dataset', attachments: [{ id: 4, filename: 'variations_summary.json' }] },
          ],
        },
        {
          container_type: 'analysis',
          id: 'a3',
          name: 'Statistical Analysis',
          children: [
            { container_type: 'dataset', attachments: [{ id: 5, filename: 'statistical_analysis.xlsx' }] },
          ],
        },
      ],
    },
  ],
});

describe('ReactionVariationsSummary helpers', () => {
  describe('collectSummaryGroups', () => {
    it('keeps only analyses named "Statistical Analysis"', () => {
      const groups = collectSummaryGroups(buildContainer());
      expect(groups.map((group) => group.analysisId)).toEqual(['a1']);
    });

    it('splits dataset attachments into summary json and png plots', () => {
      const [group] = collectSummaryGroups(buildContainer());
      expect(group.attachments.map((attachment) => attachment.id)).toEqual([1]);
      expect(group.plots.map((attachment) => attachment.id)).toEqual([2]);
    });

    it('drops groups that have neither a summary nor a plot', () => {
      // a3 only carries an .xlsx, so it must not appear.
      const groups = collectSummaryGroups(buildContainer());
      expect(groups.some((group) => group.analysisId === 'a3')).toBe(false);
    });

    it('returns an empty array for a missing container', () => {
      expect(collectSummaryGroups(null)).toEqual([]);
      expect(collectSummaryGroups(undefined)).toEqual([]);
    });
  });

  describe('getColumns', () => {
    it('returns the order-preserving union of row keys', () => {
      expect(getColumns([{ a: 1, b: 2 }, { b: 3, c: 4 }])).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array for no rows', () => {
      expect(getColumns([])).toEqual([]);
    });
  });

  describe('formatCell', () => {
    it('renders blank values as a dash', () => {
      expect(formatCell(null)).toEqual('-');
      expect(formatCell(undefined)).toEqual('-');
      expect(formatCell('')).toEqual('-');
    });

    it('stringifies non-blank values, including falsy ones', () => {
      expect(formatCell(0)).toEqual('0');
      expect(formatCell(false)).toEqual('false');
      expect(formatCell(1.5)).toEqual('1.5');
      expect(formatCell('text')).toEqual('text');
    });
  });
});
