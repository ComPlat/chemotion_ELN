import { FN } from '@complat/react-spectra-editor';
const acceptables = ['jdx', 'dx', 'jcamp', 'mzml', 'mzxml', 'raw', 'cdf', 'zip', 'gz', 'tar'];

const JcampIds = (container) => {
  let origJcampIds = [];
  let geneJcampIds = [];
  let editedJcampsIds = [];

  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isJcamp = acceptables.indexOf(ext.toLowerCase()) >= 0;
        const typ = fns.length > 1 ? fns[fns.length - 2] : false;
        const notOrig = typ === 'peak' || typ === 'edit';
        if (isJcamp) {
          if (notOrig) {
            geneJcampIds = [...geneJcampIds, att.id];
            editedJcampsIds = [...editedJcampsIds, att.id];
          } else {
            origJcampIds = [...origJcampIds, att.id];
          }
        }
      } catch (err) {
        // just ignore
      }
    });
  });
  return { orig: origJcampIds, gene: geneJcampIds, edited: editedJcampsIds };
};

const extractJcampFiles = (container) => {
  let files = [];
  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isJcamp = acceptables.indexOf(ext.toLowerCase()) >= 0;
        const isApp = [
          'idle', 'queueing', 'done',
          'backup', 'image',
          'failure', 'non_jcamp',
        ].indexOf(att.aasm_state) < 0;
        if (isJcamp && isApp) {
          const file = Object.assign({}, att, {
            idDt: dt.id,
          });
          files = [...files, file];
        }
      } catch (err) {
        // just ignore
      }
    });
  });
  return files;
};

const extractJcampWithFailedFiles = (container) => {
  let files = [];
  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isJcamp = acceptables.indexOf(ext.toLowerCase()) >= 0;
        const isApp = [
          'idle', 'queueing', 'done',
          'backup', 'image', 'non_jcamp',
        ].indexOf(att.aasm_state) < 0;
        if (isJcamp && isApp) {
          const file = Object.assign({}, att, {
            idDt: dt.id,
          });
          files = [...files, file];
        }
      } catch (err) {
        // just ignore
      }
    });
  });
  return files;
};

const extractNMRiumFiles = (container) => {
  let files = [];
  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isNMRium = ext.toLowerCase() === 'nmrium';

        if (isNMRium) {
          const file = Object.assign({}, att, {
            idDt: dt.id,
          });
          files = [...files, file];
        }
      } catch (err) {
        // just ignore
      }
    });
  });
  return files;
};

const extractAnalysesId = (sample, container) => {
  let idAe = null;
  sample && sample.analysesContainers().forEach((ae) => {
    ae.children.forEach((ai) => {
      if (container.id === ai.id) {
        idAe = ae.id;
      }
    });
  });
  return idAe;
};

const BuildSpcInfos = (sample, container) => {
  if (!sample || !container) return [];
  const files = extractJcampFiles(container);
  if (files.length < 1) return [];
  const idAe = extractAnalysesId(sample, container);
  return files.map((file) => (
    {
      value: null,
      label: file.filename,
      title: sample.short_label,
      idSp: sample.id,
      idAe,
      idAi: container.id,
      idDt: file.idDt,
      idx: file.id,
    }
  ));
};

const BuildSpcInfosForNMRDisplayer = (sample, container) => {
  if (!sample || !container) return [];
  let files = extractJcampWithFailedFiles(container);
  const nmriumFiles = extractNMRiumFiles(container);
  files.push(...nmriumFiles);
  if (files.length < 1) return [];
  const idAe = extractAnalysesId(sample, container);
  return files.map((file) => (
    {
      value: null,
      label: file.filename,
      title: sample.short_label,
      idSp: sample.id,
      idAe,
      idAi: container.id,
      idDt: file.idDt,
      idx: file.id,
    }
  ));
};

