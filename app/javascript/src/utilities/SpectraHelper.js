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

// A spectrum's dimension may be recorded on info, originalInfo, or meta depending on how/when it
// was populated; check all three so 2D detection agrees everywhere it's needed.
const isSpectrum2D = (spc) => (
  spc?.info?.dimension === 2
  || spc?.originalInfo?.dimension === 2
  || spc?.meta?.dimension === 2
);

// A JCAMP/zip file's own filename is a stable, already-trusted key in this file (patchZipName,
// findMatchingZip, findMatchingJcamp in NMRiumDisplayer.js all match spectra by it) — unlike the
// token URLs, which are re-minted (and change) on every viewer open. Use it to derive a `sources[]`
// id that stays the same across saves, so the same physical file always resolves to one entry.
const buildSourceId = (label) => {
  if (!label) return null;
  const slug = label.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `nmrium-src-${slug}` : null;
};

// Resolves the best currently-known absolute URL for a spectrum's source, whichever form it's
// currently in: the ad hoc source/sourceSelector fields (first-time migration), the legacy global
// root.source.entries[0] (very old saves), or an already-migrated sources[] entry matched by the
// spectrum's own selector.root (subsequent saves, once NMRium has echoed it back).
const resolveSpectrumSourceUrl = (spc, root) => {
  const localUrl = spc?.source?.jcampURL
    || spc?.sourceSelector?.files?.find((file) => typeof file === 'string' && /^https?:\/\//.test(file));
  if (localUrl) return localUrl;

  const existingSource = Array.isArray(root?.sources)
    ? root.sources.find((source) => source.id === spc?.selector?.root)
    : null;
  const entry = existingSource?.entries?.[0] || root?.source?.entries?.[0];
  return (entry?.baseURL && entry?.relativePath) ? `${entry.baseURL}${entry.relativePath}` : null;
};

// Finds or creates root.sources[]'s entry for `id`, always refreshing it to `url`: NMRium's own
// reader (readNMRiumObject) re-fetches a spectrum's data only when its selector.root matches an id
// here, so this is what actually lets us stop embedding `data` for a source-backed spectrum.
const ensureSource = (root, id, url) => {
  if (!id || !url || !/^https?:\/\//.test(url)) return;
  const parsed = new URL(url);
  const entry = { relativePath: parsed.pathname, baseURL: parsed.origin };
  if (!Array.isArray(root.sources)) root.sources = [];
  const existing = root.sources.find((source) => source.id === id);
  if (existing) {
    existing.entries = [entry];
  } else {
    root.sources.push({ id, entries: [entry] });
  }
};

const cleaningNMRiumData = (nmriumData) => {
  if (!nmriumData) return null;
  const cleanedNMRiumData = { ...nmriumData };

  const wasWrapped = !!cleanedNMRiumData.data;
  const root = wasWrapped ? cleanedNMRiumData.data : cleanedNMRiumData;
  const { spectra } = root;
  if (!Array.isArray(spectra)) return cleanedNMRiumData;

  delete root.actionType;
  const hasGlobalSource = !!root.source || !!(Array.isArray(root.sources) && root.sources.length);

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
      const spectrumName = tmpSpc?.display?.name
        || tmpSpc?.info?.name
        || tmpSpc?.originalInfo?.name
        || tmpSpc?.meta?.name;
      if (spectrumName) {
        tmpSpc.display = { ...tmpSpc.display, name: spectrumName };
      }
      // info may be sparse on legacy spectra where dimension/isFid were only ever mirrored into
      // originalInfo/meta; backfill it before dropping the originalInfo duplicate.
      tmpSpc.info = { ...tmpSpc.meta, ...tmpSpc.originalInfo, ...tmpSpc.info };
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
      const sourceId = buildSourceId(spectrumName);
      const sourceUrl = resolveSpectrumSourceUrl(tmpSpc, root);
      if (sourceId && sourceUrl) {
        ensureSource(root, sourceId, sourceUrl);
        // sourceSelector.files may hold relative paths *within* a shared source (e.g. one entry per
        // experiment inside a multi-spectrum zip, all sharing one sources[] id); NMRium's reader
        // filters the fetched file collection down to selector.files before parsing, so without
        // this a shared zip source can't tell spectra apart. Absolute URLs there aren't paths within
        // the source, so they're excluded.
        const filesWithinSource = tmpSpc.sourceSelector?.files?.filter(
          (file) => typeof file === 'string' && !/^https?:\/\//.test(file)
        );
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
  BuildSpcInfos, BuildSpcInfosForNMRDisplayer, JcampIds, isNMRKind, isSpectrum2D, cleaningNMRiumData, inlineNotation,
  buildSourceId, ensureSource,
}; // eslint-disable-line
