import expect from 'expect';
import { describe, it } from 'mocha';

import {
  buildSelectionTree,
  filterMenuByLayout,
  limitMenuToSelection,
  resolveSelection,
  cleanLayoutLabel,
} from 'src/apps/mydb/elements/details/spectraCompare/utils/compareSelectionTree';

const buildSample = (containers = {}) => ({
  getAnalysisContainersComparable: () => containers,
});

describe('compareSelectionTree', () => {
  describe('cleanLayoutLabel', () => {
    it('strips "Type:" prefix', () => {
      expect(cleanLayoutLabel('Type: 1H NMR')).toEqual('1H NMR');
    });

    it('keeps the right-hand side of a pipe-delimited label', () => {
      expect(cleanLayoutLabel('CHMO:0000593 | 1H NMR')).toEqual('1H NMR');
    });

    it('returns null for "null" / "Not specified" / falsy values', () => {
      expect(cleanLayoutLabel(null)).toEqual(null);
      expect(cleanLayoutLabel('')).toEqual(null);
      expect(cleanLayoutLabel('Type: null')).toEqual(null);
      expect(cleanLayoutLabel('Type: Not specified')).toEqual(null);
    });
  });

  describe('buildSelectionTree', () => {
    it('returns empty when sample is null/undefined (B3 — no crash)', () => {
      expect(buildSelectionTree(null)).toEqual({ menuItems: [], selectedFiles: [] });
      expect(buildSelectionTree(undefined, undefined)).toEqual({ menuItems: [], selectedFiles: [] });
    });

    it('returns empty when sample lacks getAnalysisContainersComparable', () => {
      expect(buildSelectionTree({}, undefined)).toEqual({ menuItems: [], selectedFiles: [] });
    });

    it('does not crash when comparisonContainer is undefined', () => {
      const sample = buildSample({});
      expect(() => buildSelectionTree(sample, undefined)).not.toThrow();
    });

    it('builds a tree with one selectable spectrum', () => {
      const dataset = {
        id: 10,
        name: 'New',
        attachments: [
          { id: 100, filename: 'sample.peak.jdx' },
          { id: 101, filename: 'sample.raw.jdx' }, // filtered out
        ],
      };
      const analysis = {
        id: 5,
        name: 'A1',
        children: [dataset],
        comparable_info: { is_comparison: false },
      };
      const sample = buildSample({ '1H NMR': [analysis] });
      const { menuItems, selectedFiles } = buildSelectionTree(sample, null);
      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].title).toEqual('Type: 1H NMR');
      expect(selectedFiles).toEqual([]);
    });
  });

  describe('filterMenuByLayout', () => {
    it('disables items whose title differs from the selected one', () => {
      const items = [
        { title: 'Type: 1H NMR' },
        { title: 'Type: 13C NMR' },
      ];
      const filtered = filterMenuByLayout(items, 'Type: 1H NMR');
      expect(filtered[0].disabled).toBeFalsy();
      expect(filtered[1].disabled).toEqual(true);
    });

    it('returns the input unchanged when the layout is not provided', () => {
      const items = [{ title: 'Type: 1H NMR' }];
      expect(filterMenuByLayout(items, null)).toBe(items);
    });
  });

  describe('limitMenuToSelection', () => {
    it('removes leaves that are not in the allowed list', () => {
      const tree = [{
        key: 'k', title: 't', value: 'v', children: [
          { key: 'd', title: 'd', value: 'd', children: [
            { key: 1, value: 1, title: 'a' },
            { key: 2, value: 2, title: 'b' },
          ] },
        ],
      }];
      const result = limitMenuToSelection(tree, [1]);
      expect(result).toHaveLength(1);
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].value).toEqual(1);
    });

    it('returns [] when allowedIds is empty', () => {
      expect(limitMenuToSelection([{ key: 1 }], [])).toEqual([]);
    });
  });

  describe('resolveSelection', () => {
    const treeData = [
      { key: 'L', title: 'Type: 1H NMR', value: 'L', children: [
        { key: 5, title: 'A1', value: 5, children: [
          { key: 10, title: 'D1', value: 10, children: [
            { key: 100, title: 'spectrum.peak.jdx', value: 100 },
          ] },
        ] },
      ] },
    ];

    it('returns [] when info is missing', () => {
      expect(resolveSelection({ treeData, selectedFiles: [100], info: null })).toEqual([]);
    });

    it('builds the analyses_compared payload from selected leafs', () => {
      const out = resolveSelection({ treeData, selectedFiles: [100], info: {} });
      expect(out).toEqual([{
        file: { id: 100, name: 'spectrum.peak.jdx' },
        dataset: { id: 10, name: 'D1' },
        analysis: { id: 5, name: 'A1' },
        layout: 'Type: 1H NMR',
      }]);
    });
  });
});