const listNMROntology = (chmos, storedSet, parentIsNMR = false) => {
  if (Array.isArray(chmos)) {
    chmos.forEach((obj) => {
      const { children } = obj;
      if (children && children.length > 0) {
        children.forEach((child) => {
          listNMROntology(child, storedSet);
        });
      } else {
        return storedSet;
      }
    });
  } else {
    const { children, value } = chmos;
    let isNMR = parentIsNMR;
    if (value && (value.toLowerCase().includes('nuclear magnetic resonance') || parentIsNMR)) {
      storedSet.add(value);
      isNMR = true;
    } else if(typeof chmos === 'string' && (chmos.toLowerCase().includes('nuclear magnetic resonance') || parentIsNMR)) {
      storedSet.add(value);
      isNMR = true;
    } else {
      isNMR = false;
    }
    if (children && children.length > 0) {
      children.forEach((child) => {
        listNMROntology(child, storedSet, isNMR);
      });
    } else {
      return storedSet;
    }
  }
  return storedSet;
};

const isNMRKind = (container, chmos = []) => {
  if (!(container && container.extended_metadata && container.extended_metadata.kind)) return false;
  const { extended_metadata } = container; // eslint-disable-line
  const { kind } = extended_metadata; // eslint-disable-line
  let setToBeStored = new Set([]);
  const ontologies = Array.from(listNMROntology(chmos, setToBeStored));
  const filtered = ontologies.filter((ontology) => {
    return kind === ontology || kind.toLowerCase().includes(ontology);
  });
  return filtered.length > 0;
};

// A spectrum's dimension may be recorded on info, originalInfo, meta or display depending on
// how/when it was populated; check all four so 2D detection agrees everywhere it's needed.
// display is what makes a *previously saved* spectrum still recognisable: an older cleaner deleted
// info/originalInfo/meta from a source-backed 2D spectrum before writing it out, so on reopen
// display.dimension is the only surviving record that it was 2D — and without that this whole
// migration is skipped for exactly the files that most need it.
const isSpectrum2D = (spc) => (
  spc?.info?.dimension === 2
  || spc?.originalInfo?.dimension === 2
  || spc?.meta?.dimension === 2
  || spc?.display?.dimension === 2
);

// The raw JCAMP header keeps the source file's stem in TITLE, as a string or as an array of
// repeats. It is the last place a spectrum's real name survives.
const metaTitle = (spc) => {
  const title = spc?.meta?.TITLE;
  const value = Array.isArray(title)
    ? title.find((entry) => typeof entry === 'string' && entry.trim())
    : title;
  return (typeof value === 'string' && value.trim()) ? value.trim() : null;
};

// The name to identify a spectrum by. NMRium defaults display.name to the spectrum's own id when
// nothing set it - which is what a spectrum loaded straight from a jcamp ends up with - so a
// display.name equal to the id names no file and must not be treated as one: buildSourceId would
// key on a uuid, and findMatchingJcamp could not match the spectrum back to its attachment.
const spectrumName = (spc) => {
  const named = (spc?.display?.name && spc.display.name !== spc?.id) ? spc.display.name : null;
  return named
    || spc?.info?.name
    || spc?.originalInfo?.name
    || spc?.meta?.name
    || metaTitle(spc)
    || null;
};

const SOURCE_ID_PREFIX = 'nmrium-src-';
const ARCHIVE_MARKER = '/file.zip/';
const isAbsoluteUrl = (value) => typeof value === 'string' && /^https?:\/\//.test(value);

// Splits `<archive>/file.zip/exp1/pdata/1/2rr` into the archive itself and the path of the member
// inside it. Both halves matter and they go to different places: a `sources[]` entry must address
// the archive (the server serves the whole zip), while the member path is what NMRium filters the
// fetched file collection down to, via the spectrum's own selector.files.
const splitArchiveRef = (value) => {
  const idx = typeof value === 'string' ? value.indexOf(ARCHIVE_MARKER) : -1;
  if (idx < 0) return { archive: value, member: null };
  return {
    archive: value.slice(0, idx + ARCHIVE_MARKER.length - 1),
    member: value.slice(idx + ARCHIVE_MARKER.length),
  };
};

const entryUrl = (entry) => (
  (entry?.baseURL && entry?.relativePath) ? `${entry.baseURL}${entry.relativePath}` : null
);

// A JCAMP/zip file's own filename is a stable, already-trusted key in this file (patchZipName,
// findMatchingZip, findMatchingJcamp in NMRiumDisplayer.js all match spectra by it) — unlike the
// token URLs, which are re-minted (and change) on every viewer open. Use it to derive a `sources[]`
// id that stays the same across saves, so the same physical file always resolves to one entry.
const buildSourceId = (label) => {
  if (!label) return null;
  const slug = label.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `${SOURCE_ID_PREFIX}${slug}` : null;
};

