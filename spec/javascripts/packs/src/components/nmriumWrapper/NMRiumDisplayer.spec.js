import expect from 'expect';
import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';

// Exercises the reopen-path patching directly on the instance: these methods are pure transforms
// over a parsed .nmrium document plus `state.fetchedSpectra`, so there is nothing to mount.
const displayerWith = (fetchedSpectra) => {
  const displayer = new NMRiumDisplayer({});
  displayer.state = { ...displayer.state, fetchedSpectra };
  return displayer;
};

const TPA = 'https://eln.test/api/v1/public/third_party_apps';

describe('NMRiumDisplayer', () => {
  describe('.patchZipAndJcampReference()', () => {
    // findMatchingZip names one archive for the whole document - read off the first spectrum that
    // has a name - and that pick used to be applied to every spectrum. With two archives in one
    // dataset the second spectrum's member paths were rewritten onto the first archive's url, and
    // the cleaning pass that follows then pruned the second source as unreferenced: the second
    // curve was served, silently, out of the wrong file. Each spectrum's own persisted reference
    // says which archive it came from, so it is asked first.
    const twoZipDocument = () => ({
      sources: [
        { id: 'src-a', entries: [{ baseURL: 'chemotion-attachment://eln', relativePath: '/11/a.zip' }] },
        { id: 'src-b', entries: [{ baseURL: 'chemotion-attachment://eln', relativePath: '/22/b.zip' }] },
      ],
      spectra: [
        {
          info: { dimension: 2, name: 'a.zip' },
          display: { name: 'a.zip' },
          selector: { root: 'src-a' },
          sourceSelector: { files: ['exp1/pdata/1/2rr'] },
        },
        {
          info: { dimension: 2, name: 'b.zip' },
          display: { name: 'b.zip' },
          selector: { root: 'src-b' },
          sourceSelector: { files: ['exp2/pdata/1/2rr'] },
        },
      ],
    });

    const twoZips = [
      { id: 11, label: 'a.zip', kind: 'zip', url: `${TPA}/TOKEN-A` },
      { id: 22, label: 'b.zip', kind: 'zip', url: `${TPA}/TOKEN-B` },
    ];

    it('points each spectrum at the archive its own reference names', () => {
      const displayer = displayerWith(twoZips);
      const nmriumObj = twoZipDocument();
      displayer.patchZipAndJcampReference(nmriumObj, undefined, twoZips[0].url, twoZips[0].label);

      expect(nmriumObj.spectra[0].sourceSelector.files)
        .toEqual([`${TPA}/TOKEN-A/file.zip/exp1/pdata/1/2rr`]);
      expect(nmriumObj.spectra[1].sourceSelector.files)
        .toEqual([`${TPA}/TOKEN-B/file.zip/exp2/pdata/1/2rr`]);
    });

    it('keeps each spectrum named after its own archive', () => {
      const displayer = displayerWith(twoZips);
      const nmriumObj = twoZipDocument();
      displayer.patchZipAndJcampReference(nmriumObj, undefined, twoZips[0].url, twoZips[0].label);

      expect(nmriumObj.spectra.map((s) => s.display.name)).toEqual(['a.zip', 'b.zip']);
      expect(nmriumObj.spectra.map((s) => s.info.name)).toEqual(['a.zip', 'b.zip']);
    });

    // A document written before references existed carries no per-spectrum answer, so the
    // document-wide pick has to keep applying to every spectrum exactly as it did.
    it('falls back to the document-wide archive when a spectrum names none', () => {
      const displayer = displayerWith([twoZips[0]]);
      const nmriumObj = {
        spectra: [{
          info: { dimension: 2, name: 'a.zip' },
          display: { name: 'a.zip' },
          sourceSelector: { files: ['exp1/pdata/1/2rr'] },
        }],
      };
      displayer.patchZipAndJcampReference(nmriumObj, undefined, twoZips[0].url, twoZips[0].label);

      expect(nmriumObj.spectra[0].sourceSelector.files)
        .toEqual([`${TPA}/TOKEN-A/file.zip/exp1/pdata/1/2rr`]);
    });
  });
});
