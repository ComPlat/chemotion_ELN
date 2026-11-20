import expect from 'expect';
import { describe, it } from 'mocha';

import { loadCompareSpectra } from 'src/apps/mydb/elements/details/spectraCompare/services/compareLoadService';

const fakeFile = (id) => ({
  id,
  name: `f${id}.jdx`,
  type: 'application/octet-stream',
});

describe('compareLoadService.loadCompareSpectra', () => {
  it('returns empty when infos is empty', async () => {
    const result = await loadCompareSpectra([]);
    expect(result).toEqual({ spectra: [], failures: [] });
  });

  it('returns empty when infos lack idx', async () => {
    const result = await loadCompareSpectra([{ idx: null }]);
    expect(result).toEqual({ spectra: [], failures: [] });
  });

  it('preserves the input order (B2 fix)', async () => {
    const fetchFiles = async () => ({
      files: [
        { id: 11, name: 'b.jdx' },
        { id: 10, name: 'a.jdx' },
      ],
    });

    const result = await loadCompareSpectra(
      [{ idx: 10 }, { idx: 11 }],
      { fetchFiles },
    );

    expect(result.failures.length + result.spectra.length).toEqual(2);
    if (result.spectra.length === 2) {
      expect(result.spectra[0].idx).toEqual(10);
      expect(result.spectra[1].idx).toEqual(11);
    }
  });

  it('reports a fetch error to the caller (B5 fix)', async () => {
    const fetchFiles = async () => { throw new Error('network down'); };
    let caught = null;
    try {
      await loadCompareSpectra([{ idx: 1 }], { fetchFiles });
    } catch (err) {
      caught = err;
    }
    expect(caught).not.toEqual(null);
    expect(caught.message).toEqual('network down');
    expect(caught.compareLoad).toEqual(true);
  });

  it('reports missing files as failures', async () => {
    const fetchFiles = async () => ({ files: [] });
    const result = await loadCompareSpectra([{ idx: 1 }], { fetchFiles });
    expect(result.spectra).toEqual([]);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toEqual('no-file');
  });
});