// Resolves the best currently-known absolute URL for a spectrum's source, whichever form it's in.
// Order matters: the download URLs carry short-lived, per-open tokens (48h, counter-limited), so a
// freshly re-minted reference always wins over one persisted by an earlier save. Only
// `source.jcampURL`, `sourceSelector.files` and the legacy global `root.source.entries[0]` are
// refreshed on open (patchZipAndJcampReference); a `sources[]` entry is not, so it is the last
// resort — better than nothing for a spectrum whose `data` a previous save already dropped.
const resolveSpectrumSourceUrl = (spc, root) => {
  if (spc?.source?.jcampURL) return splitArchiveRef(spc.source.jcampURL).archive;

  const fileUrl = spc?.sourceSelector?.files?.find(isAbsoluteUrl);
  if (fileUrl) return splitArchiveRef(fileUrl).archive;

  const fromGlobal = entryUrl(root?.source?.entries?.[0]);
  if (fromGlobal) return fromGlobal;

  const existingSource = Array.isArray(root?.sources)
    ? root.sources.find((source) => source.id === spc?.selector?.root)
    : null;
  return entryUrl(existingSource?.entries?.[0]);
};

// Registers `url` in root.sources[] and returns the id that addresses it, or null when it can't be
// registered. NMRium's own reader (readNMRiumObject) re-fetches a spectrum's data only when its
// selector.root matches an id here, so this is what actually lets us stop embedding `data` for a
// source-backed spectrum. `claimed` maps url -> id for this cleaning pass: two spectra backed by
// the same file share one entry, while two backed by *different* files never collapse onto one id
// (the preferred id is suffixed instead of being repointed at the second file).
const ensureSource = (root, preferredId, url, claimed) => {
  if (!preferredId || !isAbsoluteUrl(url)) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return null;
  }
  const entry = { relativePath: parsed.pathname, baseURL: parsed.origin };
  if (!Array.isArray(root.sources)) root.sources = [];

  const alreadyClaimed = claimed.get(url);
  if (alreadyClaimed) return alreadyClaimed;

  let id = preferredId;
  let suffix = 1;
  const taken = new Set(claimed.values());
  while (taken.has(id)) {
    suffix += 1;
    id = `${preferredId}-${suffix}`;
  }

  const existing = root.sources.find((source) => source.id === id);
  if (existing) {
    existing.entries = [entry];
  } else {
    root.sources.push({ id, entries: [entry] });
  }
  claimed.set(url, id);
  return id;
};

