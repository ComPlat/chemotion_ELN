import expect from 'expect';
import { describe, it } from 'mocha';

import {
  buildSelectionTree,
  enforceLockedSelection,
  filterMenuByLayout,
  limitMenuToSelection,
  lockSelectedLeaves,
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
      expect(buildSelectionTree(null)).toEqual({ menuItems: [], selectedFiles: [], sourceFiles: [] });
      expect(buildSelectionTree(undefined, undefined))
        .toEqual({ menuItems: [], selectedFiles: [], sourceFiles: [] });
    });

    it('returns empty when sample lacks getAnalysisContainersComparable', () => {
      expect(buildSelectionTree({}, undefined)).toEqual({ menuItems: [], selectedFiles: [], sourceFiles: [] });
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

    it('keeps an untyped analysis selectable under "Type: Not specified" instead of dropping it', () => {
      const dataset = {
        id: 20,
        name: 'Untyped dataset',
        attachments: [
          { id: 200, filename: 'sample.peak.jdx' },
        ],
      };
      const analysis = {
        id: 6,
        name: 'A2',
        children: [dataset],
        comparable_info: { is_comparison: false },
      };
      // Element#getAnalysisContainersComparable groups analyses with no kind under the '' key.
      const sample = buildSample({ '': [analysis] });
      const { menuItems } = buildSelectionTree(sample, null);
      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].title).toEqual('Type: Not specified');
      expect(menuItems[0].children[0].children[0].value).toEqual(20);
    });

    it('keeps the original spectrum visible in its home analysis alongside the comparison\'s own copy', () => {
      // 999 is the generated copy living inside the comparison container's own dataset;
      // 100 is the original source spectrum, still attached to its regular analysis A1.
      // Neither branch should be hidden — hiding a row reads as data loss to the user.
      const originalDataset = {
        id: 10,
        name: 'D1',
        attachments: [{ id: 100, filename: 'sample.peak.jdx' }],
      };
      const originalAnalysis = {
        id: 5,
        name: 'A1',
        children: [originalDataset],
        comparable_info: { is_comparison: false },
      };
      const comparisonDataset = {
        id: 30,
        name: 'Comparison 2026-01-01',
        attachments: [{ id: 999, filename: 'sample_compared_2026-01-01.jdx' }],
      };
      const comparisonContainer = {
        id: 7,
        name: 'Comparison',
        children: [comparisonDataset],
        comparable_info: { is_comparison: true, layout: 'Type: 1H NMR' },
        extended_metadata: {
          is_comparison: true,
          kind: '1H NMR',
          analyses_compared: [
            { file: { id: 999 }, layout: 'Type: 1H NMR', source: { file: { id: 100 } } },
          ],
        },
      };
      const sample = buildSample({
        '1H NMR': [originalAnalysis, comparisonContainer],
      });
      const { menuItems, selectedFiles, sourceFiles } = buildSelectionTree(sample, comparisonContainer);
      expect(selectedFiles).toEqual([999]);
      // Exposed (not applied) so callers can lock — not hide — the original while adding.
      expect(sourceFiles).toEqual([100]);
      const analysisBranch = menuItems[0].children.find((n) => n.value === 5);
      const comparisonBranch = menuItems[0].children.find((n) => n.value === 7);
      expect(analysisBranch.children[0].children[0].value).toEqual(100);
      expect(comparisonBranch.children[0].children[0].value).toEqual(999);
    });
  });

  describe('filterMenuByLayout', () => {
    it('keeps only the items matching the selected layout, dropping the rest', () => {
      const items = [
        { title: 'Type: 1H NMR' },
        { title: 'Type: 13C NMR' },
      ];
      const filtered = filterMenuByLayout(items, 'Type: 1H NMR');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toEqual('Type: 1H NMR');
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

  describe('lockSelectedLeaves', () => {
    const tree = [{
      key: 'k', title: 't', value: 'v', children: [
        { key: 'd', title: 'd', value: 'd', children: [
          { key: 1, value: 1, title: 'a' },
          { key: 2, value: 2, title: 'b' },
        ] },
      ],
    }];

    it('marks already-selected leaves with disableCheckbox without removing them', () => {
      const result = lockSelectedLeaves(tree, [1]);
      const leaves = result[0].children[0].children;
      expect(leaves).toHaveLength(2);
      expect(leaves[0].disableCheckbox).toEqual(true);
      expect(leaves[0].disabled).toBeFalsy();
      expect(leaves[1].disableCheckbox).toBeFalsy();
    });

    it('leaves nothing locked when selection is empty', () => {
      const result = lockSelectedLeaves(tree, []);
      const leaves = result[0].children[0].children;
      expect(leaves[0].disableCheckbox).toBeFalsy();
      expect(leaves[1].disableCheckbox).toBeFalsy();
    });

    it('returns [] for non-array input', () => {
      expect(lockSelectedLeaves(null, [1])).toEqual([]);
    });
  });

  describe('enforceLockedSelection', () => {
    it('re-adds a locked id that was dropped (e.g. via the TreeSelect tag\'s "x")', () => {
      // antd removes a value from onChange regardless of disableCheckbox when its tag is
      // closed — the generated copy (999) must come back so it can't be deselected that way.
      expect(enforceLockedSelection([100], [999])).toEqual([100, 999]);
    });

    it('does not duplicate a locked id that is still present', () => {
      expect(enforceLockedSelection([999, 100], [999])).toEqual([999, 100]);
    });

    it('returns the value unchanged when there is nothing locked', () => {
      expect(enforceLockedSelection([100], [])).toEqual([100]);
      expect(enforceLockedSelection([100], null)).toEqual([100]);
    });

    it('treats a non-array value as empty', () => {
      expect(enforceLockedSelection(null, [999])).toEqual([999]);
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
        source: { file: { id: 100 } },
      }]);
    });

    it('sets source to the resolved id for a leaf with no existing entry (a fresh pick)', () => {
      const out = resolveSelection({
        treeData, selectedFiles: [100], info: {}, existingEntries: [],
      });
      expect(out[0].source).toEqual({ file: { id: 100 } });
    });

    it('keeps an already-locked leaf\'s existing source instead of self-referencing its copy id', () => {
      // Leaf 100 here stands in for the comparison's own generated-copy leaf (locked/checked).
      // Its previously-stored entry carries the true original id (999) under `source` —
      // re-resolving on every add-mode toggle must not overwrite it with 100 itself.
      const existingEntries = [
        { file: { id: 100 }, source: { file: { id: 999 } } },
      ];
      const out = resolveSelection({
        treeData, selectedFiles: [100], info: {}, existingEntries,
      });
      expect(out[0].source).toEqual({ file: { id: 999 } });
    });
  });
});
