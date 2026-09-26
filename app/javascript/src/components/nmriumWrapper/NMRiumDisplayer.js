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
import {
  cleaningNMRiumData, isSpectrum2D, spectrumName,
  isAttachmentRef, isEphemeralUrl, splitArchiveRef, archiveMemberPath,
  entryUrl, urlToEntry, findAttachmentForRef,
} from 'src/utilities/SpectraHelper';

// The NMRium schema version of a document this wrapper saved flat - without `version` and without the
// {version, data} wrap - while already relying on sources[]. Such files were written from the live
// state of the pinned wrapper (v1.2.0, schema 19); NMRium would read them as version 0 and migrate
// sources[] away. Follows the wrapper pin: the wrapper refuses to open a version above its own.
const FLAT_NMRIUM_DOC_VERSION = 19;

export default class NMRiumDisplayer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...SpectraStore.getState(),
      isIframeLoaded: false,
      nmriumWrapperHost: '',
      nmriumOrigin: '',
      nmriumData: null,
      nmriumVersion: null,
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
    this.postToNMRium = this.postToNMRium.bind(this);
    this.refreshPersistedSources = this.refreshPersistedSources.bind(this);
    this.mintAttachmentUrl = this.mintAttachmentUrl.bind(this);
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
      // The configured url may be a path rather than an absolute url, when the
      // wrapper assets are self-hosted out of public/ (see spectra.yml.example).
      // Resolving against our own origin then yields the origin the same-origin
      // iframe will post messages from, so receiveMessage's check still holds.
      const { origin } = new URL(nmrium_url, window.location.origin);
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
      const is2D = this.state.is2D || spectra.some(isSpectrum2D);
      const reportedVersion = rawState?.version ?? rawState?.data?.version;
      const version = reportedVersion ?? 1;
      const nmriumData = version > 3 && rawState.data ? rawState.data : rawState;

      // The schema version is kept apart from the unwrapped data, for the save to write it back:
      // see nmriumDocumentToSave.
      this.setState({ nmriumData, nmriumVersion: reportedVersion ?? null, is2D });
    }

    if (type === 'nmr-wrapper:action-response') {
      const blob = data?.data?.blob;
      if (data?.type === 'exportSpectraViewerAsBlob' && blob) {
        this.savingNMRiumWrapperData(blob);
      }
    }
  }

  // receiveMessage already refuses anything not from nmriumOrigin; this is the same
  // check in the outbound direction, so the payload is only ever delivered to the frame
  // we resolved from the configured wrapper url. Silently doing nothing without an
  // origin is deliberate: it means loadWrapperHost has not resolved yet, and the caller
  // is about to be re-run once the iframe loads.
  postToNMRium(message) {
    const { nmriumOrigin } = this.state;
    const iframe = this.iframeRef.current;
    if (!iframe?.contentWindow || !nmriumOrigin) return;

    iframe.contentWindow.postMessage(message, nmriumOrigin);
  }

  requestDataToBeSaved() {
    this.postToNMRium({
      type: 'nmr-wrapper:action-request',
      data: { type: 'exportSpectraViewerAsBlob' },
    });
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

    const anchor = this.getSpcInfo();
    const spectra = this.sessionSpectra();
    // The anchor, not merely the first .nmrium of its dataset: see getSpcInfo.
    const nmrium = spectra.find((s) => s.kind === 'nmrium' && s.id === anchor?.idx);
    const jdxList = spectra.filter((s) => s.kind === 'jcamp' && s.url);
    const jdx = jdxList[0];
    const zip = spectra.find((s) => s.kind === 'zip');
    const molfile = sample?.molfile || null;

    // If we have a .nmrium file, patch it and send it
    if (nmrium?.file) {
      await this.sendPatchedNmrium(nmrium, jdx, zip, molfile, sample);
      LoadingActions.stop.defer();
      return;
    }

    // Fallback: only .jdx/.zip file available
    if (jdxList.length) {
      const payload = {
        type: 'nmrium',
        data: {
          spectra: jdxList.map((item) => {
            const fileExtension = item.label?.split('.').pop()?.toLowerCase() || 'jdx';
            return {
              id: crypto.randomUUID(),
              source: { jcampURL: `${item.url}/file.${fileExtension}` },
              display: { name: item.label || 'spectrum' },
            };
          }),
          molecules: molfile ? [{ molfile }] : [],
        },
      };
      this.postToNMRium({ type: 'nmr-wrapper:load', data: payload });
    } else if (zip?.url) {

      this.postToNMRium({ type: 'nmr-wrapper:load', data: { type: 'url', data: [`${zip.url}/file.zip`] } });

      const nmriumState = await this.waitForNMRiumDataWithSpectra(30000);
      if (!nmriumState) {
        LoadingActions.stop.defer();
        return;
      }

      // Rename before cleaning, not after: cleaningNMRiumData derives each spectrum's sources[] id
      // from its name, so renaming afterwards would leave selector.root pointing at an id the next
      // save no longer mints.
      if (zip?.label) this.patchZipName(nmriumState, zip?.label);

      const cleaned = cleaningNMRiumData(nmriumState);

      if (molfile) { cleaned.molecules = [{ molfile }]; }

      // Handed back as a versioned .nmrium file, the same way sendPatchedNmrium does: cleaning
      // registered sources[] and dropped each 2D spectrum's data, and a flat, unversioned document
      // in that shape is read as version 0 and migrated to `data: {rr: undefined}`.
      const zipBaseName = this.getFileBaseName(zip.label) || 'spectrum';
      const nmriumFile = this.buildPatchedNmriumFile(`${zipBaseName}.nmrium`, this.versionedForHandOff(cleaned));
      this.postToNMRium({ type: 'nmr-wrapper:load', data: { type: 'file', data: [nmriumFile] } });
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
      // Runs unconditionally, and separately: patchZipAndJcampReference bails out early whenever
      // it cannot work out a preferred url, but a stale sources[] entry is fatal on its own and
      // has to be dealt with either way.
      this.refreshPersistedSources(nmriumObj);
      if (molfile) {
        // Into the document itself: a save writes {version, data}, where a top-level `molecules`
        // would sit beside the document rather than in it.
        (nmriumObj.data || nmriumObj).molecules = [{ molfile }];
      }

      const cleanedNmriumObj = this.versionFlatDocument(cleaningNMRiumData(nmriumObj));
      const patchedFile = this.buildPatchedNmriumFile(nmrium.label, cleanedNmriumObj);
      const fileList = [patchedFile];

      const updatedSpectra = this.state.fetchedSpectra.filter((s) => s.kind === 'jcamp' || s.kind === 'zip');
      updatedSpectra.push({ ...nmrium, file: patchedFile });
      this.setState({ fetchedSpectra: updatedSpectra });

      const payload = { type: 'file', data: fileList };
      this.postToNMRium({ type: 'nmr-wrapper:load', data: payload });
    } catch (err) {
      console.error('Failed to parse/patch .nmrium:', err);
    }
  }

  // Labels a flat, unversioned document that relies on sources[] with the schema it was written in,
  // so NMRium does not read it as version 0: its migration chain would empty sources[] and turn each
  // data-less 2D spectrum into `data: {rr: undefined}`, which throws on load. A flat document with no
  // source-backed item keeps its embedded data and has always loaded as it is, so it is left alone.
  versionFlatDocument(doc) {
    if (!doc || doc.data || doc.version !== undefined || !Array.isArray(doc.sources)) return doc;
    const sourceIds = new Set(doc.sources.map((source) => source?.id).filter(Boolean));
    const reliesOnSources = [...(doc.spectra || []), ...(doc.molecules || [])]
      .some((item) => sourceIds.has(item?.selector?.root));
    return reliesOnSources ? { version: FLAT_NMRIUM_DOC_VERSION, data: doc } : doc;
  }

  // Wraps a flat document built from the live state with the schema version the wrapper reported
  // for that state - the rule nmriumDocumentToSave applies to a save - or, when none was reported,
  // labels it as versionFlatDocument does.
  versionedForHandOff(doc) {
    const { nmriumVersion } = this.state;
    if (doc && !doc.data && Number.isInteger(nmriumVersion)) return { version: nmriumVersion, data: doc };
    return this.versionFlatDocument(doc);
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
    // Last resort for a spectrum carrying neither a source url nor an info.name - the jcamp-loaded
    // shape, where display.name is only the spectrum's uuid. spectrumName falls through to the raw
    // JCAMP TITLE, which is already a stem ("X23827_10.processed_1"): it must not be run through
    // getFileBaseName, which would read ".processed_1" as an extension and strip the curve away.
    const nameFromSpectrum = spectrumName(spectrum);
    const baseFromName = nameFromSpectrum ? nameFromSpectrum.toLowerCase() : '';
    const extFromUrl = this.getFileExtension(oldUrl);
    const extFromInfo = this.getFileExtension(spectrum?.info?.name);
    const targetBase = baseFromUrl || baseFromInfo || baseFromName;
    // No extension is derived from the stem: it has none, and guessing one would only narrow the
    // match away from the very attachment being looked for.
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

  // The archive backing *one* spectrum. findMatchingZip names a single zip for the whole document -
  // read off the first spectrum that has a name - and a dataset may well hold two. Applying that
  // one pick to every spectrum re-points the second archive's member paths at the first archive's
  // url, and the cleaning pass that follows then prunes the second source as unreferenced: the
  // second curve is quietly served from the wrong file. The spectrum's own persisted reference says
  // which archive it came from, so ask that first; the document-wide pick stays as the fallback for
  // a spectrum that carries no reference of its own (every pre-reference document).
  //
  // Runs before refreshPersistedSources, so sources[] still holds the opaque references a save
  // wrote rather than the urls re-minted from them - which is exactly what is wanted here.
  zipForSpectrum(spectrum, root, zipSpectra) {
    if (!zipSpectra?.length || !spectrum) return null;
    const sourceId = spectrum?.selector?.root;
    const source = Array.isArray(root?.sources)
      ? root.sources.find((s) => s?.id && s.id === sourceId)
      : null;
    const refUrl = entryUrl(source?.entries?.[0]) || spectrum?.source?.jcampURL || null;
    if (!isAttachmentRef(refUrl) && !sourceId) return null;
    // No allowSoleCandidate: with one zip the document-wide pick is already that zip, and letting
    // it match unconditionally here would make an unrelated spectrum claim it.
    return findAttachmentForRef(zipSpectra, refUrl, { sourceId, name: spectrum?.info?.name });
  }

  // The download url for an attachment, minted for this open. The extension is the server's cue
  // for what it is serving, so it comes from the attachment's own filename.
  mintAttachmentUrl(attachment) {
    if (!attachment?.url) return null;
    const ext = this.getFileExtension(attachment.label) || 'jdx';
    return `${attachment.url}/file.${ext}`;
  }

  // Re-points one source's entries at freshly minted urls, or null when any of them cannot be
  // re-pointed - a source is only usable if all of it is.
  refreshSourceEntries(entries, sourceId, candidates) {
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const refreshed = entries.map((entry) => {
      const url = entryUrl(entry);
      // Anything that is neither ours nor expiring is someone else's source: leave it be.
      if (url && !isAttachmentRef(url) && !isEphemeralUrl(url)) return entry;

      const attachment = findAttachmentForRef(candidates, url, { sourceId, allowSoleCandidate: true });
      return urlToEntry(this.mintAttachmentUrl(attachment));
    });

    return refreshed.every(Boolean) ? refreshed : null;
  }

  // Re-mints every download url a saved document persisted, before it is handed to NMRium.
  //
  // root.sources[] is the one structure the rest of the patching never touched, and the only one
  // NMRium actually fetches from. Whatever url a save persisted there is dead by now - re-minting
  // on this very open overwrites the server-side token cache keyed on attachment+user, so opening
  // the file is itself what invalidates the token inside it. And readNMRiumObject pulls the whole
  // array through a single `Promise.all`, so one stale entry rejects the read for the entire
  // document: the wrapper reports it to nobody, and the viewer comes up blank.
  //
  // The legacy singular root.source and each spectrum's own source.jcampURL are refreshed too, not
  // because NMRium reads them but because resolveSpectrumSourceUrl consults both *before*
  // sources[]: leaving a stale one behind would have the cleaning pass that follows overwrite the
  // entry just re-minted with the dead url again.
  //
  // An entry that cannot be re-pointed is dropped rather than passed on, together with the
  // selector.root of anything relying on it - a spectrum we cannot restore must not also take its
  // siblings down with it.
  refreshPersistedSources(nmriumObj) {
    const root = nmriumObj?.data || nmriumObj;
    if (!root) return;

    const candidates = (this.state.fetchedSpectra || []).filter((sp) => sp.url);
    const stale = new Set();
    const remintedPath = new Map();

    if (Array.isArray(root.sources) && root.sources.length > 0) {
      root.sources = root.sources.filter((source) => {
        const refreshed = this.refreshSourceEntries(source?.entries, source?.id, candidates);
        if (refreshed) {
          if (refreshed[0] !== source.entries[0] && refreshed[0]?.relativePath) {
            remintedPath.set(source.id, refreshed[0].relativePath);
          }
          source.entries = refreshed;
          return true;
        }
        stale.add(source?.id);
        return false;
      });
    }

    // The legacy singular source sits on the wrapper or on the root depending on who wrote the
    // document - patchZipAndJcampReference reads both, so both get refreshed.
    [...new Set([nmriumObj, root])].forEach((holder) => {
      if (!holder?.source?.entries?.length) return;
      const refreshed = this.refreshSourceEntries(holder.source.entries, holder.source.id, candidates);
      if (refreshed) holder.source = { ...holder.source, entries: refreshed };
      else delete holder.source;
    });

    // A url minted for *this* open starts with a candidate's own url; anything else that expires
    // is left over from a previous one and cannot be revived here.
    const isLive = (url) => candidates.some((att) => url.startsWith(att.url));
    const isDeadUrl = (url) => isEphemeralUrl(url) && !isLive(url);

    (root.spectra || []).forEach((spc) => {
      const jcampURL = spc?.source?.jcampURL;
      if (isAttachmentRef(jcampURL)) {
        const attachment = findAttachmentForRef(candidates, jcampURL, { allowSoleCandidate: true });
        const fresh = this.mintAttachmentUrl(attachment);
        if (fresh) spc.source.jcampURL = fresh;
        else delete spc.source.jcampURL;
      } else if (isDeadUrl(jcampURL)) {
        // patchZipAndJcampReference refreshes this where it can, but not for a zip-based document.
        // resolveSpectrumSourceUrl consults it before anything re-minted above, so a survivor does
        // not merely sit there - it shadows the good entry. Take it out of the way.
        delete spc.source.jcampURL;
      }

      if (!Array.isArray(spc?.sourceSelector?.files)) return;
      // Same story one rung down, and the same treatment: a member path keeps pointing at the
      // right member, a whole-file token url is only in the way.
      const files = spc.sourceSelector.files.filter((f) => typeof f !== 'string' || !isDeadUrl(f));
      if (files.length) spc.sourceSelector.files = files;
      else delete spc.sourceSelector;
    });

    // selector.files is what NMRium filters a source's fetched files by, and a whole-file entry in
    // it is the url that source was fetched from - the dead one, in a document an earlier open
    // saved. Follow the source it belongs to: onto the path just minted for it, or away with it.
    // Member paths inside an archive are the display pass's to re-root, so they are left alone.
    [...(root.spectra || []), ...(root.molecules || [])].forEach((item) => {
      const sourceId = item?.selector?.root;
      if (!sourceId) return;
      if (stale.has(sourceId)) {
        delete item.selector.root;
        delete item.selector.files;
        return;
      }
      const fresh = remintedPath.get(sourceId);
      if (!fresh || !Array.isArray(item.selector.files)) return;
      const files = item.selector.files.map((file) => (archiveMemberPath(file) ? file : fresh));
      item.selector.files = [...new Set(files)];
    });
  }

  patchZipAndJcampReference(nmriumObj, jdxUrl, zipUrl, zipLabel) {
    const root = nmriumObj.data || nmriumObj;
    const sourceRoot = nmriumObj.source || root.source;
    if (!Array.isArray(root?.spectra)) return;

    const fetchedSpectra = this.state.fetchedSpectra || [];
    const jcampSpectra = fetchedSpectra.filter((s) => s.kind === 'jcamp' && s.url);
    const zipSpectra = fetchedSpectra.filter((s) => s.kind === 'zip' && s.url);
    // A document addresses a member inside an archive in two shapes, and both mean zip-based: a
    // live NMRium reference through the archive, and a saved document's bare member path, whose
    // token-bearing prefix was stripped on the way into the file. Detecting only the first - as
    // this did - means every document this wrapper saves reopens as if it were jcamp-based, which
    // both bypasses findMatchingZip and lets the branch below overwrite the member paths with a
    // sibling .jdx url. The bare shape is only conclusive with a zip to resolve it against.
    const spectrumSourceFiles = (s) => [
      ...(Array.isArray(s?.sourceSelector?.files) ? s.sourceSelector.files : []),
      ...(Array.isArray(s?.selector?.files) ? s.selector.files : []),
    ];
    const addressesArchiveMember = root.spectra.some(
      (s) => spectrumSourceFiles(s).some((f) => splitArchiveRef(f).member)
    );
    const addressesBareMember = zipSpectra.length > 0 && root.spectra.some(
      (s) => spectrumSourceFiles(s).some((f) => archiveMemberPath(f))
    );
    const isZipBased = addressesArchiveMember || addressesBareMember;
    const matchingZip = isZipBased ? this.findMatchingZip(root, zipSpectra) : null;
    const effectiveZipUrl = matchingZip?.url ?? zipUrl;
    const effectiveZipLabel = matchingZip?.label ?? zipLabel;
    if ((!jdxUrl && jcampSpectra.length === 0) && !effectiveZipUrl) return;

    const zipUrlWithFile = effectiveZipUrl ? `${effectiveZipUrl}/file.zip` : undefined;
    const firstJcampMatch = !isZipBased && root.spectra.map((s) => this.findMatchingJcamp(s, jcampSpectra)).find(Boolean);
    const jdxUrlWithFile = firstJcampMatch
      ? `${firstJcampMatch.url}/file.${this.getFileExtension(firstJcampMatch.label) || 'jdx'}`
      : (jdxUrl ? `${jdxUrl}/file.jdx` : undefined);
    const preferredUrl = (isZipBased ? zipUrlWithFile : jdxUrlWithFile) || zipUrlWithFile || jdxUrlWithFile;
    if (!preferredUrl) return;

    root.spectra.forEach((s) => {
      if (!s) return;

      const oldUrl = s?.source?.jcampURL
        || s?.sourceSelector?.files?.find((file) => typeof file === 'string');
      const match = !isZipBased ? this.findMatchingJcamp(s, jcampSpectra) : null;
      // Per spectrum, not per document: see zipForSpectrum. Falls back to the document-wide pick,
      // so a single-archive document and a pre-reference one behave exactly as before.
      const spectrumZip = isZipBased ? this.zipForSpectrum(s, root, zipSpectra) : null;
      const spectrumZipUrl = spectrumZip?.url ?? effectiveZipUrl;
      const spectrumZipLabel = spectrumZip?.label ?? effectiveZipLabel;
      const spectrumZipUrlWithFile = spectrumZipUrl ? `${spectrumZipUrl}/file.zip` : undefined;
      let spectrumSourceUrl = (isZipBased && spectrumZipUrlWithFile) || preferredUrl;

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

      if (spectrumZipUrl && spectrumZipLabel) {
        s.display = { ...s.display, name: spectrumZipLabel };
        if (s.info) {
          s.info.name = spectrumZipLabel;
        }
      }

      // Patch the zip references in the nmrium data. These have to come back out as *absolute*
      // urls: resolveSpectrumSourceUrl only accepts `http(s)://`, so writing the bare pathname
      // here - as this did - means the one freshly minted reference on the spectrum is skipped on
      // the next cleaning pass, which then falls back to the stale sources[] entry instead. The
      // two input shapes are a live NMRium state's full reference through the archive, and a saved
      // document's bare member path (its token prefix was stripped on the way into the file).
      if (spectrumZipUrlWithFile && Array.isArray(s?.sourceSelector?.files)) {
        s.sourceSelector.files = s.sourceSelector.files.map((f) => {
          const within = archiveMemberPath(f);
          return within ? `${spectrumZipUrlWithFile}/${within}` : f;
        });
      }

      // selector.files is what NMRium itself filters the fetched archive by - it writes this list
      // when a zip is loaded by url, so a saved document can carry it with no sourceSelector at all.
      // Its entries have to match the members' paths in the collection read from the source, and
      // those are the source entry's relativePath plus the member: neither a bare member path nor
      // an absolute url matches anything. Re-point each onto the archive this open minted, the same
      // url refreshPersistedSources registers, or the source loads and the spectrum stays empty.
      const archivePath = spectrumZipUrlWithFile && urlToEntry(spectrumZipUrlWithFile)?.relativePath;
      if (archivePath && Array.isArray(s?.selector?.files)) {
        s.selector.files = s.selector.files.map((f) => {
          const within = archiveMemberPath(f);
          return within ? `${archivePath}/${within}` : f;
        });
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

    // One .nmrium/.svg per dataset, not per curve: NMRium is always handed a single
    // combined session (sendPatchedNmrium posts exactly one file) and only one .nmrium is
    // ever read back, so a per-curve basename names a document that isn't per-curve.
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

  // The analysis-level button hands over the files of every dataset in the analysis, but a
  // session is saved back into one dataset. Anchor on the dataset holding the .nmrium (the
  // document being reopened), else on the first file's, and use that same anchor both for what
  // is loaded (sessionSpectra) and for where the save lands (prepareDatasets).
  //
  // Within that dataset, prefer the "<stem>.nmrium" a save writes (savingNMRiumWrapperData) over any
  // other .nmrium listed ahead of it - e.g. a per-curve "x.1_bagit.nmrium" left by an earlier save
  // under a per-curve name. Otherwise the document reopened and the one saved diverge: every save
  // lands in "x.nmrium" while every reopen shows the older file.
  getSpcInfo() {
    const { spcInfos } = this.state;
    const isNmrium = (si) => this.getFileExtension(si.label) === 'nmrium';
    const first = spcInfos.find(isNmrium);
    if (!first) return spcInfos[0];

    const saved = spcInfos.find((si) => (
      si.idDt === first.idDt && isNmrium(si) && si.label.split('.').length === 2
    ));
    return saved || first;
  }

  sessionSpectra() {
    const { fetchedSpectra, spcInfos } = this.state;
    const anchor = this.getSpcInfo();
    if (!anchor) return fetchedSpectra || [];

    const inDataset = new Set(spcInfos.filter((si) => si.idDt === anchor.idDt).map((si) => si.idx));
    return (fetchedSpectra || []).filter((s) => inDataset.has(s.id));
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
    const json = JSON.stringify(
      this.nmriumDocumentToSave(nmriumData),
      (key, value) => (ArrayBuffer.isView(value) ? Array.from(value) : value),
      0
    );

    const blob = new Blob([json], { type: 'text/plain' });
    blob.name = `${baseName}.nmrium`;

    return Attachment.fromFile(blob);
  }

  // The document a save writes: the live state cleaned for persistence, in the shape it is stored in.
  nmriumDocumentToSave(nmriumData) {
    const cleanedNMRiumData = cleaningNMRiumData(nmriumData, {
      // Only a fetched attachment can back a reference: the reopen path re-mints from `url`, so
      // resolving a spectrum to a url-less attachment (the .nmrium file itself) would write a
      // reference nothing can ever resolve - and by then the embedded `data` is already gone.
      attachments: (this.state.fetchedSpectra || []).filter((sp) => sp.url),
      forPersistence: true,
    });
    const hasDataProp = !!cleanedNMRiumData.data;
    const root = hasDataProp ? cleanedNMRiumData.data : cleanedNMRiumData;
    const spectra = root?.spectra || [];
    const originalSpectra = nmriumData?.data?.spectra || nmriumData?.spectra || [];
    const has2D = this.state.is2D || originalSpectra.some(isSpectrum2D);
    const hasAnySource =
      !!root?.source
      || !!root?.sources?.length
      || spectra.some((spc) => spc?.source || spc?.sourceSelector || spc?.selector?.root);
    const needsWrapper = has2D && !hasAnySource && !hasDataProp && !nmriumData.version;
    const { nmriumVersion } = this.state;

    // Written as {version, data} with the version the wrapper reported for this state. NMRium reads
    // an unversioned document as version 0 and runs its whole migration chain over it, and that
    // chain empties sources[] and rewrites every FT 2D spectrum without a jcampURL to
    // `data: {rr: spectrum.data}` - `{rr: undefined}` for a spectrum whose data was dropped in favour
    // of a sources[] reference, so reopening it throws. Labelled with its own version, nothing is
    // migrated. The {version: 7} wrap stays as the fallback for a state that never reported one.
    let toSerialize = cleanedNMRiumData;
    if (!hasDataProp && Number.isInteger(nmriumVersion)) {
      toSerialize = { version: nmriumVersion, data: root };
    } else if (needsWrapper) {
      toSerialize = { version: 7, data: root };
    }
    return toSerialize;
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
      nmriumVersion: null,
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
          fullscreen
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