const cleaningNMRiumData = (nmriumData) => {
  if (!nmriumData) return null;
  const cleanedNMRiumData = { ...nmriumData };

  // Copy the wrapped root too: without this `root` is the caller's own object, so the deletes and
  // the sources[] registry below would leak back into the live NMRium state this was cleaned from.
  const wasWrapped = !!cleanedNMRiumData.data;
  // Copy the wrapper so the mutations below don't reach the caller's object - but only when it
  // really is one: `data` can legitimately be a non-object (a bare string), and spreading that
  // would turn it into a char-indexed object and change the returned payload.
  if (wasWrapped && typeof cleanedNMRiumData.data === 'object') {
    cleanedNMRiumData.data = { ...cleanedNMRiumData.data };
  }
  const root = wasWrapped ? cleanedNMRiumData.data : cleanedNMRiumData;
  const { spectra } = root;
  if (!Array.isArray(spectra)) return cleanedNMRiumData;

  delete root.actionType;
  if (Array.isArray(root.sources)) root.sources = root.sources.map((source) => ({ ...source }));
  const hasGlobalSource = !!root.source || root.sources?.length > 0;
  const claimedSources = new Map();

  const newSpectra = spectra.map((spc) => {
    const tmpSpc = { ...spc };
    const hasLocalSource = !!(spc && (spc.source || spc.sourceSelector || spc.selector?.root));
    const hasSource = hasLocalSource || hasGlobalSource;
    // Whether this is a 2D spectrum backed by a source.
    const is2DWithSource = hasSource && isSpectrum2D(tmpSpc);

    // originalData is safe to drop: NMRium's own loader always recomputes it fresh from `data`.
    delete tmpSpc.originalData;

    // Keep the spectrum name in display.name and drop the stale originalInfo duplicate (NMRium's
    // loader always recomputes it fresh from `info`, same as originalData). `meta` is NOT dropped:
    // unlike originalData/originalInfo, NMRium just passes it through as-is rather than regenerating
    // it, so we can't assume it's safe to lose. `info` itself must stay fully intact; NMRium relies
    // on it (e.g. dimension, isFid) to read `data`.
    if (is2DWithSource) {
      const resolvedName = spectrumName(tmpSpc);
      if (resolvedName) {
        tmpSpc.display = { ...tmpSpc.display, name: resolvedName };
      }
      // info may be sparse on legacy spectra where dimension/isFid were only ever mirrored into
      // originalInfo/meta; backfill it before dropping the originalInfo duplicate. Only the two
      // known load-bearing keys are taken from `meta` — it is a raw JCAMP header dictionary, not an
      // info-shaped object, and it stays on the spectrum anyway.
      // Nothing may be recoverable at all (a spectrum written by the cleaner that deleted all
      // three): leave `info` absent rather than writing an empty object, so NMRium sees a spectrum
      // with no info and rebuilds it from the source instead of one that claims to have none.
      const backfilledInfo = { ...tmpSpc.originalInfo, ...tmpSpc.info };
      ['dimension', 'isFid'].forEach((key) => {
        if (backfilledInfo[key] === undefined && tmpSpc.meta?.[key] !== undefined) {
          backfilledInfo[key] = tmpSpc.meta[key];
        }
      });
      if (Object.keys(backfilledInfo).length) {
        tmpSpc.info = backfilledInfo;
      } else {
        delete tmpSpc.info;
      }
      delete tmpSpc.originalInfo;
      // Remove the filters if they are not valid
      if (Array.isArray(tmpSpc.filters)) {
        tmpSpc.filters = tmpSpc.filters.filter(
          (filter) => filter && typeof filter === 'object' && !Object.prototype.hasOwnProperty.call(filter, 'error')
        );
      }

      // NMRium's own reader only re-fetches a spectrum's data when selector.root matches an id in
      // the top-level sources[] registry — it never uses source/sourceSelector for that. Build the
      // real reference so `data` can finally be dropped instead of duplicated into the saved JSON.
      // If no URL can be resolved, leave `data` embedded: that's the same safe fallback this file
      // relied on before this was wired up, not a regression.
      const sourceUrl = resolveSpectrumSourceUrl(tmpSpc, root);
      const sourceId = ensureSource(root, buildSourceId(resolvedName), sourceUrl, claimedSources);
      if (sourceId) {
        // sourceSelector.files may address individual members *within* a shared source (e.g. one
        // experiment inside a multi-spectrum zip, all sharing one sources[] id); NMRium's reader
        // filters the fetched file collection down to selector.files before parsing, so without
        // this a shared zip source can't tell spectra apart. Entries arrive either as a full
        // URL/server path through the archive (`.../file.zip/exp1/...`, which has to be reduced to
        // the member path) or already as a bare member path. Anything else does not address a
        // member and is dropped.
        const filesWithinSource = tmpSpc.sourceSelector?.files
          ?.map((file) => {
            if (typeof file !== 'string') return null;
            const { member } = splitArchiveRef(file);
            if (member) return member;
            return (isAbsoluteUrl(file) || file.startsWith('/')) ? null : file;
          })
          .filter(Boolean);
        tmpSpc.selector = {
          ...tmpSpc.selector,
          root: sourceId,
          ...(filesWithinSource?.length ? { files: filesWithinSource } : {}),
        };
        delete tmpSpc.data;
      }
    }

    return tmpSpc;
  });

  root.spectra = [...newSpectra];

  // Drop our own now-unreferenced entries: their URLs carry per-open download tokens that nothing
  // refreshes, so leaving one behind after a rename only accumulates dead references. Entries we
  // did not mint are left alone.
  if (Array.isArray(root.sources)) {
    const referenced = new Set(newSpectra.map((spc) => spc?.selector?.root).filter(Boolean));
    root.sources = root.sources.filter(
      (source) => referenced.has(source?.id) || !`${source?.id}`.startsWith(SOURCE_ID_PREFIX)
    );
  }

  // Deliberately not forcing a {version, data} wrap or an explicit version, even though a spectrum
  // here may now depend on sources[] actually being processed on load: a real, working .nmrium
  // capture has neither (flat top-level sources/spectra, no version at all) and reloads correctly,
  // while an explicit version apparently opts a document out of whatever normalization an unversioned
  // one gets put through on load. Forcing our own wrap previously broke exactly this case.
  return cleanedNMRiumData;
};

