// LCMS runtime helpers used by ViewSpectra

import { FN } from '@complat/react-spectra-editor';
import base64 from 'base-64';

export const LCMS_CACHE_DEFAULT_LIMIT = 16;
export const LCMS_POLARITY_NEUTRAL = 'neutral';
export const LCMS_DEFAULT_TRIGGER = 'user_click';
export const LCMS_PAGE_HEADER_REGEX = /##PAGE\s*=\s*"?([0-9.+\-Ee]+)"?/;
export const LCMS_LABEL_REGEX = {
  uvvis: /(?:^|[._-])uvvis(?:[._-]|$)/,
  tic: /(?:^|[._-])tic(?:[._-]|$)/,
  positive: /(?:^|[._-])(plus|positive|pos)(?:[._-]|$)/,
  negative: /(?:^|[._-])(minus|negative|neg)(?:[._-]|$)/,
};

// Same key as react-spectra-editor `reducer_hplc_ms/persistence.js` (sessionStorage).
const LC_TIC_STORAGE_PREFIX = 'rsEditor.lcmsTic:';

export const readPersistedLcmsTicHints = (datasetKey) => {
  if (datasetKey == null) return {};
  try {
    const raw = sessionStorage.getItem(`${LC_TIC_STORAGE_PREFIX}${datasetKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch (_error) {
    return {};
  }
};

export const normalizePersistedPolarity = (value) => {
  if (value == null || value === '') return null;
  if (value === 0 || value === '0') return 'positive';
  if (value === 1 || value === '1') return 'negative';
  if (value === 2 || value === '2') return LCMS_POLARITY_NEUTRAL;
  const s = String(value).toLowerCase();
  if (s === 'positive' || s === 'pos' || s === 'plus') return 'positive';
  if (s === 'negative' || s === 'neg' || s === 'minus') return 'negative';
  if (s === 'neutral' || s === 'neu') return LCMS_POLARITY_NEUTRAL;
  return null;
};

export const entityPolarity = (entity) => (
  entity?.lcmsPolarity || entity?.lcms_polarity || null
);

export const resolveRuntimePolarity = (runtime, override = null) => (
  override || runtime?.preferredPolarity || LCMS_POLARITY_NEUTRAL
);

export const resolveRuntimeRetentionTime = (runtime, override = null) => (
  override ?? runtime?.preferredRetentionTime ?? 0
);

export const resolveLcmsDisplayEntity = (runtime) => {
  if (!runtime?.currentMultiEntities?.length) return null;
  let entity = runtime.uvvisEntity
    || runtime.baseEntities?.find((ent) => ent?.layout && FN.isLCMsLayout(ent.layout))
    || runtime.currentMsEntity
    || runtime.currentMultiEntities[runtime.currentMultiEntities.length - 1];
  if (entity && runtime.datasetKey != null && entity.idDt == null) {
    entity = { ...entity, idDt: runtime.datasetKey };
  }
  return entity;
};

const withPolarityFields = (entity, polarity) => (
  polarity ? { ...entity, lcmsPolarity: polarity, lcms_polarity: polarity } : entity
);

const normaliseRt = (rt) => {
  const num = Number(rt);
  if (!Number.isFinite(num)) return '';
  return num.toFixed(5);
};

export const lcmsRequestKey = ({ attachmentId, retentionTime, polarity }) => (
  `${attachmentId ?? ''}::${normaliseRt(retentionTime)}::${polarity || LCMS_POLARITY_NEUTRAL}`
);

export class LcmsPageCache {
  constructor(limit = LCMS_CACHE_DEFAULT_LIMIT) {
    this.limit = limit > 0 ? limit : LCMS_CACHE_DEFAULT_LIMIT;
    this.entries = new Map();
  }

  get(key) {
    if (!this.entries.has(key)) return null;
    const value = this.entries.get(key);
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }

  clear() {
    this.entries.clear();
  }

  size() {
    return this.entries.size;
  }
}

export const formatLcmsErrorMessage = (error) => {
  if (!error) return 'Unable to load requested LC/MS page.';
  if (error.name === 'TimeoutError') return 'LC/MS page request timed out. Please retry.';
  switch (error.code) {
    case 'page_not_found':
      return 'No LC/MS page matches this retention time and polarity.';
    case 'attachment_not_found':
      return 'Source LC/MS attachment not found.';
    default:
      return 'Unable to load requested LC/MS page.';
  }
};

const labelOf = (spcInfo) => (spcInfo?.label || '').toLowerCase();

export const isUvvisSpectrumInfo = (spcInfo) => LCMS_LABEL_REGEX.uvvis.test(labelOf(spcInfo));
export const isTicSpectrumInfo = (spcInfo) => LCMS_LABEL_REGEX.tic.test(labelOf(spcInfo));
export const isPositiveSpectrumInfo = (spcInfo) => LCMS_LABEL_REGEX.positive.test(labelOf(spcInfo));
export const isNegativeSpectrumInfo = (spcInfo) => LCMS_LABEL_REGEX.negative.test(labelOf(spcInfo));

const polarityFromInfo = (info) => {
  if (isPositiveSpectrumInfo(info)) return 'positive';
  if (isNegativeSpectrumInfo(info)) return 'negative';
  return LCMS_POLARITY_NEUTRAL;
};

export const lcmsPageValue = (entity) => {
  if (!entity) return null;
  const candidates = [entity.pageValue, entity.page, entity.pageSymbol];
  for (let i = 0; i < candidates.length; i += 1) {
    const parsed = Number(candidates[i]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const isMissingRetentionTime = (rt) => rt == null || rt === '';

export const lcmsSameRequest = (a, b) => {
  if (!a || !b) return false;
  if ((a.polarity || LCMS_POLARITY_NEUTRAL) !== (b.polarity || LCMS_POLARITY_NEUTRAL)) return false;
  const aMissing = isMissingRetentionTime(a.retentionTime);
  const bMissing = isMissingRetentionTime(b.retentionTime);
  if (aMissing && bMissing) return true;
  if (aMissing || bMissing) return false;
  const aRt = Number(a.retentionTime);
  const bRt = Number(b.retentionTime);
  if (!Number.isFinite(aRt) || !Number.isFinite(bRt)) return false;
  return Math.abs(aRt - bRt) < 1e-5;
};

export const decodeFetchedSpectrum = (fileObj) => {
  if (!fileObj?.file) return null;
  try {
    const raw = new TextDecoder('utf-8')
      .decode(new Uint8Array([...(base64.decode(fileObj.file))].map((ch) => ch.charCodeAt(0))));
    const pageHeaderMatch = raw.match(LCMS_PAGE_HEADER_REGEX);
    const jcamp = FN.ExtractJcamp(raw);
    const { entity, isExist } = FN.buildData(jcamp);
    if (!isExist || !entity) return null;
    return {
      jcamp,
      entity,
      predictions: fileObj.predictions || null,
      rawPageHeader: pageHeaderMatch ? Number(pageHeaderMatch[1]) : null,
      hasRawPageHeader: !!pageHeaderMatch,
    };
  } catch (_error) {
    return null;
  }
};

export const applyLcmsPageMetadata = (
  entity,
  retentionTime,
  rawPageHeader = null,
  polarity = null,
) => {
  if (!entity) return entity;

  if (Number.isFinite(lcmsPageValue(entity))) {
    return withPolarityFields(entity, polarity);
  }

  const headerPage = Number(rawPageHeader);
  if (Number.isFinite(headerPage)) {
    return withPolarityFields({
      ...entity,
      page: headerPage,
      pageValue: headerPage,
      pageSymbol: String(rawPageHeader),
    }, polarity);
  }

  const rt = Number(retentionTime);
  if (!Number.isFinite(rt)) {
    return withPolarityFields(entity, polarity);
  }
  return withPolarityFields({
    ...entity,
    page: rt,
    pageValue: rt,
    pageSymbol: String(rt),
  }, polarity);
};

// Picks the first finite x value out of a TIC JCamp to seed the initial retention time.
const extractInitialRetentionTime = (jcamp) => {
  const spectra = Array.isArray(jcamp?.spectra) ? jcamp.spectra : [];
  const first = spectra[0] || {};
  const candidates = [
    first?.data?.[0]?.x?.[0],
    first?.data?.x?.[0],
    first?.data?.[0]?.x,
    first?.x?.[0],
    first?.peaks?.[0]?.x,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const parsed = Number(candidates[i]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

// Reads the `lcms_mz_page` value previously persisted on the UVVIS pivot (snake/camel/$CSLCMSMZPAGE).
const extractInitialLcmsMzPage = (entry) => {
  if (!entry) return null;
  const candidates = [
    entry?.built?.entity?.lcms_mz_page,
    entry?.built?.entity?.lcmsMzPage,
    entry?.spc?.jcamp?.lcms_mz_page,
    entry?.spc?.jcamp?.lcmsMzPage,
    entry?.spc?.jcamp?.info?.$CSLCMSMZPAGE,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const parsed = Number(candidates[i]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

// Copies the JCamp's persisted `lcms_mz_page` onto the entity so the editor can restore it on reopen.
const applyLcmsBootstrapMetadata = (entity, jcamp) => {
  if (!entity) return entity;
  const lcmsMzPage = Number(
    jcamp?.lcms_mz_page
    ?? jcamp?.lcmsMzPage
    ?? jcamp?.info?.$CSLCMSMZPAGE,
  );
  if (!Number.isFinite(lcmsMzPage)) return entity;
  return {
    ...entity,
    lcms_mz_page: lcmsMzPage,
    lcmsMzPage,
  };
};

// Bootstraps the LCMS runtime descriptor (UVVIS pivot, TIC base, optional MS) consumed by ViewSpectra/SpectraEditor.
export const buildInitialLcmsEntities = (listMuliSpcs, listEntityFiles) => {
  if (!Array.isArray(listMuliSpcs) || !Array.isArray(listEntityFiles)) return null;

  const pairs = listMuliSpcs.map((spc, index) => {
    const built = spc?.jcamp ? FN.buildData(spc.jcamp) : null;
    const entity = built?.entity ? applyLcmsBootstrapMetadata(built.entity, spc.jcamp) : null;
    return {
      spc,
      info: listEntityFiles[index],
      built: entity ? { ...built, entity } : built,
    };
  }).filter((entry) => entry.info && entry.built?.entity);

  if (pairs.length === 0) return null;
  const lcmsPairs = pairs.filter((entry) => FN.isLCMsLayout(entry.built.entity.layout));
  if (lcmsPairs.length === 0) return null;

  const uvvisPair = lcmsPairs.find((entry) => isUvvisSpectrumInfo(entry.info)) || lcmsPairs[0];
  if (!uvvisPair?.info) return null;

  const ticPairs = lcmsPairs
    .filter((entry) => isTicSpectrumInfo(entry.info))
    .sort((a, b) => (a.info.label || '').localeCompare(b.info.label || ''));
  const basePairs = ticPairs.length > 0 ? [...ticPairs, uvvisPair] : [uvvisPair];
  const plusTicPair = ticPairs.find((entry) => isPositiveSpectrumInfo(entry.info));
  const minusTicPair = ticPairs.find((entry) => isNegativeSpectrumInfo(entry.info));
  const initialTicPair = plusTicPair || minusTicPair || ticPairs[0] || null;
  let defaultPolarity = LCMS_POLARITY_NEUTRAL;
  if (plusTicPair) defaultPolarity = 'positive';
  else if (minusTicPair) defaultPolarity = 'negative';

  const datasetKey = uvvisPair.info?.idDt ?? null;
  const persistedTic = readPersistedLcmsTicHints(datasetKey);
  const persistedPolarity = normalizePersistedPolarity(persistedTic?.polarity);
  const preferredPolarity = persistedPolarity || defaultPolarity;
  const persistedMzPage = Number(persistedTic?.mzPage);
  const persistedMzPageFinite = Number.isFinite(persistedMzPage) ? persistedMzPage : null;

  const msCandidates = lcmsPairs.filter(
    (entry) => !isUvvisSpectrumInfo(entry.info) && !isTicSpectrumInfo(entry.info),
  );
  const msPair = [...msCandidates].sort((a, b) => {
    const aPolarityScore = polarityFromInfo(a.info) === preferredPolarity ? 0 : 1;
    const bPolarityScore = polarityFromInfo(b.info) === preferredPolarity ? 0 : 1;
    if (aPolarityScore !== bPolarityScore) return aPolarityScore - bPolarityScore;
    const av = lcmsPageValue(a.built.entity);
    const bv = lcmsPageValue(b.built.entity);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv;
  })[0];

  const bootstrapPolarity = msPair ? polarityFromInfo(msPair.info) : null;
  const useBootstrapMs = !!msPair?.built?.entity && bootstrapPolarity === preferredPolarity;
  const initialMzPage = extractInitialLcmsMzPage(uvvisPair);
  const preferredRetentionTime = persistedMzPageFinite
    ?? initialMzPage
    ?? extractInitialRetentionTime(initialTicPair?.spc?.jcamp)
    ?? lcmsPageValue(msPair?.built?.entity)
    ?? 0;

  const uvvisEntity = uvvisPair.built.entity
    ? { ...uvvisPair.built.entity, idDt: datasetKey ?? uvvisPair.built.entity.idDt }
    : null;
  const baseEntities = basePairs.map((entry) => entry.built.entity);
  const baseFileNames = basePairs.map((entry) => entry.info.label);
  const multiEntities = useBootstrapMs
    ? [...baseEntities, msPair.built.entity]
    : [...baseEntities];
  const entityFileNames = useBootstrapMs
    ? [...baseFileNames, msPair.info.label]
    : [...baseFileNames];

  return {
    signature: basePairs.map((entry) => entry.info.idx).sort((a, b) => a - b).join('|'),
    uvvisSpcInfo: uvvisPair.info,
    uvvisEntity,
    datasetKey,
    baseEntities,
    baseFileNames,
    currentMsEntity: useBootstrapMs ? msPair.built.entity : null,
    currentMsPolarity: useBootstrapMs ? preferredPolarity : null,
    currentMsFileName: useBootstrapMs ? msPair.info.label : null,
    currentMsPredictions: useBootstrapMs ? msPair.spc?.predictions : null,
    currentMultiEntities: multiEntities,
    currentEntityFileNames: entityFileNames,
    preferredPolarity,
    preferredRetentionTime,
    initialRequestSent: false,
    loading: false,
  };
};

// Returns a new runtime descriptor with the freshly-fetched MS page swapped onto the existing UVVIS/TIC base.
export const buildUpdatedLcmsEntities = (
  runtime,
  nextMsEntity,
  nextMsFileName = 'lcms_mz_page.jdx',
  nextMsPredictions = null,
  msPolarity = null,
) => {
  if (!runtime || !nextMsEntity) return null;
  return {
    ...runtime,
    currentMsEntity: nextMsEntity,
    currentMsPolarity: msPolarity,
    currentMsFileName: nextMsFileName,
    currentMsPredictions: nextMsPredictions,
    currentMultiEntities: [...runtime.baseEntities, nextMsEntity],
    currentEntityFileNames: [...runtime.baseFileNames, nextMsFileName],
    loading: false,
  };
};
