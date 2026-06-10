import expect from 'expect';
import { describe, it } from 'mocha';

import {
  buildCompareInfos,
  canOpenComparisonEditor,
  hasUnsavedComparisonSelection,
} from 'src/apps/mydb/elements/details/spectraCompare/utils/compareInfos';

describe('compareInfos.buildCompareInfos', () => {
  it('returns [] when sample is null', () => {
    expect(buildCompareInfos(null, {})).toEqual([]);
  });

  it('returns [] when container is null', () => {
    expect(buildCompareInfos({}, null)).toEqual([]);
  });

  it('returns [] when extended_metadata.analyses_compared is missing', () => {
    expect(buildCompareInfos({}, { extended_metadata: {} })).toEqual([]);
  });

  it('skips entries without file id', () => {
    const container = {
      extended_metadata: {
        analyses_compared: [
          { file: { id: 1 }, layout: 'a' },
          { file: {} },
          { file: { id: 2 }, layout: 'b' },
        ],
      },
    };
    expect(buildCompareInfos({}, container)).toEqual([
      { idx: 1, info: { file: { id: 1 }, layout: 'a' } },
      { idx: 2, info: { file: { id: 2 }, layout: 'b' } },
    ]);
  });
});

describe('compareInfos.hasUnsavedComparisonSelection', () => {
  it('returns false when container is null', () => {
    expect(hasUnsavedComparisonSelection(null)).toBe(false);
  });

  it('returns false when saved and current selections match', () => {
    const container = {
      extended_metadata: {
        analyses_compared: [{ file: { id: 1 } }, { file: { id: 2 } }],
      },
      comparable_info: {
        list_attachments: [{ id: 2 }, { id: 1 }],
      },
    };
    expect(hasUnsavedComparisonSelection(container)).toBe(false);
  });

  it('returns true when current selection has extra ids', () => {
    const container = {
      extended_metadata: {
        analyses_compared: [{ file: { id: 1 } }, { file: { id: 2 } }, { file: { id: 3 } }],
      },
      comparable_info: { list_attachments: [{ id: 1 }, { id: 2 }] },
    };
    expect(hasUnsavedComparisonSelection(container)).toBe(true);
  });

  it('returns true when ids differ', () => {
    const container = {
      extended_metadata: {
        analyses_compared: [{ file: { id: 1 } }, { file: { id: 4 } }],
      },
      comparable_info: { list_attachments: [{ id: 1 }, { id: 2 }] },
    };
    expect(hasUnsavedComparisonSelection(container)).toBe(true);
  });

  it('returns true when nothing has ever been saved but selection exists', () => {
    const container = {
      extended_metadata: {
        analyses_compared: [{ file: { id: 1 } }],
      },
      comparable_info: { list_attachments: [] },
    };
    expect(hasUnsavedComparisonSelection(container)).toBe(true);
  });
});

describe('compareInfos.canOpenComparisonEditor', () => {
  it('returns false when container is null', () => {
    expect(canOpenComparisonEditor(null)).toBe(false);
  });

  it('returns false when there is no selection', () => {
    const container = {
      extended_metadata: { analyses_compared: [] },
      comparable_info: { list_attachments: [] },
    };
    expect(canOpenComparisonEditor(container)).toBe(false);
  });

  it('returns false when selection is unsaved', () => {
    const container = {
      extended_metadata: {
        analyses_compared: [{ file: { id: 1 } }],
      },
      comparable_info: { list_attachments: [] },
    };
    expect(canOpenComparisonEditor(container)).toBe(false);
  });

  it('returns true when selection matches saved attachments', () => {
    const container = {
      extended_metadata: {
        analyses_compared: [{ file: { id: 1 } }, { file: { id: 2 } }],
      },
      comparable_info: { list_attachments: [{ id: 1 }, { id: 2 }] },
    };
    expect(canOpenComparisonEditor(container)).toBe(true);
  });
});