const inlineNotation = (layout, data, metadata) => {
  let formattedString = '';
  let quillData = [];
  if (!data) return { quillData, formattedString };

  const {
    scanRate, voltaData, sampleName
  } = data;
  const {
    cvConc, cvSolvent, cvSolventOthers, cvRef, cvRefOthers, cvScanRate,
  } = metadata;

  switch (layout) {
    case FN.LIST_LAYOUT.CYCLIC_VOLTAMMETRY: {
      if (!voltaData) {
        break;
      }
      let refString = '';
      let nonRefString = '';
      let refOps = [];
      const nonRefOps = [];
      const { listPeaks, xyData } = voltaData;
      const { x } = xyData;
      listPeaks.forEach((item) => {
        const {
          isRef, e12, max, min,
        } = item;
        const e12Str = e12 ? FN.strNumberFixedLength(e12, 3) : '0';
        let scanRateStr = cvScanRate ? cvScanRate : '0';
        scanRateStr = scanRateStr === '0' && scanRate ? FN.strNumberFixedLength(scanRate, 3) : scanRateStr;
        if (isRef) {
          const posNegString = x[0] > x[1] ? 'neg.' : 'pos.';
          const concentrationStr = cvConc || '<conc. of sample>';
          const solventStr = (cvSolvent === 'others' ? cvSolventOthers : cvSolvent) || '<solvent>';
          let internalRefStr = "(Fc+/Fc)";
          refOps = [
            { insert: `CV (${concentrationStr} in ${solventStr} vs. Ref ` },
            { insert: `(Fc` },
            { insert: '+', attributes: { script: 'super' } },
            { insert: `/Fc) ` },
            { insert: `= ${e12Str} V, v = ${scanRateStr} V/s, to ${posNegString}):` },
          ];
          if (cvRef === 'decamethylferrocene') {
            internalRefStr = "(Me10Fc+/Me10Fc)";
            refOps = [
              { insert: `CV (${concentrationStr} in ${solventStr} vs. Ref ` },
              { insert: `(Me` },
              { insert: '10', attributes: { script: 'sub' } },
              { insert: `Fc` },
              { insert: '+', attributes: { script: 'super' } },
              { insert: `/Me` },
              { insert: '10', attributes: { script: 'sub' } },
              { insert: `Fc) ` },
              { insert: `= ${e12Str} V, v = ${scanRateStr} V/s, to ${posNegString}):` },
            ];
          }
          else if (cvRefOthers) {
            internalRefStr = `(${cvRefOthers})`;
            refOps = [
              { insert: `CV (${concentrationStr} in ${solventStr} vs. Ref ${internalRefStr} ` },
              { insert: `= ${e12Str} V, v = ${scanRateStr} V/s, to ${posNegString}):` },
            ];
          }
          refString = `CV (${concentrationStr} in ${solventStr} vs. Ref ${internalRefStr} = ${e12Str} V, v = ${scanRateStr} V/s, to ${posNegString}):`;

        } else {
          const delta = (max && min) ? FN.strNumberFixedLength(Math.abs(max.x - min.x) * 1000, 3) : '0';
          nonRefString += `\nE1/2 = ([${sampleName}] , ΔEp) = ${e12Str} V (${delta} mV)`;
          const currentNoneOps = [
            { insert: '\nE' },
            { insert: '1/2', attributes: { script: 'sub' } },
            { insert: ` = ([${sampleName}] , ΔE` },
            { insert: 'p', attributes: { script: 'sub' } },
            { insert: `) = ${e12Str} V (${delta} mV)` },
          ];
          nonRefOps.push(...currentNoneOps);
        }
      });

      formattedString = refString + nonRefString;
      quillData = [...refOps, ...nonRefOps];
      break;
    }
    default:
      break;
  }

  return { quillData, formattedString };
};

export {
  BuildSpcInfos, BuildSpcInfosForNMRDisplayer, JcampIds, isNMRKind, isSpectrum2D, spectrumName,
  cleaningNMRiumData, inlineNotation,
}; // eslint-disable-line
