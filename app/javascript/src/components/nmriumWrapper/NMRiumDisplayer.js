import React from 'react';
import SpectraStore from 'src/stores/alt/stores/SpectraStore';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import AppModal from 'src/components/common/AppModal';
import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';
import UIFetcher from 'src/fetchers/UIFetcher';
import Attachment from 'src/models/Attachment';
import { SpectraOps } from 'src/utilities/quillToolbarSymbol';
import { FN } from '@complat/react-spectra-editor';
import { cleaningNMRiumData } from 'src/utilities/SpectraHelper';

export default class NMRiumDisplayer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...SpectraStore.getState(),
      isIframeLoaded: false,
      nmriumWrapperHost: '',
      nmriumOrigin: '',
      nmriumData: null,
      is2D: false,
      molFile: null,
      closeOverlayTarget: null,
      closeOverlayPlacement: 'bottom',
    };

    this.hasSentToNMRium = false;
    this.iframeRef = React.createRef();

    this.onChange = this.onChange.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.handleIframeLoad = this.handleIframeLoad.bind(this);
    this.requestDataToBeSaved = this.requestDataToBeSaved.bind(this);
    this.savingNMRiumWrapperData = this.savingNMRiumWrapperData.bind(this);
    this.resetNMRiumState = this.resetNMRiumState.bind(this);
    this.handleCloseRequest = this.handleCloseRequest.bind(this);
    this.hideCloseOverlay = this.hideCloseOverlay.bind(this);
    this.handleDiscard = this.handleDiscard.bind(this);
    this.handleSaveAndClose = this.handleSaveAndClose.bind(this);

    this.buildPeaksBody = this.buildPeaksBody.bind(this);
    this.findDisplayingSpectra = this.findDisplayingSpectra.bind(this);
    this.findDisplayingSpectrumID = this.findDisplayingSpectrumID.bind(this);
    this.prepareAnalysisMetadata = this.prepareAnalysisMetadata.bind(this);
    this.prepareImageAttachment = this.prepareImageAttachment.bind(this);
    this.prepareNMRiumDataAttachment = this.prepareNMRiumDataAttachment.bind(this);
  }

  componentDidMount() {
    SpectraStore.listen(this.onChange);

    window.addEventListener('message', this.receiveMessage);
    this.loadWrapperHost();
  }

  componentWillUnmount() {
    SpectraStore.unlisten(this.onChange);
    window.removeEventListener('message', this.receiveMessage);
  }

  componentDidUpdate() {
    const {
      showModalNMRDisplayer,
      fetchedSpectra,
      spcInfos,
      isIframeLoaded,
    } = this.state;

    // Check for presence of both nmrium and jcamp files 
    const nmriumCount = fetchedSpectra?.filter((s) =>
      s.label?.toLowerCase().endsWith('.nmrium')
    ).length || 0;

    const jcampExtensions = ['.jdx', '.dx', '.jcamp'];
    const zipExtensions = ['.zip'];
    const jdxCount = fetchedSpectra?.filter((s) =>
      jcampExtensions.some((ext) => s.label?.toLowerCase().endsWith(ext))
    ).length || 0;

    const expectedJdxCount = spcInfos?.filter((si) =>
      jcampExtensions.some((ext) => si.label?.toLowerCase().endsWith(ext))
    ).length || 0;

    const zipCount = fetchedSpectra?.filter((s) =>
      zipExtensions.some((ext) => s.label?.toLowerCase().endsWith(ext))
    ).length || 0;

    const expectedZipCount = spcInfos?.filter((si) =>
      zipExtensions.some((ext) => si.label?.toLowerCase().endsWith(ext))
    ).length || 0;

    // Ensure loaded files match requested spectra
    const currentIds = spcInfos?.map((si) => si.idx).sort().join(',') || '';
    const fetchedIds = fetchedSpectra?.map((fs) => fs.id).sort().join(',') || '';

    const fetchedSpectraReady =
      fetchedSpectra?.length > 0 &&
      (
        (nmriumCount > 0 && jdxCount > 0) ||
        (nmriumCount === 0 && jdxCount === expectedJdxCount) ||
        (zipCount > 0 && zipCount === expectedZipCount)
      ) &&
      fetchedIds === currentIds;

    const shouldSend =
      showModalNMRDisplayer &&
      isIframeLoaded &&
      fetchedSpectraReady &&
      !this.hasSentToNMRium;

    if (shouldSend) {
      this.trySendUrlsToNMRium();
    }
  }

  onChange(newState) {
    const prevIds = (this.state.fetchedSpectra || []).map(s => s.id).join(',');
    const nextIds = (newState.fetchedSpectra || []).map(s => s.id).join(',');

    const hasChanged = prevIds !== nextIds;

    this.setState(newState, () => {
      if (hasChanged) {
        this.hasSentToNMRium = false;
      }
    });
  }

  loadWrapperHost() {
    UIFetcher.fetchNMRDisplayerHost().then(({ nmrium_url }) => {
      if (!nmrium_url) return;
      const origin = new URL(nmrium_url).origin;
      this.setState({ nmriumWrapperHost: nmrium_url, nmriumOrigin: origin });
    });
  }

  handleIframeLoad() {
    this.setState({ isIframeLoaded: true });
  }

  receiveMessage(event) {
    const { nmriumWrapperHost, nmriumOrigin } = this.state;
    if (!nmriumWrapperHost || event.origin !== nmriumOrigin || !event.data) return;

    const { type, data } = event.data;

    if (type === 'nmr-wrapper:data-change') {
      const rawState = data?.state || data;
      if (!rawState) return;

      const spectra = rawState?.spectra || rawState?.data?.spectra || [];
      const is2D = this.state.is2D || spectra.some((spc) => (
        spc?.info?.dimension === 2
        || spc?.originalInfo?.dimension === 2
        || spc?.meta?.dimension === 2
      ));
      const version = rawState?.version ?? rawState?.data?.version ?? 1;
      const nmriumData = version > 3 && rawState.data ? rawState.data : rawState;

      this.setState({ nmriumData, is2D });
    }

    if (type === 'nmr-wrapper:action-response') {
      const blob = data?.data?.blob;
      if (data?.type === 'exportSpectraViewerAsBlob' && blob) {
        this.savingNMRiumWrapperData(blob);
      }
    }
  }

  requestDataToBeSaved() {
    const iframe = this.iframeRef.current;
    if (!iframe) return;

    iframe.contentWindow.postMessage(
      {
        type: 'nmr-wrapper:action-request',
        data: { type: 'exportSpectraViewerAsBlob' },
      },
      '*'
    );
  }

  handleCloseRequest(event, source) {
    this.setState({
      closeOverlayTarget: event?.currentTarget || null,
      closeOverlayPlacement: source === 'footer' ? 'top' : 'bottom',
    });
  }

  hideCloseOverlay() {
    this.setState({
      closeOverlayTarget: null,
      closeOverlayPlacement: 'bottom',
    });
  }

  handleDiscard() {
    this.hideCloseOverlay();
    this.resetNMRiumState();
    SpectraActions.ToggleModalNMRDisplayer.defer();
  }

  handleSaveAndClose() {
    this.hideCloseOverlay();
    this.requestDataToBeSaved();
  }

  async trySendUrlsToNMRium() {
    const { isIframeLoaded, fetchedSpectra, showModalNMRDisplayer } = this.state;
    const { sample } = this.props;

    if (!isIframeLoaded || !showModalNMRDisplayer || !fetchedSpectra?.length || this.hasSentToNMRium) return;

    this.hasSentToNMRium = true;
    LoadingActions.start.defer();

    const nmrium = fetchedSpectra.find((s) => s.kind === 'nmrium');
    const jdx = fetchedSpectra.find((s) => s.kind === 'jcamp');
    const zip = fetchedSpectra.find((s) => s.kind === 'zip');
    const molfile = sample?.molfile || null;

    // If we have a .nmrium file, patch it and send it
    if (nmrium?.file) {
      await this.sendPatchedNmrium(nmrium, jdx, zip, molfile, sample);
      LoadingActions.stop.defer();
      return;
    }

    // Fallback: only .jdx/.zip file available
    if (jdx?.url) {
      // get file extension from jdx.label
      const fileExtension = jdx.label?.split('.').pop()?.toLowerCase() || 'jdx';
      const jdxUrlWithFile = `${jdx.url}/file.${fileExtension}`;
      const payload = {
        type: 'nmrium',
        data: {
          spectra: [{
            id: crypto.randomUUID(),
            source: { jcampURL: jdxUrlWithFile },
            display: { name: jdx.label || 'spectrum' },
          }],
          molecules: molfile ? [{ molfile }] : [],
        },
      };
      this.iframeRef.current?.contentWindow.postMessage({ type: 'nmr-wrapper:load', data: payload }, '*');
    } else if (zip?.url) {

      this.iframeRef.current?.contentWindow.postMessage({ type: 'nmr-wrapper:load', data: { type: 'url', data: [`${zip.url}/file.zip`] } }, '*');

      const nmriumState = await this.waitForNMRiumDataWithSpectra(30000);
      if (!nmriumState) {
        LoadingActions.stop.defer();
        return;
      }

      const cleaned = cleaningNMRiumData(nmriumState);

      if (zip?.label) this.patchZipName(cleaned, zip?.label);
      if (molfile) { cleaned.molecules = [{ molfile }]; }

      this.iframeRef.current?.contentWindow.postMessage({ type: 'nmr-wrapper:load', data: { type: 'nmrium', data: cleaned } }, '*');
    } else {
      console.warn('No usable .nmrium or .jdx file for display.');
    }

    LoadingActions.stop.defer();
  }

  patchZipName(nmriumData, zipLabel) {
    if (!nmriumData) return;
    const root = nmriumData.data || nmriumData;
    root.spectra.forEach((s) => {
      s.display = { ...s.display, name: zipLabel };
      if (s.info) {
        s.info.name = zipLabel;
      }
    });
  }

  async waitForNMRiumDataWithSpectra(timeoutMs = 5000) {
    const start = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        const current = this.state.nmriumData;
        const spectra = current?.spectra || current?.data?.spectra || [];
        if (Array.isArray(spectra) && spectra.length > 0) {
          resolve(current?.data || current);
        } else if (Date.now() - start >= timeoutMs) {
          resolve(null);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  async sendPatchedNmrium(nmrium, jdx, zip, molfile) {
    try {
      const fileContent = await this.readFileContent(nmrium.file);
      const nmriumObj = JSON.parse(fileContent);

      this.patchZipAndJcampReference(nmriumObj, jdx?.url, zip?.url, zip?.label);
      if (molfile) {
        nmriumObj.molecules = [{ molfile }];
      }

      const cleanedNmriumObj = cleaningNMRiumData(nmriumObj);
      const patchedFile = this.buildPatchedNmriumFile(nmrium.label, cleanedNmriumObj);
      const fileList = [patchedFile];

      const updatedSpectra = this.state.fetchedSpectra.filter((s) => s.kind === 'jcamp' || s.kind === 'zip');
      updatedSpectra.push({ ...nmrium, file: patchedFile });
      this.setState({ fetchedSpectra: updatedSpectra });

      const payload = { type: 'file', data: fileList };
      this.iframeRef.current?.contentWindow.postMessage({ type: 'nmr-wrapper:load', data: payload }, '*');
    } catch (err) {
      console.error('Failed to parse/patch .nmrium:', err);
    }
  }

  async readFileContent(file) {
    if (file instanceof Blob) {
      return await file.text();
    }
    if (typeof file === 'string') {
      return atob(file);
    }
    throw new Error('Unsupported .nmrium file format');
  }

  findMatchingJcamp(spectrum, jcampSpectra) {
    const oldUrl = spectrum?.source?.jcampURL
      || spectrum?.sourceSelector?.files?.find((file) => typeof file === 'string');
    const baseFromUrl = this.getFileBaseName(oldUrl);
    const baseFromInfo = this.getFileBaseName(spectrum?.info?.name);
    const extFromUrl = this.getFileExtension(oldUrl);
    const extFromInfo = this.getFileExtension(spectrum?.info?.name);
    const targetBase = baseFromUrl || baseFromInfo;
    const targetExt = extFromUrl || extFromInfo;
    if (!targetBase) return null;

    const match = jcampSpectra.find((c) => {
      const baseFromLabel = this.getFileBaseName(c.label);
      const extFromLabel = this.getFileExtension(c.label);
      return baseFromLabel && baseFromLabel === targetBase
        && (!targetExt || extFromLabel === targetExt);
    }) || null;

    return match;
  }

  findMatchingZip(root, zipSpectra) {
    if (!zipSpectra?.length) return null;
    const spectrumWithName = root.spectra?.find((s) => s?.info?.name || s?.display?.name);
    const nameInNmrium = spectrumWithName?.info?.name || spectrumWithName?.display?.name;
    const baseInNmrium = this.getFileBaseName(nameInNmrium);
    if (!baseInNmrium) return zipSpectra[0];
    return zipSpectra.find((z) => this.getFileBaseName(z.label) === baseInNmrium) || zipSpectra[0];
  }

  patchZipAndJcampReference(nmriumObj, jdxUrl, zipUrl, zipLabel) {
    const root = nmriumObj.data || nmriumObj;
    const sourceRoot = nmriumObj.source || root.source;
    if (!Array.isArray(root?.spectra)) return;

    const fetchedSpectra = this.state.fetchedSpectra || [];
    const jcampSpectra = fetchedSpectra.filter((s) => s.kind === 'jcamp' && s.url);
    const zipSpectra = fetchedSpectra.filter((s) => s.kind === 'zip' && s.url);
    const isZipBased = root.spectra.some((s) => s?.sourceSelector?.files?.some?.((f) => typeof f === 'string' && f.includes('/file.zip/')));
    const matchingZip = isZipBased ? this.findMatchingZip(root, zipSpectra) : null;
    const effectiveZipUrl = matchingZip?.url ?? zipUrl;
    const effectiveZipLabel = matchingZip?.label ?? zipLabel;
    if ((!jdxUrl && jcampSpectra.length === 0) && !effectiveZipUrl) return;

    const zipUrlWithFile = effectiveZipUrl !== undefined ? `${effectiveZipUrl}/file.zip` : undefined;
    const firstJcampMatch = !isZipBased && root.spectra.map((s) => this.findMatchingJcamp(s, jcampSpectra)).find(Boolean);
    const jdxUrlWithFile = firstJcampMatch
      ? `${firstJcampMatch.url}/file.${this.getFileExtension(firstJcampMatch.label) || 'jdx'}`
      : (jdxUrl ? `${jdxUrl}/file.jdx` : undefined);
    const preferredUrl = (isZipBased ? zipUrlWithFile : jdxUrlWithFile) || zipUrlWithFile || jdxUrlWithFile;
    if (!preferredUrl) return;

    const u = new URL(preferredUrl);
    const baseURL = u.origin;
    const relativePath = u.pathname;

    root.spectra.forEach((s) => {
      if (!s) return;

      const oldUrl = s?.source?.jcampURL
        || s?.sourceSelector?.files?.find((file) => typeof file === 'string');
      const match = !isZipBased ? this.findMatchingJcamp(s, jcampSpectra) : null;
      let spectrumSourceUrl = preferredUrl;

      if (!isZipBased) {
        if (!s.source || typeof s.source !== 'object') s.source = {};
        const ext = this.getFileExtension(oldUrl)
          || this.getFileExtension(match?.label)
          || (jcampSpectra.length === 1 ? this.getFileExtension(jcampSpectra[0].label) : '')
          || 'jdx';
        const fallbackJcampUrl = match
          ? `${match.url}/file.${ext}`
          : (jdxUrl ? `${jdxUrl}/file.${ext}` : jdxUrlWithFile);
        if (fallbackJcampUrl) {
          s.source.jcampURL = fallbackJcampUrl;
          spectrumSourceUrl = fallbackJcampUrl;
          if (s.sourceSelector && Array.isArray(s.sourceSelector.files)) {
            s.sourceSelector.files = [fallbackJcampUrl];
          }
        }
      }

      if (sourceRoot?.entries?.[0]) {
        const sourceUrl = new URL(spectrumSourceUrl);
        sourceRoot.entries[0].relativePath = sourceUrl.pathname;
        sourceRoot.entries[0].baseURL = sourceUrl.origin;
      }

      if (effectiveZipUrl && effectiveZipLabel) {
        s.display = { ...s.display, name: effectiveZipLabel };
        if (s.info) {
          s.info.name = effectiveZipLabel;
        }
      }

      // Patch the zip references in the nmrium data
      if (effectiveZipUrl && Array.isArray(s?.sourceSelector?.files)) {
        const marker = '/file.zip/';
        s.sourceSelector.files = s.sourceSelector.files.map(
          (f) => f.includes(marker) ? `${relativePath}/${f.split(marker)[1]}` : f
        );
      }
    });
  }

  getFileBaseName(pathLike) {
    if (!pathLike || typeof pathLike !== 'string') return '';
    return (pathLike.split('?')[0].split('#')[0].split('/').pop() || '').replace(/\.[^.]+$/, '').toLowerCase();
  }

  getFileExtension(pathLike) {
    if (!pathLike || typeof pathLike !== 'string') return '';
    const name = (pathLike.split('?')[0].split('#')[0].split('/').pop() || '');
    const i = name.lastIndexOf('.');
    return i < 0 ? '' : name.slice(i + 1).toLowerCase();
  }

  buildPatchedNmriumFile(label, contentObj) {
    const blob = new Blob([JSON.stringify(contentObj)], { type: 'application/json' });
    return new File([blob], label || 'spectrum.nmrium');
  }

  async savingNMRiumWrapperData(imageBlobData) {
    const { nmriumData, is2D } = this.state;
    const { sample, handleSampleChanged } = this.props;

    if (!nmriumData || !imageBlobData || !sample) return;

    const specInfo = this.getSpcInfo();
    if (!specInfo) return;

    const baseName = specInfo.label?.split('.')[0] || 'spectrum';

    const imageAttachment = this.prepareImageAttachment(imageBlobData, baseName);
    const nmriumAttachment = this.prepareNMRiumDataAttachment(nmriumData, baseName);

    const dataset = this.prepareDatasets([imageAttachment.filename, nmriumAttachment.filename]);
    if (!dataset) return;

    // Generate peak annotations for export
    if (!is2D) {
      this.prepareAnalysisMetadata(nmriumData);
    }

    dataset.attachments.push(imageAttachment, nmriumAttachment);

    LoadingActions.start.defer();
    handleSampleChanged(sample, () => this.saveOp());
  }

  saveOp() {
    this.resetNMRiumState();
    SpectraActions.ToggleModalNMRDisplayer.defer();

    const { handleSubmit } = this.props;
    if (handleSubmit) handleSubmit();
  }

  getSpcInfo() {
    const { spcInfos, spcIdx } = this.state;
    return spcInfos.find((spc) => spc.idx === spcIdx) || spcInfos[0];
  }

  prepareDatasets(fileNamesToDelete = []) {
    const { sample } = this.props;
    const specInfo = this.getSpcInfo();

    if (!sample || !specInfo) return false;

    const dataset = sample.datasetContainers().find(ds => ds.id === specInfo.idDt);
    if (!dataset) return false;

    dataset.attachments.forEach(att => {
      if (fileNamesToDelete.includes(att.filename)) {
        att.is_deleted = true;
      }
    });

    return dataset;
  }

  prepareImageAttachment(blob, baseName) {
    const fileName = `${baseName}.svg`;
    blob.name = fileName;

    const attachment = Attachment.fromFile(blob);
    attachment.thumb = true;

    return attachment;
  }

  prepareNMRiumDataAttachment(nmriumData, baseName) {
    const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
    const hasDataProp = !!cleanedNMRiumData.data;
    const root = hasDataProp ? cleanedNMRiumData.data : cleanedNMRiumData;
    const spectra = root?.spectra || [];
    const originalSpectra = nmriumData?.data?.spectra || nmriumData?.spectra || [];
    const has2D = this.state.is2D || originalSpectra.some((spc) => (
      spc?.info?.dimension === 2
      || spc?.originalInfo?.dimension === 2
      || spc?.meta?.dimension === 2
    ));
    const hasAnySource =
      !!root?.source
      || spectra.some((spc) => spc?.source || spc?.sourceSelector);
    const needsWrapper = has2D && !hasAnySource && !hasDataProp && !nmriumData.version;

    const toSerialize = needsWrapper
      ? { version: 7, data: root }
      : cleanedNMRiumData;

    const json = JSON.stringify(
      toSerialize,
      (key, value) => (ArrayBuffer.isView(value) ? Array.from(value) : value),
      0
    );

    const blob = new Blob([json], { type: 'text/plain' });
    blob.name = `${baseName}.nmrium`;

    return Attachment.fromFile(blob);
  }

  resetNMRiumState() {
    this.hasSentToNMRium = false;
    this.nmriumWrapperHost = null;
    this.nmriumOrigin = null;

    this.setState({
      isIframeLoaded: false,
      showModalNMRDisplayer: false,
      fetchedSpectra: [],
      spcInfos: [],
      spcIdx: null,
      nmriumData: null,
      is2D: false,
      molFile: null,
    });
  }

  prepareAnalysisMetadata(nmriumData) {
    if (!nmriumData) return;

    const buildPeaksBodyObject = this.buildPeaksBody(nmriumData);
    const { peaksBody, layout } = buildPeaksBodyObject;

    if (peaksBody === '' || layout === '') {
      return '';
    }

    const layoutOpsObj = SpectraOps[layout];

    if (!layoutOpsObj) {
      return '';
    }

    const { sample } = this.props;
    const specInfo = this.getSpcInfo();

    const analysesContainers = sample.analysesContainers();

    const ops = [
      ...layoutOpsObj.head(''),
      { insert: peaksBody },
      ...layoutOpsObj.tail(),
    ];
    analysesContainers.forEach((analyses) => {
      if (analyses.id !== specInfo.idAe) return;
      analyses.children.forEach((ai) => {
        if (ai.id !== specInfo.idAi) return;
        ai.extended_metadata.content.ops = [ // eslint-disable-line
          ...ai.extended_metadata.content.ops,
          ...ops,
        ];
      });
    });
  }

  buildPeaksBody(nmriumData) {
    const spectra = this.findDisplayingSpectra(nmriumData);
    if (spectra.length === 0) return { peaksBody: '', layout: '' };

    const spectrum = spectra[0];
    const { info, peaks, nucleus } = spectrum;

    // Ignore 2D spectra
    if (info?.dimension === 2) return { peaksBody: '', layout: '' };

    const layout = info?.nucleus || nucleus;
    if (!layout || !peaks?.values?.length) return { peaksBody: '', layout: '' };

    const shift = {
      shifts: [{ enable: false, peak: false, ref: { label: false, name: '---', value: 0 } }],
    };

    const peaksBody = FN.peaksBody({
      peaks: peaks.values,
      layout,
      decimal: 2,
      shift,
    });

    return { peaksBody, layout };
  }

  findDisplayingSpectra(nmriumData) {
    const root = nmriumData?.data || nmriumData;
    if (!root?.spectra) return [];

    const { spectra, correlations } = root;
    const idToDisplay = this.findDisplayingSpectrumID(correlations);

    if (idToDisplay) {
      return spectra.filter((s) => s.id === idToDisplay);
    }

    return spectra.filter((s) => s?.info?.isFid === false);
  }

  findDisplayingSpectrumID(correlations) {
    try {
      const links = correlations?.values?.[0]?.link;
      return links?.[0]?.experimentID || null;
    } catch {
      return null;
    }
  }

  render() {
    const {
      showModalNMRDisplayer,
      nmriumWrapperHost,
      nmriumData,
      closeOverlayTarget,
      closeOverlayPlacement,
    } = this.state;
    const { sample } = this.props;

    const canSave = sample?.can_update && nmriumData;

    return (
      <>
        <AppModal
          size="xxxl"
          show={showModalNMRDisplayer}
          onHide={this.hideCloseOverlay}
          onRequestClose={this.handleCloseRequest}
          title="NMRium"
          closeLabel="Close"
          primaryActionLabel={canSave ? 'Save' : undefined}
          onPrimaryAction={canSave ? this.requestDataToBeSaved : undefined}
          backdrop="static"
          keyboard={false}
        >
          <iframe
            id="nmrium_wrapper"
            className="spectra-editor"
            title="NMRium spectra editor"
            src={nmriumWrapperHost}
            allowFullScreen
            ref={this.iframeRef}
            onLoad={this.handleIframeLoad}
          />
        </AppModal>
        <ConfirmationOverlay
          overlayTarget={closeOverlayTarget}
          placement={closeOverlayPlacement}
          warningText="Closing will discard current changes."
          destructiveAction={this.handleDiscard}
          destructiveActionLabel="Discard"
          hideAction={this.hideCloseOverlay}
          hideActionLabel="Cancel"
          primaryAction={canSave ? this.handleSaveAndClose : undefined}
          primaryActionLabel={canSave ? 'Save and Close' : undefined}
        />
      </>
    );
  }
}
