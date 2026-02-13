import React from 'react';
import fs from 'fs';
import path from 'path';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach, afterEach } from 'mocha';

import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';
import Sample from 'src/models/Sample';
import Container from 'src/models/Container';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import UIFetcher from 'src/fetchers/UIFetcher';

configure({ adapter: new Adapter() });

function readNmriumFixture(fixtureName) {
  const p = path.join(process.cwd(), 'spec/fixtures/nmrium', fixtureName);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toBase64Utf8(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

async function blobToText(blobLike) {
  if (!blobLike) throw new Error('blobToText: missing blob/file');

  if (typeof blobLike.text === 'function') {
    return await blobLike.text();
  }
  if (typeof blobLike.arrayBuffer === 'function') {
    const ab = await blobLike.arrayBuffer();
    return Buffer.from(ab).toString('utf8');
  }
  // jsdom fallback
  return await new Promise((resolve, reject) => {
    const Reader = (global.window && global.window.FileReader) ? global.window.FileReader : null;
    if (!Reader) {
      reject(new Error('blobToText: FileReader not available in this test environment'));
      return;
    }
    const reader = new Reader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blobLike);
  });
}

function createSampleWithDataset() {
  const sample = Sample.buildEmpty();
  sample.can_update = true;
  sample.molfile = 'MOLFILE_STUB';

  const analyses = sample.analysesContainers()[0];
  const analysis = Container.buildAnalysis('NMR', 'analysis-1');
  analysis.extended_metadata.content = { ops: [{ insert: '\n' }] };
  analyses.children.push(analysis);

  const dataset = Container.buildEmpty();
  dataset.container_type = 'dataset';
  dataset.name = 'dataset-1';
  dataset.attachments = [];
  analysis.children.push(dataset);

  return { sample, analyses, analysis, dataset };
}

describe('NMRiumDisplayer', () => {
  let wrapper;
  let instance;
  let postMessageSpy;
  let startDeferStub;
  let stopDeferStub;
  let fetchHostStub;

  beforeEach(() => {
    // Ensure randomUUID exists for the JDX payload generation.
    if (!global.crypto) global.crypto = {};
    if (!global.crypto.randomUUID) global.crypto.randomUUID = () => 'uuid-1';

    startDeferStub = sinon.stub(LoadingActions.start, 'defer');
    stopDeferStub = sinon.stub(LoadingActions.stop, 'defer');
    fetchHostStub = sinon.stub(UIFetcher, 'fetchNMRDisplayerHost').resolves({ nmrium_url: 'http://localhost:3001/' });

    const { sample } = createSampleWithDataset();
    wrapper = shallow(
      React.createElement(NMRiumDisplayer, {
        sample,
        handleSampleChanged: sinon.spy(),
        handleSubmit: sinon.spy(),
      })
    );
    instance = wrapper.instance();

    postMessageSpy = sinon.spy();
    instance.iframeRef.current = { contentWindow: { postMessage: postMessageSpy } };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('.trySendUrlsToNMRium()', () => {
    it('sends a .jdx via jcampURL (nmrium payload)', async () => {
      const { sample } = createSampleWithDataset();
      wrapper.setProps({ sample });

      instance.setState({
        showModalNMRDisplayer: true,
        isIframeLoaded: true,
        fetchedSpectra: [
          {
            id: 101,
            kind: 'jcamp',
            label: 'spectra_file.jdx',
            url: 'https://handler.test/att/101',
          },
        ],
      });

      await instance.trySendUrlsToNMRium();

      expect(startDeferStub.called).toBe(true);
      expect(stopDeferStub.called).toBe(true);
      expect(postMessageSpy.called).toBe(true);

      const [msg] = postMessageSpy.firstCall.args;
      expect(msg.type).toEqual('nmr-wrapper:load');
      expect(msg.data.type).toEqual('nmrium');
      expect(msg.data.data.spectra[0].source.jcampURL).toEqual('https://handler.test/att/101/file.jdx');
      expect(msg.data.data.molecules[0].molfile).toEqual('MOLFILE_STUB');
    });

    it('sends a .zip via URL, waits for nmrium state, then reloads a patched nmrium (name + molecule)', async () => {
      const { sample } = createSampleWithDataset();
      wrapper.setProps({ sample });

      // Simulate wrapper data after loading the URL.
      const nmriumStateFromWrapper = {
        spectra: [
          { id: 'sp-zip-1d-1', info: { dimension: 1, name: 'from-wrapper' } },
        ],
      };

      sinon.stub(instance, 'waitForNMRiumDataWithSpectra').resolves(nmriumStateFromWrapper);

      instance.setState({
        showModalNMRDisplayer: true,
        isIframeLoaded: true,
        fetchedSpectra: [
          {
            id: 201,
            kind: 'zip',
            label: 'test_1d.zip',
            url: 'https://handler.test/att/201',
          },
        ],
      });

      await instance.trySendUrlsToNMRium();

      expect(postMessageSpy.callCount).toBe(2);

      const [msg1] = postMessageSpy.firstCall.args;
      expect(msg1.type).toEqual('nmr-wrapper:load');
      expect(msg1.data.type).toEqual('url');
      expect(msg1.data.data).toEqual(['https://handler.test/att/201/file.zip']);

      const [msg2] = postMessageSpy.secondCall.args;
      expect(msg2.type).toEqual('nmr-wrapper:load');
      expect(msg2.data.type).toEqual('nmrium');
      expect(msg2.data.data.spectra[0].info.name).toEqual('test_1d.zip');
      expect(msg2.data.data.molecules[0].molfile).toEqual('MOLFILE_STUB');
    });

    it('sends a 2D .zip via URL then reloads a patched nmrium (name + molecule)', async () => {
      const { sample } = createSampleWithDataset();
      wrapper.setProps({ sample });

      const nmriumStateFromWrapper = {
        spectra: [
          { id: 'sp-zip-2d-1', info: { dimension: 2, name: 'from-wrapper-2d' } },
        ],
      };

      sinon.stub(instance, 'waitForNMRiumDataWithSpectra').resolves(nmriumStateFromWrapper);

      instance.setState({
        showModalNMRDisplayer: true,
        isIframeLoaded: true,
        fetchedSpectra: [
          {
            id: 202,
            kind: 'zip',
            label: 'test_2d.zip',
            url: 'https://handler.test/att/202',
          },
        ],
      });

      await instance.trySendUrlsToNMRium();

      expect(postMessageSpy.callCount).toBe(2);

      const [msg1] = postMessageSpy.firstCall.args;
      expect(msg1.type).toEqual('nmr-wrapper:load');
      expect(msg1.data.type).toEqual('url');
      expect(msg1.data.data).toEqual(['https://handler.test/att/202/file.zip']);

      const [msg2] = postMessageSpy.secondCall.args;
      expect(msg2.type).toEqual('nmr-wrapper:load');
      expect(msg2.data.type).toEqual('nmrium');
      expect(msg2.data.data.spectra[0].info.name).toEqual('test_2d.zip');
      expect(msg2.data.data.molecules[0].molfile).toEqual('MOLFILE_STUB');
    });

    it('when a .nmrium is present, reads/patches it and sends a "file" payload to the wrapper', async () => {
      const { sample } = createSampleWithDataset();
      wrapper.setProps({ sample });

      const nmriumObj = readNmriumFixture('jdx_result_expected.nmrium');
      const nmriumB64 = toBase64Utf8(JSON.stringify(nmriumObj));

      instance.setState({
        showModalNMRDisplayer: true,
        isIframeLoaded: true,
        fetchedSpectra: [
          {
            id: 301,
            kind: 'nmrium',
            label: 'saved.nmrium',
            file: nmriumB64,
          },
          {
            id: 101,
            kind: 'jcamp',
            label: 'spectra_file.jdx',
            url: 'https://handler.test/att/101',
          },
        ],
      });

      await instance.trySendUrlsToNMRium();

      expect(postMessageSpy.called).toBe(true);
      const [msg] = postMessageSpy.lastCall.args;
      expect(msg.type).toEqual('nmr-wrapper:load');
      expect(msg.data.type).toEqual('file');
      expect(Array.isArray(msg.data.data)).toBe(true);

      const patchedFile = msg.data.data[0];
      expect(patchedFile).toBeTruthy();
      expect(patchedFile.name).toEqual('saved.nmrium');

      const parsed = JSON.parse(await blobToText(patchedFile));
      const root = parsed.data || parsed;
      const sp0 = root.spectra[0];
      if (sp0?.source?.jcampURL) {
        expect(sp0.source.jcampURL).toEqual('https://handler.test/att/101/file.jdx');
      } else {
        // When the input nmrium uses sourceSelector/source.entries (legacy or wrapper-initiated),
        // we patch the global source entries and drop sourceSelector.files.
        expect(root?.source?.entries?.[0]?.baseURL).toEqual('https://handler.test');
        expect(root?.source?.entries?.[0]?.relativePath).toEqual('/att/101/file.jdx');
        expect(sp0?.sourceSelector?.files).toEqual(undefined);
      }
    });
  });

  describe('.prepareNMRiumDataAttachment()', () => {
    it('wraps legacy 2D (no version, no source) into {version:7, data:<root>}', async function () {
      // This fixture is huge → increase timeout and avoid parsing the full serialized JSON.
      this.timeout(20000);
      const legacy2d = readNmriumFixture('legacy_embedded_2d_from_zip.nmrium');
      const att = instance.prepareNMRiumDataAttachment(legacy2d, 'legacy2d');
      const snippetBlob = typeof att.file.slice === 'function' ? att.file.slice(0, 400) : att.file;
      const snippet = await blobToText(snippetBlob);
      expect(snippet.startsWith('{"version":7')).toBe(true);
    });

    it('does not wrap legacy 1D (embedded data, no source)', async () => {
      const legacy1d = readNmriumFixture('legacy_embedded_1d_from_jdx.nmrium');
      const att = instance.prepareNMRiumDataAttachment(legacy1d, 'legacy1d');
      const parsed = JSON.parse(await blobToText(att.file));
      // Not wrapped (no {version:7,data:...} envelope) for 1D legacy.
      // A robust marker: legacy fixture keeps top-level "actionType" (wrapping would move it under `data`).
      expect(parsed.actionType).toEqual(legacy1d.actionType);

      const root = parsed.data || parsed;
      expect(root.spectra[0].info.dimension).toEqual(1);
      // Legacy can store data either in spectra[x].data or via sourceSelector/entries.
      expect(!!root.spectra[0].data || !!root.source || !!root.spectra[0].sourceSelector).toBe(true);
    });

  });

  describe('.savingNMRiumWrapperData()', () => {
    it('adds a .svg + .nmrium to the dataset and marks existing ones (same names) as deleted', async () => {
      const { sample, analyses, analysis, dataset } = createSampleWithDataset();

      // Pre-existing attachments that should be marked deleted.
      dataset.attachments.push(
        { filename: 'spectra_file.svg', is_deleted: false },
        { filename: 'spectra_file.nmrium', is_deleted: false },
      );

      const handleSampleChanged = sinon.spy(); // do NOT call cb, we test pre-submit state changes
      wrapper.setProps({ sample, handleSampleChanged });

      // Ensure getSpcInfo resolves to a specInfo that points to the dataset.
      instance.setState({
        spcInfos: [
          {
            idx: 999,
            label: 'spectra_file.jdx',
            idDt: dataset.id,
            idAe: analyses.id,
            idAi: analysis.id,
          },
        ],
        spcIdx: 999,
        // typical "data-change" normalized shape: depending on nmrium version it can be either root or root.data
        nmriumData: readNmriumFixture('zip_1d_result_expected.nmrium'),
        is2D: false,
      });

      const imageBlob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], { type: 'image/svg+xml' });
      await instance.savingNMRiumWrapperData(imageBlob);

      // Old ones are marked as deleted.
      expect(dataset.attachments[0].is_deleted).toBe(true);
      expect(dataset.attachments[1].is_deleted).toBe(true);

      // New ones are appended.
      const filenames = dataset.attachments.map((a) => a.filename);
      expect(filenames).toContain('spectra_file.svg');
      expect(filenames).toContain('spectra_file.nmrium');

      expect(handleSampleChanged.calledOnce).toBe(true);
    });

    it('in 2D, does not generate peaks text in analysis metadata', async () => {
      const { sample, analyses, analysis, dataset } = createSampleWithDataset();
      const handleSampleChanged = sinon.spy(); // do NOT call cb
      wrapper.setProps({ sample, handleSampleChanged });

      const prepareAnalysisMetadataSpy = sinon.spy(instance, 'prepareAnalysisMetadata');

      instance.setState({
        spcInfos: [
          {
            idx: 2002,
            label: 'test_2d.zip',
            idDt: dataset.id,
            idAe: analyses.id,
            idAi: analysis.id,
          },
        ],
        spcIdx: 2002,
        nmriumData: { spectra: [{ id: 'sp-zip-2d-1', info: { dimension: 2, name: 'x' } }] },
        is2D: true,
      });

      const imageBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      await instance.savingNMRiumWrapperData(imageBlob);

      expect(prepareAnalysisMetadataSpy.called).toBe(false);
    });

    it('for legacy 2D without source, saving produces a wrapped .nmrium (version 7 + data)', async function () {
      this.timeout(20000);
      const { sample, analyses, analysis, dataset } = createSampleWithDataset();
      const handleSampleChanged = sinon.spy(); // do NOT call cb
      wrapper.setProps({ sample, handleSampleChanged });

      instance.setState({
        spcInfos: [
          {
            idx: 1001,
            label: 'legacy_from_zip_2d.nmrium',
            idDt: dataset.id,
            idAe: analyses.id,
            idAi: analysis.id,
          },
        ],
        spcIdx: 1001,
        nmriumData: readNmriumFixture('legacy_embedded_2d_from_zip.nmrium'),
        is2D: true,
      });

      const imageBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      await instance.savingNMRiumWrapperData(imageBlob);

      const savedNmrium = dataset.attachments.find((a) => a.filename === 'legacy_from_zip_2d.nmrium');
      expect(savedNmrium).toBeTruthy();

      const snippetBlob = typeof savedNmrium.file.slice === 'function' ? savedNmrium.file.slice(0, 400) : savedNmrium.file;
      const snippet = await blobToText(snippetBlob);
      expect(snippet.startsWith('{"version":7')).toBe(true);
    });

    it('the saved .nmrium can be reopened (read + patch jcampURL) and is stable (no crash)', async () => {
      const { sample } = createSampleWithDataset();
      wrapper.setProps({ sample });

      // Simulate that wrapper exported a state with a source already (URL-based).
      // This is what makes legacy-vs-url behavior testable: patching relies on an existing `source`.
      const exported = {
        spectra: [
          {
            id: 'sp-1',
            source: { jcampURL: 'https://old-host.test/att/0/file.jdx' },
            info: { dimension: 1, name: 'reopen' },
          },
        ],
        molecules: [{ molfile: 'MOLFILE_STUB' }],
      };
      const att = instance.prepareNMRiumDataAttachment(exported, 'reopen');
      const savedParsed = JSON.parse(await blobToText(att.file));

      const savedB64 = toBase64Utf8(JSON.stringify(savedParsed));

      instance.setState({
        showModalNMRDisplayer: true,
        isIframeLoaded: true,
        fetchedSpectra: [
          { id: 401, kind: 'nmrium', label: 'reopen.nmrium', file: savedB64 },
          { id: 101, kind: 'jcamp', label: 'spectra_file.jdx', url: 'https://handler.test/att/101' },
        ],
      });

      await instance.trySendUrlsToNMRium();

      const [msg] = postMessageSpy.lastCall.args;
      const patchedFile = msg.data.data[0];
      const patchedParsed = JSON.parse(await blobToText(patchedFile));
      const root = patchedParsed.data || patchedParsed;

      expect(root.spectra[0].source.jcampURL).toEqual('https://handler.test/att/101/file.jdx');
    });
  });
});

