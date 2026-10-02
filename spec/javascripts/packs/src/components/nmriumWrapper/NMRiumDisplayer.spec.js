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

  // The shape a save writes for a zip loaded by url: flat, with sources[] holding an attachment
  // reference, the spectrum's data dropped for it, and NMRium's own selector.files still carrying
  // the download token of the open it was saved from. NMRium reads an unversioned document as
  // version 0, and its migrations empty sources[] and turn the spectrum into `data: {rr: undefined}`.
  describe('reopening a document saved from a zip loaded by url', () => {
    const OLD = '/api/v1/public/third_party_apps/OLD-TOKEN/file.zip';
    const zip = { id: 11, label: 'a.zip', kind: 'zip', url: `${TPA}/NEW-TOKEN` };
    const savedDocument = () => ({
      sources: [{
        id: 'nmrium-src-a-zip',
        entries: [{ baseURL: 'chemotion-attachment://eln', relativePath: '/11/a.zip' }],
      }],
      spectra: [{
        id: 'spc-1',
        info: { dimension: 2, isFt: true, name: `${OLD}/a/1` },
        display: { name: `${OLD}/a/1` },
        selector: { root: 'nmrium-src-a-zip', files: [`${OLD}/a/1/pdata/1/2rr`, `${OLD}/a/1/acqus`] },
      }],
      molecules: [],
    });

    const reopen = async (doc, molfile = null) => {
      const displayer = displayerWith([zip]);
      displayer.setState = () => {};
      displayer.postToNMRium = () => {};
      let loaded = null;
      displayer.buildPatchedNmriumFile = (label, content) => { loaded = content; return {}; };
      await displayer.sendPatchedNmrium({ file: btoa(JSON.stringify(doc)) }, undefined, zip, molfile);
      return loaded;
    };

    it('hands NMRium a versioned document, so sources[] survives its migrations', async () => {
      const loaded = await reopen(savedDocument());
      expect(loaded.version).toEqual(19);
      expect(loaded.data.sources).toEqual([{
        id: 'nmrium-src-a-zip',
        entries: [{ baseURL: 'https://eln.test', relativePath: '/api/v1/public/third_party_apps/NEW-TOKEN/file.zip' }],
      }]);
      expect(loaded.data.spectra[0].selector.root).toEqual('nmrium-src-a-zip');
    });

    it('re-points selector.files onto the archive minted for this open', async () => {
      const loaded = await reopen(savedDocument());
      expect(loaded.data.spectra[0].selector.files).toEqual([
        '/api/v1/public/third_party_apps/NEW-TOKEN/file.zip/a/1/pdata/1/2rr',
        '/api/v1/public/third_party_apps/NEW-TOKEN/file.zip/a/1/acqus',
      ]);
    });

    it('re-points the bare member paths a fixed save writes the same way', async () => {
      const doc = savedDocument();
      doc.spectra[0].selector.files = ['a/1/pdata/1/2rr'];
      const loaded = await reopen({ version: 19, data: doc });
      expect(loaded.version).toEqual(19);
      expect(loaded.data.spectra[0].selector.files)
        .toEqual(['/api/v1/public/third_party_apps/NEW-TOKEN/file.zip/a/1/pdata/1/2rr']);
    });

    it("puts the sample's molfile into a versioned document, not beside it", async () => {
      const loaded = await reopen({ version: 19, data: savedDocument() }, 'MOLFILE');
      expect(loaded.data.molecules).toEqual([{ molfile: 'MOLFILE' }]);
      expect(loaded.molecules).toEqual(undefined);
    });

    it('leaves a flat document that relies on no source unversioned', async () => {
      const embedded = { spectra: [{ id: 'spc-1', info: { dimension: 1 }, data: { x: [1], re: [1] } }] };
      const loaded = await reopen(embedded);
      expect(loaded.version).toEqual(undefined);
      expect(loaded.data).toEqual(undefined);
    });

    // A document saved while the spectrum also carried sourceSelector.files: the cleaning pass run
    // after the re-point derives selector.files from those, and must land on the same archive.
    it('keeps selector.files on the archive when the spectrum also has sourceSelector.files', async () => {
      const doc = savedDocument();
      doc.spectra[0].sourceSelector = { files: ['a/1/pdata/1/2rr', 'a/1/acqus'] };
      const loaded = await reopen(doc);
      expect(loaded.data.spectra[0].selector).toEqual({
        root: 'nmrium-src-a-zip',
        files: [
          '/api/v1/public/third_party_apps/NEW-TOKEN/file.zip/a/1/pdata/1/2rr',
          '/api/v1/public/third_party_apps/NEW-TOKEN/file.zip/a/1/acqus',
        ],
      });
    });
  });

  // A 1D analysis saved before the save path learnt NMRium's url-only source entry: the only
  // source is a dead download url, and selector.files repeats it. NMRium filters the fetched files
  // by selector.files, so leaving the dead url there empties the spectrum even when the source
  // itself was re-minted.
  describe('reopening a 1D document saved with a url-only source', () => {
    const OLD = `${TPA}/OLD-TOKEN/file.jdx`;
    const savedDocument = ({ withData = true } = {}) => ({
      version: 19,
      data: {
        sources: [{ id: 'nmrium-uuid', entries: [{ relativePath: OLD, baseURL: null }] }],
        spectra: [{
          id: 'spc-1d',
          info: { dimension: 1, name: 'a.edit.jdx' },
          ...(withData ? { data: { x: [1, 2], re: [3, 4] } } : {}),
          selector: { root: 'nmrium-uuid', files: [OLD] },
        }],
        molecules: [],
      },
    });
    const jcamp = (id, label, token) => ({ id, label, kind: 'jcamp', url: `${TPA}/${token}` });

    const reopen = async (fetchedSpectra, doc = savedDocument()) => {
      const displayer = displayerWith(fetchedSpectra);
      displayer.setState = () => {};
      displayer.postToNMRium = () => {};
      let loaded = null;
      displayer.buildPatchedNmriumFile = (label, content) => { loaded = content; return {}; };
      await displayer.sendPatchedNmrium(
        { file: btoa(JSON.stringify(doc)) }, fetchedSpectra[0], undefined, null,
      );
      return loaded;
    };

    // With the data embedded there is nothing to re-read: the dataset's one JCAMP may not even be
    // the file the spectrum came from (ChemSpectra regenerates its outputs), so it is not guessed.
    it('opens a spectrum with embedded data from that data, even with one JCAMP to re-mint onto', async () => {
      const loaded = await reopen([jcamp(21, 'a.edit.jdx', 'NEW-TOKEN')]);
      const spectrum = loaded.data.spectra[0];
      expect(loaded.data.sources).toEqual(undefined);
      expect(spectrum.selector).toEqual({});
      expect(spectrum.data).toEqual({ x: [1, 2], re: [3, 4] });
    });

    it('re-points selector.files onto the url minted for a source a spectrum depends on', async () => {
      const loaded = await reopen([jcamp(21, 'a.edit.jdx', 'NEW-TOKEN')], savedDocument({ withData: false }));
      const spectrum = loaded.data.spectra[0];
      expect(spectrum.selector).toEqual({
        root: 'nmrium-uuid',
        files: ['/api/v1/public/third_party_apps/NEW-TOKEN/file.jdx'],
      });
      expect(loaded.data.sources[0].entries).toEqual([
        { baseURL: 'https://eln.test', relativePath: '/api/v1/public/third_party_apps/NEW-TOKEN/file.jdx' },
      ]);
    });

    it('falls back to the embedded data when the source cannot be re-minted', async () => {
      const loaded = await reopen([jcamp(21, 'a.dx', 'NEW-A'), jcamp(22, 'a.edit.jdx', 'NEW-B')]);
      const spectrum = loaded.data.spectra[0];
      expect(loaded.data.sources).toEqual(undefined);
      expect(spectrum.selector).toEqual({});
      expect(spectrum.data).toEqual({ x: [1, 2], re: [3, 4] });
      expect(JSON.stringify(loaded)).not.toContain('OLD-TOKEN');
    });
  });

  describe('.receiveMessage() keeping the schema version', () => {
    it('keeps the last reported version when a data-change report carries none', () => {
      const displayer = displayerWith([]);
      displayer.state = {
        ...displayer.state, nmriumWrapperHost: 'https://eln.test/nmrium', nmriumOrigin: 'https://eln.test',
      };
      displayer.setState = (update) => { displayer.state = { ...displayer.state, ...update }; };
      const report = (state) => displayer.receiveMessage({
        origin: 'https://eln.test', data: { type: 'nmr-wrapper:data-change', data: { state } },
      });
      report({ version: 19, data: { spectra: [] } });
      report({ spectra: [] });
      expect(displayer.state.nmriumVersion).toEqual(19);
    });
  });

  describe('.trySendUrlsToNMRium() with only a zip', () => {
    const zip = { id: 11, label: 'a.zip', kind: 'zip', url: `${TPA}/LIVE-TOKEN` };
    const LIVE = '/api/v1/public/third_party_apps/LIVE-TOKEN/file.zip';
    // The state NMRium reports once it has loaded the zip by url: data embedded, no sources[], and
    // selector.files written by NMRium itself as the url's path through the archive.
    const liveState = () => ({
      spectra: [{
        id: 'spc-1',
        info: { dimension: 2, isFt: true, name: 'a.zip' },
        display: { name: 'a.zip' },
        sourceSelector: { files: [`${TPA}/LIVE-TOKEN/file.zip/a/1/pdata/1/2rr`] },
        selector: { files: [`${LIVE}/a/1/pdata/1/2rr`] },
        data: { rr: { z: [[1]] } },
      }],
      molecules: [],
    });

    const sendZipOnly = async (nmriumVersion) => {
      const displayer = displayerWith([zip]);
      displayer.state = {
        ...displayer.state, isIframeLoaded: true, showModalNMRDisplayer: true, nmriumVersion,
      };
      displayer.props = { sample: { molfile: 'MOLFILE' } };
      displayer.getSpcInfo = () => null;
      displayer.sessionSpectra = () => [zip];
      displayer.waitForNMRiumDataWithSpectra = async () => liveState();
      const posted = [];
      displayer.postToNMRium = (message) => { posted.push(message); };
      let handedOff = null;
      displayer.buildPatchedNmriumFile = (label, content) => { handedOff = { label, content }; return 'FILE'; };
      await displayer.trySendUrlsToNMRium();
      return { posted, handedOff };
    };

    it('hands the cleaned state back as a .nmrium file, versioned with the reported schema', async () => {
      const { posted, handedOff } = await sendZipOnly(19);
      expect(posted[1]).toEqual({ type: 'nmr-wrapper:load', data: { type: 'file', data: ['FILE'] } });
      expect(handedOff.label).toEqual('a.nmrium');
      expect(handedOff.content.version).toEqual(19);
      const [spectrum] = handedOff.content.data.spectra;
      expect(spectrum.data).toEqual(undefined);
      expect(handedOff.content.data.sources.map((source) => source.id)).toEqual([spectrum.selector.root]);
      expect(spectrum.selector.files).toEqual([`${LIVE}/a/1/pdata/1/2rr`]);
      expect(handedOff.content.data.molecules).toEqual([{ molfile: 'MOLFILE' }]);
    });

    it('labels it with the flat-document version when none was reported', async () => {
      const { handedOff } = await sendZipOnly(null);
      expect(handedOff.content.version).toEqual(19);
      expect(Array.isArray(handedOff.content.data.sources)).toEqual(true);
    });
  });

  describe('.nmriumDocumentToSave()', () => {
    const zip = { id: 11, label: 'a.zip', kind: 'zip', url: `${TPA}/LIVE-TOKEN` };
    const liveState = () => ({
      sources: [{
        id: 'wrapper-uuid',
        entries: [{ baseURL: 'https://eln.test', relativePath: '/api/v1/public/third_party_apps/LIVE-TOKEN/file.zip' }],
      }],
      spectra: [{
        id: 'spc-1',
        info: { dimension: 2, isFt: true, name: 'a.zip' },
        display: { name: 'a.zip' },
        data: { rr: { z: [[1.0]] } },
        selector: {
          root: 'wrapper-uuid',
          files: ['/api/v1/public/third_party_apps/LIVE-TOKEN/file.zip/a/1/pdata/1/2rr'],
        },
      }],
    });

    const saved = (nmriumVersion) => {
      const displayer = displayerWith([zip]);
      displayer.state.nmriumVersion = nmriumVersion;
      return JSON.parse(JSON.stringify(displayer.nmriumDocumentToSave(liveState())));
    };

    it('wraps the document with the version the wrapper reported', () => {
      const doc = saved(19);
      expect(doc.version).toEqual(19);
      expect(doc.data.spectra[0].selector).toEqual({ root: 'nmrium-src-a-zip', files: ['a/1/pdata/1/2rr'] });
      expect(JSON.stringify(doc)).not.toContain('third_party_apps');
    });

    it('keeps the flat shape when no version was ever reported', () => {
      const doc = saved(null);
      expect(doc.version).toEqual(undefined);
      expect(Array.isArray(doc.spectra)).toBe(true);
    });
  });

  // The analysis-level button hands over every dataset's files, but a session is saved back into
  // one dataset. Loading all of them into one session and saving into whichever came first wrote
  // one dataset's document into another; both sides now follow the same anchor.
  describe('dataset anchoring', () => {
    const spcInfos = [
      { idx: 1, idDt: 10, label: 'a.jdx' },
      { idx: 2, idDt: 20, label: 'b.1_bagit.jdx' },
      { idx: 3, idDt: 20, label: 'b.2_bagit.jdx' },
      { idx: 4, idDt: 20, label: 'b.nmrium' },
    ];
    const fetched = [
      { id: 1, kind: 'jcamp', label: 'a.jdx', url: `${TPA}/A` },
      { id: 2, kind: 'jcamp', label: 'b.1_bagit.jdx', url: `${TPA}/B1` },
      { id: 3, kind: 'jcamp', label: 'b.2_bagit.jdx', url: `${TPA}/B2` },
    ];

    const displayerFor = (infos, fetchedSpectra, props = {}) => {
      const displayer = new NMRiumDisplayer(props);
      displayer.state = { ...displayer.state, spcInfos: infos, fetchedSpectra };
      return displayer;
    };

    it('anchors on the dataset holding the .nmrium document', () => {
      expect(displayerFor(spcInfos, fetched).getSpcInfo().idDt).toEqual(20);
    });

    it('ignores a stale spcIdx left in the shared store by the spectra editor', () => {
      const displayer = displayerFor(spcInfos, fetched);
      displayer.state.spcIdx = 1;
      expect(displayer.getSpcInfo().idDt).toEqual(20);
    });

    it('falls back to the first file when no .nmrium exists', () => {
      const infos = spcInfos.filter((si) => !si.label.endsWith('.nmrium'));
      expect(displayerFor(infos, fetched).getSpcInfo().idDt).toEqual(10);
    });

    it('loads every curve of the anchored dataset and nothing from the others', async () => {
      // No .nmrium, and a dataset-20 file listed first, so the anchor is dataset 20.
      const infos = spcInfos.filter((si) => !si.label.endsWith('.nmrium')).reverse();
      const displayer = displayerFor(infos, fetched, { sample: { molfile: null } });
      Object.assign(displayer.state, { isIframeLoaded: true, showModalNMRDisplayer: true });
      const posted = [];
      displayer.postToNMRium = (message) => posted.push(message);

      await displayer.trySendUrlsToNMRium();

      const sources = posted[0].data.data.spectra.map((spc) => spc.source.jcampURL);
      expect(sources).toEqual([`${TPA}/B1/file.jdx`, `${TPA}/B2/file.jdx`]);
    });

    it('saves into the anchored dataset', () => {
      const datasets = [{ id: 10, attachments: [] }, { id: 20, attachments: [] }];
      const sample = { datasetContainers: () => datasets };
      const displayer = displayerFor(spcInfos, fetched, { sample });
      expect(displayer.prepareDatasets().id).toEqual(20);
    });

    // A save always writes "<stem>.nmrium". A per-curve document left by an earlier save (listed
    // ahead of it) must not keep being reopened in its place, or the save never shows up again.
    describe('when the dataset also holds a per-curve .nmrium', () => {
      const perCurve = { idx: 5, idDt: 20, label: 'b.1_bagit.nmrium' };
      const infos = [...spcInfos.slice(0, 3), perCurve, spcInfos[3]];
      const withDocs = [
        ...fetched,
        { id: 5, kind: 'nmrium', label: 'b.1_bagit.nmrium', file: 'e30=' },
        { id: 4, kind: 'nmrium', label: 'b.nmrium', file: 'e30=' },
      ];

      it('anchors on the document a save writes', () => {
        expect(displayerFor(infos, withDocs).getSpcInfo().idx).toEqual(4);
      });

      it('loads that same document', async () => {
        const displayer = displayerFor(infos, withDocs, { sample: { molfile: null } });
        Object.assign(displayer.state, { isIframeLoaded: true, showModalNMRDisplayer: true });
        let loaded = null;
        displayer.sendPatchedNmrium = async (nmrium) => { loaded = nmrium; };

        await displayer.trySendUrlsToNMRium();

        expect(loaded.id).toEqual(4);
      });

      it('still anchors on a per-curve document when it is the only one', () => {
        const onlyPerCurve = [...spcInfos.slice(0, 3), perCurve];
        expect(displayerFor(onlyPerCurve, withDocs).getSpcInfo().idx).toEqual(5);
      });
    });
  });
});
