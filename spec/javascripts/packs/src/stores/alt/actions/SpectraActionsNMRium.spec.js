import expect from 'expect';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';

import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';
import SpectraStore from 'src/stores/alt/stores/SpectraStore';

describe('SpectraActions.LoadSpectraForNMRDisplayer()', () => {
  let fetchFilesStub;
  let getHandlerUrlStub;

  beforeEach(() => {
    fetchFilesStub = sinon.stub(AttachmentFetcher, 'fetchFiles').resolves({
      files: [{ id: 1, file: Buffer.from('{"version":7,"data":{"spectra":[]}}', 'utf8').toString('base64') }],
    });
    getHandlerUrlStub = sinon.stub(ThirdPartyAppFetcher, 'getHandlerUrl').callsFake(async (id) => `https://handler.test/att/${id}`);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('builds fetchedSpectra with kind=nmrium (file) + kind=jcamp/zip (url)', async () => {
    const spcInfos = [
      { idx: 1, label: 'saved.nmrium' },
      { idx: 2, label: 'spectra_file.jdx' },
      { idx: 3, label: 'test_1d.zip' },
    ];

    // This is an Alt async action: calling it triggers internal dispatch to `SpectraStore`.
    SpectraActions.LoadSpectraForNMRDisplayer(spcInfos);

    // Wait for the internal async/await chain to resolve and dispatch.
    await new Promise((r) => { setTimeout(r, 10); });

    sinon.assert.calledOnce(fetchFilesStub);
    sinon.assert.calledWithExactly(fetchFilesStub, [1]);
    sinon.assert.calledTwice(getHandlerUrlStub);
    sinon.assert.calledWithExactly(getHandlerUrlStub.firstCall, 2, 3);
    sinon.assert.calledWithExactly(getHandlerUrlStub.secondCall, 3, 3);

    const { fetchedSpectra, spcInfos: storedSpcInfos } = SpectraStore.getState();
    expect(storedSpcInfos.length).toEqual(3);
    expect(fetchedSpectra.length).toEqual(3);

    const nmrium = fetchedSpectra.find((s) => s.kind === 'nmrium');
    const jcamp = fetchedSpectra.find((s) => s.kind === 'jcamp');
    const zip = fetchedSpectra.find((s) => s.kind === 'zip');

    expect(nmrium.file).toBeTruthy();
    expect(jcamp.url).toEqual('https://handler.test/att/2');
    expect(zip.url).toEqual('https://handler.test/att/3');
  });
});

