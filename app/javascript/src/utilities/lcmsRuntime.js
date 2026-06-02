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

// Rounds a retention time to 5 decimals so equivalent floats yield equal cache keys.
const normaliseRt = (rt) => {
  const num = Number(rt);
  if (!Number.isFinite(num)) return '';
  return num.toFixed(5);
};

// Builds the canonical cache key for a `(attachmentId, retentionTime, polarity)` triple.
export const lcmsRequestKey = ({ attachmentId, retentionTime, polarity }) => (
  `${attachmentId ?? ''}::${normaliseRt(retentionTime)}::${polarity || LCMS_POLARITY_NEUTRAL}`
);

// Tiny LRU cache for fetched MS pages, keyed by `lcmsRequestKey`.
export class LcmsPageCache {
  constructor(limit = LCMS_CACHE_DEFAULT_LIMIT) {
    this.limit = limit > 0 ? limit : LCMS_CACHE_DEFAULT_LIMIT;
    this.entries = new Map();
  }

  // Returns the cached value for `key` (or null) and marks it most-recently-used.
  get(key) {
    if (!this.entries.has(key)) return null;
    const value = this.entries.get(key);
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  // Stores `value` under `key`, evicting the least-recently-used entry if the cap is exceeded.
  set(key, value) {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }

  // Removes every entry from the cache.
  clear() {
    this.entries.clear();
  }

  // Returns the number of entries currently held in the cache.
  size() {
    return this.entries.size;
  }
}

// Maps an API/network error to a user-readable LCMS notification message.
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

// Lower-cases an spcInfo label, used by the polarity/role predicates below.
const labelOf = (spcInfo) => (spcInfo?.label || '').toLowerCase();

// True when the spcInfo label matches a UVVIS chromatogram (`*_uvvis_*`).
export const isUvvisSpectrumInfo = (spcInfo) => LCMS_LABEL_REGEX.uvvis.test(labelOf(spcInfo));
// True when the spcInfo label matches a TIC chromatogram (`*_tic_*`).
export const isTicSpectrumInfo = (spcInfo) => LCMS_LABEL_REGEX.tic.test(labelOf(spcInfo));
// True when the spcInfo label denotes positive polarity (`plus`, `pos`, `positive`).
export const isPositiveSpectrumInfo = (spcInfo) => LCMS_LABEL_REGEX.positive.test(labelOf(spcInfo));
// True when the spcInfo label denotes negative polarity (`minus`, `neg`, `negative`).
export const isNegativeSpectrumInfo = (spcInfo) => LCMS_LABEL_REGEX.negative.test(labelOf(spcInfo));

// Returns the polarity ('positive' | 'negative' | LCMS_POLARITY_NEUTRAL) inferred from an spcInfo.
const polarityFromInfo = (info) => {
  if (isPositiveSpectrumInfo(info)) return 'positive';
  if (isNegativeSpectrumInfo(info)) return 'negative';
  return LCMS_POLARITY_NEUTRAL;
};

// Reads the numeric `##PAGE=` value carried by an entity (page / pageValue / pageSymbol).
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

// True when two `{ retentionTime, polarity }` requests are equivalent (same polarity + RT < 1e-5 apart).
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

// Base64-decodes a `POST /lcms_page` payload and turns it into a SpectraEditor entity (null on failure).
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

// Backfills page/pageValue/pageSymbol on an entity that lacks them, using the JCamp header then the requested RT.
export const applyLcmsPageMetadata = (entity, retentionTime, rawPageHeader = null) => {
  if (!entity) return entity;
  if (Number.isFinite(lcmsPageValue(entity))) return entity;

  const headerPage = Number(rawPageHeader);
  if (Number.isFinite(headerPage)) {
    return {
      ...entity,
      page: headerPage,
      pageValue: headerPage,
      pageSymbol: String(rawPageHeader),
    };
  }

  const rt = Number(retentionTime);
  if (!Number.isFinite(rt)) return entity;
  return {
    ...entity,
    page: rt,
    pageValue: rt,
    pageSymbol: String(rt),
  };
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
  let initialPolarity = LCMS_POLARITY_NEUTRAL;
  if (plusTicPair) initialPolarity = 'positive';
  else if (minusTicPair) initialPolarity = 'negative';

  const msCandidates = lcmsPairs.filter(
    (entry) => !isUvvisSpectrumInfo(entry.info) && !isTicSpectrumInfo(entry.info),
  );
  const msPair = [...msCandidates].sort((a, b) => {
    const aPolarityScore = polarityFromInfo(a.info) === initialPolarity ? 0 : 1;
    const bPolarityScore = polarityFromInfo(b.info) === initialPolarity ? 0 : 1;
    if (aPolarityScore !== bPolarityScore) return aPolarityScore - bPolarityScore;
    const av = lcmsPageValue(a.built.entity);
    const bv = lcmsPageValue(b.built.entity);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv;
  })[0];

  const hasBootstrapMs = !!msPair?.built?.entity;
  const initialMzPage = extractInitialLcmsMzPage(uvvisPair);
  const initialRetentionTime = initialMzPage
    ?? extractInitialRetentionTime(initialTicPair?.spc?.jcamp)
    ?? lcmsPageValue(msPair?.built?.entity)
    ?? 0;
  const baseEntities = basePairs.map((entry) => entry.built.entity);
  const baseFileNames = basePairs.map((entry) => entry.info.label);
  const multiEntities = hasBootstrapMs ? [...baseEntities, msPair.built.entity] : [...baseEntities];
  const entityFileNames = hasBootstrapMs ? [...baseFileNames, msPair.info.label] : [...baseFileNames];

  return {
    signature: basePairs.map((entry) => entry.info.idx).sort((a, b) => a - b).join('|'),
    uvvisSpcInfo: uvvisPair.info,
    baseEntities,
    baseFileNames,
    currentMsEntity: hasBootstrapMs ? msPair.built.entity : null,
    currentMsFileName: hasBootstrapMs ? msPair.info.label : null,
    currentMsPredictions: hasBootstrapMs ? msPair.spc?.predictions : null,
    currentMultiEntities: multiEntities,
    currentEntityFileNames: entityFileNames,
    initialRetentionTime,
    initialPolarity,
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
) => {
  if (!runtime || !nextMsEntity) return null;
  return {
    ...runtime,
    currentMsEntity: nextMsEntity,
    currentMsFileName: nextMsFileName,
    currentMsPredictions: nextMsPredictions,
    currentMultiEntities: [...runtime.baseEntities, nextMsEntity],
    currentEntityFileNames: [...runtime.baseFileNames, nextMsFileName],
    loading: false,
  };
};
