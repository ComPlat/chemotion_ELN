import expect from 'expect';
import { describe, it } from 'mocha';

import {
  applyCombineResponse,
  saveCompareSpectra,
} from 'src/apps/mydb/elements/details/spectraCompare/services/compareSaveService';

const baseContainer = () => ({
  id: 1,
  comparable_info: { layout: 'Type: 1H NMR' },
  extended_metadata: {
    is_comparison: true,
    analyses_compared: [
      { file: { id: 10 }, layout: 'Type: 1H NMR' },
      { file: { id: 11 }, layout: 'Type: 1H NMR' },
    ],
  },
  children: [
    { id: 5, container_type: 'dataset', attachments: [] },
  ],
});

describe('compareSaveService.applyCombineResponse', () => {
  it('returns input untouched when response is null', () => {
    const c = baseContainer();
    expect(applyCombineResponse(c, null)).toBe(c);
  });

  it('replaces the dataset child immutably', () => {
    const original = baseContainer();
    const next = applyCombineResponse(original, {
      dataset: { id: 5, attachments: [{ id: 99 }] },
      analyses_compared: original.extended_metadata.analyses_compared,
    });
    expect(next).not.toBe(original);
    expect(original.children[0].attachments).toEqual([]);
    expect(next.children[0].attachments).toEqual([{ id: 99 }]);
    expect(next.comparable_info.list_attachments).toEqual([{ id: 99 }]);
  });
});

describe('compareSaveService.saveCompareSpectra', () => {
  it('throws when container is missing', async () => {
    let caught = null;
    try { await saveCompareSpectra({ container: null, payloads: [{}] }); }
    catch (err) { caught = err; }
    expect(caught).not.toEqual(null);
  });

  it('throws when payloads is empty', async () => {
    let caught = null;
    try { await saveCompareSpectra({ container: baseContainer(), payloads: [] }); }
    catch (err) { caught = err; }
    expect(caught).not.toEqual(null);
  });

  it('returns an immutable container on success', async () => {
    const container = baseContainer();
    const fakeCombine = async () => ({
      dataset: { id: 5, attachments: [{ id: 99, filename: 'combined.jdx' }] },
      analyses_compared: container.extended_metadata.analyses_compared,
    });
    const result = await saveCompareSpectra({
      container,
      spectra: [{ idx: 10 }, { idx: 11 }],
      payloads: [{}],
    }, { combineSpectra: fakeCombine });
    expect(result.container).not.toBe(container);
    expect(container.children[0].attachments).toEqual([]);
    expect(result.dataset.id).toEqual(5);
    expect(result.spectraIds).toEqual([10, 11]);
  });

  it('rejects the promise when the API returns an error', async () => {
    const fakeCombine = async () => ({ status: false, message: 'boom' });
    let caught = null;
    try {
      await saveCompareSpectra({
        container: baseContainer(),
        spectra: [{ idx: 10 }],
        payloads: [{}],
      }, { combineSpectra: fakeCombine });
    } catch (err) { caught = err; }
    expect(caught).not.toEqual(null);
    expect(caught.message).toEqual('boom');
    expect(caught.compareSave).toEqual(true);
  });
});
