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
        // A bagit curve's own addon is "<n>_bagit" (see jcamp_peak_addon? on the Rails
        // side) - it never gains a .peak./.edit. addon, so by filename shape alone it
        // looks just like a genuine original upload. But it IS a generated/derived
        // per-curve output of the archive, not something that should be independently
        // resubmitted to regenerate_spectrum: doing so races the archive's own full
        // reprocessing within the same request (both touching the same curve rows),
        // spawning duplicate generations and can even leave the curve rows deleted
        // entirely if the race's last writer is a cleanup/destroy call. Confirmed via
        // real regenerate_spectrum traces on a Bruker archive holding a raw FID plus a
        // pdata/1 subfolder - not archive-specific.
        const isBagitCurve = typeof typ === 'string' && /^\d+_bagit$/.test(typ);
        const notOrig = typ === 'peak' || typ === 'edit' || isBagitCurve;
        if (isJcamp) {
          if (notOrig) {
            geneJcampIds = [...geneJcampIds, att.id];
            if (!isBagitCurve) editedJcampsIds = [...editedJcampsIds, att.id];
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

// A saved .nmrium must not carry a download URL. The ELN mints those per open as third-party-app
// tokens, and `encode_and_cache_token` rewrites the server-side cache entry keyed on
// attachment+user every time — so re-minting on the *next* open is itself what invalidates the
// token a previous save persisted. Such a URL is already dead when it is read back, long before
// its 48h expiry or its download counter matter. Persist an opaque reference to the attachment
// instead and re-mint on open (see refreshPersistedSources in NMRiumDisplayer.js), so what lives
// in the file is the one thing that does not change: which attachment this spectrum came from.
const ATTACHMENT_REF_ORIGIN = 'chemotion-attachment://eln';
const TPA_PATH_RE = /\/api\/v\d+\/public\/third_party_apps\//;

const isAttachmentRef = (value) => (
  typeof value === 'string' && value.startsWith(`${ATTACHMENT_REF_ORIGIN}/`)
);

// True for a URL that only works for the one open that minted it - what must never reach a file.
const isEphemeralUrl = (value) => typeof value === 'string' && TPA_PATH_RE.test(value);

// The opaque stand-in a download url is replaced by on the way into a file: which attachment, and
// under what name. Used both as a `sources[]` entry and in place of a spectrum's `source.jcampURL`.
const buildAttachmentRefUrl = (attachment) => {
  const id = attachment?.id;
  if (id === null || id === undefined || id === '') return null;
  return `${ATTACHMENT_REF_ORIGIN}/${id}/${encodeURIComponent(attachment.label || '')}`;
};

const buildAttachmentRefEntry = (attachment) => {
  const url = buildAttachmentRefUrl(attachment);
  return url
    ? { baseURL: ATTACHMENT_REF_ORIGIN, relativePath: url.slice(ATTACHMENT_REF_ORIGIN.length) }
    : null;
};

// @return [Object, null] +{ id, label }+ for an attachment reference, null for anything else
const parseAttachmentRef = (value) => {
  if (!isAttachmentRef(value)) return null;
  const [, id, label = ''] = value.slice(ATTACHMENT_REF_ORIGIN.length).split('/');
  if (!id) return null;
  // A truncated or hand-edited reference can carry a percent sequence decodeURIComponent refuses,
  // and this runs on the save path, which has no error handling above it. The raw segment still
  // names the file well enough to match on, so fall back to it rather than throwing the save away.
  try {
    return { id, label: decodeURIComponent(label) };
  } catch (err) {
    return { id, label };
  }
};

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

// The url a `sources[]` entry fetches. Entries this file writes split it into baseURL +
// relativePath, but the entry NMRium creates itself when it loads a JCAMP by url has no baseURL
// and carries the whole absolute url in relativePath. Missing that shape is how a 1D analysis got
// saved with its download token as the only source, and then reopened empty.
const entryUrl = (entry) => {
  if (entry?.baseURL && entry?.relativePath) return `${entry.baseURL}${entry.relativePath}`;
  return isAbsoluteUrl(entry?.relativePath) ? entry.relativePath : null;
};

// The member path a `sourceSelector.files` / `selector.files` entry addresses inside an archive,
// or null when it addresses no member. Three shapes reach this and all of them matter: a live
// NMRium reference through the archive (`<url>/file.zip/exp1/...`), a saved document's bare member
// path (its token prefix was stripped on the way into the file), and something that names a whole
// file rather than a member - an absolute url, an attachment reference, or a rooted server path.
const archiveMemberPath = (file) => {
  if (typeof file !== 'string' || !file) return null;
  const { member } = splitArchiveRef(file);
  if (member) return member;
  if (isAbsoluteUrl(file) || isAttachmentRef(file) || file.startsWith('/')) return null;
  return file;
};

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

// Splits an absolute url into the { relativePath, baseURL } pair a sources[] entry is made of.
// Attachment references deliberately do not go through this: they are not a fetchable origin, and
// WHATWG URL reports `origin` as the string "null" for a non-special scheme, which would silently
// corrupt the entry. They are built directly by buildAttachmentRefEntry instead.
const urlToEntry = (url) => {
  if (!isAbsoluteUrl(url)) return null;
  try {
    const parsed = new URL(url);
    return { relativePath: parsed.pathname, baseURL: parsed.origin };
  } catch (err) {
    return null;
  }
};

// Resolves which fetched attachment a source url or persisted reference names. Both directions go
// through this: the save path, to write a durable reference in place of a download url, and the
// reopen path, to mint a fresh download url from one.
//
// Precedence, strongest first:
//   1. a live url - an exact statement of which attachment was fetched, so it outranks every name;
//   2. the filename inside a reference, compared verbatim, then - only if nothing carries that
//      exact name - by its slug, with the id breaking ties between candidates that already agree
//      on the name;
//   3. the slug of the caller's own name hint, or of the `sources[]` id a pre-reference save
//      minted (`nmrium-src-<slug>`, suffixed when one save had to separate two spectra);
//   4. the reference's id alone - the attachment was renamed since the save, so on the instance
//      that wrote the reference it still points home;
//   5. the sole candidate, for callers that allow it.
//
// The filename has to lead because of what survives a collection export/import: export writes
// `as_json.except('id')` and import builds fresh rows, so the id in a reference means nothing once
// a document has moved - while `identifier`, a db-defaulted uuid the importer never assigns, is
// regenerated too. The filename is the only field carried across intact. Trusting the id first is
// therefore not merely useless after an import, it is unsafe: ids are reassigned from the
// destination's own sequence, so a stale one can land on a *sibling* attachment in the same
// dataset and quietly resolve the spectrum to the wrong file.
//
// @param attachments [Array] fetched spectra ({ id, label, url }) to resolve against
// @param url [String, null] a live download url, an attachment reference, or nothing
// @option options sourceId [String] the `sources[]` id the entry is filed under
// @option options name [String] the spectrum's resolved name
// @option options allowSoleCandidate [Boolean] fall back to the only candidate when nothing
//   matches - what lets a document saved before references existed reopen at all
// @return [Object, null] the matching attachment, or null
const findAttachmentForRef = (attachments, url, options = {}) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  const { sourceId = null, name = null, allowSoleCandidate = false } = options;

  const { archive } = splitArchiveRef(url);
  if (archive && isAbsoluteUrl(archive)) {
    const byUrl = attachments.find((att) => att?.url && archive.startsWith(att.url));
    if (byUrl) return byUrl;
  }

  const ref = parseAttachmentRef(url);
  if (ref?.label) {
    // The reference carries the filename verbatim, so compare it verbatim first. The slug below is
    // lossy - every run of non-alphanumerics collapses to one dash - so `a-b.zip` and `a_b.zip` are
    // one and the same to it. Two such siblings in a dataset would be decided by `named[0]` the
    // moment the id no longer matches anything, which after an import is always: the destination
    // reassigns ids, so the one in the reference is stale. That silently binds the spectrum to the
    // wrong file. The slug stays as a second tier - it is what lets a file renamed only in its
    // punctuation still resolve - but it may no longer pre-empt an exact name.
    const byName = attachments.filter((att) => att?.label === ref.label);
    if (byName.length) return byName.find((att) => `${att?.id}` === ref.id) || byName[0];

    const refSlug = buildSourceId(ref.label);
    const named = attachments.filter((att) => buildSourceId(att?.label) === refSlug);
    if (named.length) return named.find((att) => `${att?.id}` === ref.id) || named[0];
  }

  const slugs = [buildSourceId(name), sourceId, sourceId && sourceId.replace(/-\d+$/, '')];
  const bySlug = slugs.reduce(
    (found, slug) => found || (slug && attachments.find((att) => buildSourceId(att?.label) === slug)) || null,
    null
  );
  if (bySlug) return bySlug;

  if (ref) {
    const byId = attachments.find((att) => `${att?.id}` === ref.id);
    if (byId) return byId;
  }

  return (allowSoleCandidate && attachments.length === 1) ? attachments[0] : null;
};

// Registers `entry` in root.sources[] and returns the id that addresses it, or null when it can't
// be registered. NMRium's own reader (readNMRiumObject) re-fetches a spectrum's data only when its
// selector.root matches an id here, so this is what actually lets us stop embedding `data` for a
// source-backed spectrum. `claimed` maps key -> id for this cleaning pass: two spectra backed by
// the same file share one entry, while two backed by *different* files never collapse onto one id
// (the preferred id is suffixed instead of being repointed at the second file).
const ensureSource = (root, preferredId, entry, claimed) => {
  if (!preferredId || !entry?.baseURL || !entry?.relativePath) return null;

  const key = `${entry.baseURL}${entry.relativePath}`;
  if (!Array.isArray(root.sources)) root.sources = [];

  const alreadyClaimed = claimed.get(key);
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
  claimed.set(key, id);
  return id;
};

// Reduces a sourceSelector.files entry to something safe to persist: the member path inside the
// archive, which is what NMRium actually filters on, with the token-bearing prefix dropped. An
// entry that addresses no member is only a name for the whole file, so it is rewritten to the same
// opaque reference sources[] gets - findMatchingJcamp reads a filename out of it on the next open
// exactly as it did out of the url. With no attachment to point at there is nothing to keep.
const persistableSourceFile = (file, attachment) => {
  if (typeof file !== 'string') return null;
  const member = archiveMemberPath(file);
  if (member) return member;
  return isEphemeralUrl(file) ? buildAttachmentRefUrl(attachment) : file;
};

// Drops `root.spectra` / `root.molecules` entries off a `sources[]` id that is about to disappear.
// Returns a new array with new items: the caller's own payload must come out of cleaning untouched,
// and a spectrum copy still shares its `selector` object with the spectrum it was copied from.
// selector.files goes too: it filters the file collection of the source named by selector.root,
// so without a root it addresses nothing, and it is where the download url of that source sits.
const cutLooseFromSources = (items, ids) => (items || []).map((item) => {
  if (!item?.selector?.root || !ids.has(item.selector.root)) return item;
  const selector = { ...item.selector };
  delete selector.root;
  delete selector.files;
  return { ...item, selector };
});

// Removes download urls from each item's selector.files on the way into a file. The display pass
// only reduces selector.files for 2D spectra, while NMRium fills it for every spectrum it loads by
// url, 1D included.
const dropEphemeralSelectorFiles = (items) => (items || []).map((item) => {
  const files = item?.selector?.files;
  if (!Array.isArray(files) || !files.some(isEphemeralUrl)) return item;
  const selector = { ...item.selector };
  const kept = files.filter((file) => !isEphemeralUrl(file));
  if (kept.length) selector.files = kept; else delete selector.files;
  return { ...item, selector };
});

/**
 * Strips a saved document of anything that will not survive to the next open.
 *
 * @param nmriumData [Object] the NMRium state, wrapped ({version, data}) or flat
 * @param options [Object]
 * @option options attachments [Array] fetched spectra ({ id, label, url }) backing this document
 * @option options forPersistence [Boolean] true when the result is written to a .nmrium file:
 *   sources[] then hold opaque attachment references rather than live download URLs, and a
 *   spectrum keeps its embedded +data+ unless a reference was successfully registered for it
 * @return [Object, null] the cleaned copy; the input is never mutated
 */
const cleaningNMRiumData = (nmriumData, options = {}) => {
  if (!nmriumData) return null;
  const { attachments = [], forPersistence = false } = options;
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
      // On the way to a file, never register the live download URL: resolve which attachment it
      // addresses and persist a reference to *that*, for the next open to re-mint. A spectrum no
      // attachment backs has nothing that can be re-minted, so it registers no source at all and
      // keeps its embedded `data` below - a bigger file, but one that still opens.
      const attachment = forPersistence
        ? findAttachmentForRef(attachments, sourceUrl, { name: resolvedName })
        : null;
      const sourceEntry = forPersistence
        ? buildAttachmentRefEntry(attachment)
        : urlToEntry(sourceUrl);
      const preferredId = buildSourceId(resolvedName || attachment?.label);
      const sourceId = ensureSource(root, preferredId, sourceEntry, claimedSources);

      if (Object.keys(backfilledInfo).length) {
        tmpSpc.info = backfilledInfo;
      } else if (sourceId) {
        delete tmpSpc.info;
      } else {
        // NMRium's no-source fallback (readNMRiumObject -> bn) destructures `info.dimension`
        // without guarding, so a spectrum that keeps its embedded `data` because nothing could be
        // registered for it must keep an `info` too, or that path throws instead of drawing it.
        tmpSpc.info = { dimension: 2 };
      }

      if (sourceId) {
        // sourceSelector.files may address individual members *within* a shared source (e.g. one
        // experiment inside a multi-spectrum zip, all sharing one sources[] id); NMRium's reader
        // filters the fetched file collection down to selector.files before parsing, so without
        // this a shared zip source can't tell spectra apart. Entries arrive either as a full
        // URL/server path through the archive (`.../file.zip/exp1/...`, which has to be reduced to
        // the member path) or already as a bare member path. Anything else does not address a
        // member and is dropped.
        // The file collection NMRium filters holds the source entry's relativePath plus the member,
        // so a bare member path matches nothing: on the way to NMRium each member is re-rooted on
        // the entry registered under this spectrum's selector.root. Only a document being persisted
        // keeps the bare member, since the archive it lives in is re-minted on every open.
        const members = tmpSpc.sourceSelector?.files?.map(archiveMemberPath).filter(Boolean);
        const archivePath = !forPersistence
          && root.sources.find((source) => source.id === sourceId)?.entries?.[0]?.relativePath;
        const filesWithinSource = archivePath
          ? members?.map((member) => `${archivePath}/${member}`)
          : members;
        tmpSpc.selector = {
          ...tmpSpc.selector,
          root: sourceId,
          ...(filesWithinSource?.length ? { files: filesWithinSource } : {}),
        };
        delete tmpSpc.data;
      }

      // Everything below runs whether or not a source was registered: a spectrum that kept its
      // embedded `data` because no attachment backed it still has the same expiring urls written
      // all over it, and the file must not carry one either way.
      if (forPersistence) {
        // selector.files is what NMRium does read, and when it loads a zip by url it fills the list
        // in itself: every entry is the download url's path through the archive, token included.
        // Only the member path survives an open - the reopen path re-points it onto the archive it
        // mints (patchZipAndJcampReference) - so that is all that is kept. An entry naming no member
        // only names the whole file, which the source already does.
        if (Array.isArray(tmpSpc.selector?.files)) {
          const members = tmpSpc.selector.files.map(archiveMemberPath).filter(Boolean);
          const selector = { ...tmpSpc.selector };
          if (members.length) selector.files = members; else delete selector.files;
          tmpSpc.selector = selector;
        }

        // sourceSelector is not what NMRium reads (selector is), but it IS what findMatchingJcamp
        // matches on when the document is reopened - and it holds the same token URLs. Keep the
        // part that identifies the file, drop the part that expires.
        if (Array.isArray(tmpSpc.sourceSelector?.files)) {
          const persistableFiles = tmpSpc.sourceSelector.files
            .map((file) => persistableSourceFile(file, attachment))
            .filter(Boolean);
          if (persistableFiles.length) {
            tmpSpc.sourceSelector = { ...tmpSpc.sourceSelector, files: persistableFiles };
          } else {
            delete tmpSpc.sourceSelector;
          }
        }

        // `source.jcampURL` is not a reference NMRium reads either, but it is the *first* thing
        // resolveSpectrumSourceUrl consults - so a persisted one both writes a download url into
        // the file and shadows the durable entry registered above: the next open would re-mint
        // sources[] and then have the display-time cleaning pass overwrite it with this dead url
        // again. Rewrite it to the same opaque reference, for refreshPersistedSources to re-mint.
        if (isEphemeralUrl(tmpSpc.source?.jcampURL)) {
          const refUrl = buildAttachmentRefUrl(attachment);
          const nextSource = { ...tmpSpc.source };
          if (refUrl) nextSource.jcampURL = refUrl; else delete nextSource.jcampURL;
          if (Object.keys(nextSource).length) tmpSpc.source = nextSource;
          else delete tmpSpc.source;
        }
      }
    }

    return tmpSpc;
  });

  root.spectra = [...newSpectra];

  // Anything still holding an expiring url on the way to a file is a reference that cannot
  // survive being read back, so it is no reference at all: drop it, and cut loose whatever points
  // at it. This catches the entry the loop above could not replace - the wrapper's own, still
  // addressed by a spectrum for which no attachment was found. Those spectra kept their embedded
  // `data`, so losing the pointer costs them nothing.
  if (forPersistence && Array.isArray(root.sources)) {
    const expiring = new Set(
      root.sources
        .filter((source) => source?.entries?.some((entry) => isEphemeralUrl(entryUrl(entry))))
        .map((source) => source?.id)
    );
    if (expiring.size > 0) {
      root.sources = root.sources.filter((source) => !expiring.has(source?.id));
      root.spectra = cutLooseFromSources(root.spectra, expiring);
      if (Array.isArray(root.molecules)) root.molecules = cutLooseFromSources(root.molecules, expiring);
    }
  }
  if (forPersistence) {
    root.spectra = dropEphemeralSelectorFiles(root.spectra);
    if (Array.isArray(root.molecules)) root.molecules = dropEphemeralSelectorFiles(root.molecules);
  }

  // Drop every unreferenced entry, whoever minted it. This is not housekeeping: readNMRiumObject
  // fetches the whole sources[] array through a single `Promise.all`, so one entry nothing points
  // at any more - the wrapper's own uuid entry, left behind when selector.root was repointed at
  // ours - still gets fetched, and its failure rejects the read for the entire document. An
  // unreferenced source can only cost; it can never contribute.
  if (Array.isArray(root.sources)) {
    const referenced = new Set(
      [...root.spectra, ...(root.molecules || [])].map((item) => item?.selector?.root).filter(Boolean)
    );
    root.sources = root.sources.filter((source) => referenced.has(source?.id));
    if (root.sources.length === 0) delete root.sources;
  }

  // The legacy singular `source` holds the same expiring URLs, and resolveSpectrumSourceUrl
  // consults it *before* sources[] - so a stale one does not merely sit there, it shadows the good
  // reference we just registered. Persist it only if it can be pinned to an attachment.
  // It sits on the wrapper or on the root depending on who wrote the document, and the reopen path
  // reads both, so neither may keep an expiring url.
  if (forPersistence) {
    [...new Set([cleanedNMRiumData, root])].forEach((holder) => {
      if (!holder?.source?.entries?.length) return;
      const persisted = holder.source.entries.map((entry) => {
        const url = entryUrl(entry);
        if (!isEphemeralUrl(url)) return entry;
        return buildAttachmentRefEntry(findAttachmentForRef(attachments, url));
      });
      if (persisted.every(Boolean)) {
        holder.source = { ...holder.source, entries: persisted };
      } else {
        delete holder.source;
      }
    });
  }

  // The shape is returned as it came in; the version is the caller's to add. It has to be added
  // whenever a spectrum depends on sources[]: NMRium reads an unversioned document as version 0, and
  // its migration chain empties sources[] and rewrites each data-less 2D spectrum to
  // `data: {rr: undefined}`. See nmriumDocumentToSave and versionFlatDocument in
  // NMRiumDisplayer.js.
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
  isAttachmentRef, isEphemeralUrl, splitArchiveRef, archiveMemberPath,
  entryUrl, urlToEntry, findAttachmentForRef,
}; // eslint-disable-line
