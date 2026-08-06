// Helpers for the (SUR)MOF configuration: turning a CIF-analysis result into the
// structured sample_details.mof shape, and re-assembling the MOFid string from
// the editable fields.
//
// A MOFid string has the grammar:
//   <building-block SMILES joined by '.'> <FormatID>.<Topology>.<Catenation>
// e.g. "[Cu][Cu].[O-]C(=O)c1ccccc1 MOFid-v1.tbo.cat0"
//
// So the "MOF identifier" shown in the UI is derived from the fragments' SMILES
// plus the Format ID / Topology / Catenation fields (all retrievable from the CIF).

import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';

/**
 * Resolve a fragment's building-block SMILES into display identifiers using the
 * app's molecule service (the same call mixtures use to resolve components).
 * @param {string} smiles
 * @returns {Promise<Object>} fields to merge onto the fragment, or {} on failure
 */
export const resolveFragmentIdentifiers = async (smiles) => {
  const smi = `${smiles ?? ''}`.trim();
  if (!smi) return {};
  try {
    const molecule = await MoleculesFetcher.fetchBySmi(smi, null, null, 'ketcher');
    if (!molecule || !molecule.id) return {};
    return {
      molecule_id: molecule.id,
      iupac: molecule.iupac_name || '',
      sum_formula: molecule.sum_formular || molecule.sum_formula || '',
      inchikey: molecule.inchikey || '',
      inchistring: molecule.inchistring || '',
      cano_smiles: molecule.cano_smiles || '',
      molfile: molecule.molfile || '',
      svg_file: molecule.molecule_svg_file || '',
    };
  } catch (e) {
    return {};
  }
};

/**
 * Resolve every fragment that has a SMILES, returning a new fragments array with
 * IUPAC / InChI / canonical SMILES / molfile / SVG populated. Fragments without
 * a SMILES (or that fail to resolve) are left unchanged.
 * @param {Array<Object>} fragments
 * @returns {Promise<Array<Object>>}
 */
export const resolveFragments = async (fragments = []) => Promise.all(
  fragments.map(async (frag) => {
    if (!frag || !`${frag.smiles ?? ''}`.trim()) return frag;
    const patch = await resolveFragmentIdentifiers(frag.smiles);
    return { ...frag, ...patch };
  }),
);

/**
 * Assemble the MOFid string from the structured mof fields.
 * @param {Object} mof - sample_details.mof
 * @returns {string} the MOFid, or '' when there is nothing to assemble
 */
export const buildMofid = (mof = {}) => {
  const smiles = (mof.fragments || [])
    .map((frag) => `${frag.smiles ?? ''}`.trim())
    .filter(Boolean)
    .join('.');
  const suffix = [mof.format_id, mof.topology, mof.cat]
    .map((part) => `${part ?? ''}`.trim())
    .filter(Boolean)
    .join('.');
  return [smiles, suffix].filter(Boolean).join(' ');
};

// The MOF service may return string or array values (e.g. smiles_nodes can be a
// list of building blocks). Coerce to a single string for regex/splitting.
const asText = (value) => (Array.isArray(value) ? value.join(' ') : `${value ?? ''}`);

// Normalize a SMILES value (string with '.'-separated blocks, or an array of
// blocks) into a flat list of individual building-block SMILES.
const toSmilesList = (value) => (Array.isArray(value) ? value : [value])
  .flatMap((item) => `${item ?? ''}`.split('.'))
  .map((smiles) => smiles.trim())
  .filter(Boolean);

const matchToken = (text, regex, fallback) => {
  const found = asText(text).match(regex);
  return found ? found[0] : fallback;
};

// The mofid pipeline appends a reference token to the MOFkey (".NO_REF" when no
// CSD/CCDC reference is known). The reference web-mofid tool omits it, so drop a
// trailing "NO_REF": "…MOFkey-v1.tbo.NO_REF" -> "…MOFkey-v1.tbo".
const stripMofkeyReference = (mofkey) => asText(mofkey).replace(/\.NO_REF\s*$/i, '');

const normalizeCatenation = (result) => {
  if (result.cat !== undefined && result.cat !== null && `${result.cat}` !== '') {
    return /^\d+$/.test(`${result.cat}`) ? `cat${result.cat}` : `${result.cat}`;
  }
  return matchToken(result.mofid, /cat\d+/, '');
};

const fragmentsFromResult = (result) => {
  const rows = [];
  const push = (smiles, typeFunction) => {
    toSmilesList(smiles).forEach((s) => rows.push({
      type_function: typeFunction, iupac: '', smiles: s, ratio: 1, comment: '',
    }));
  };
  if (result.smiles_nodes || result.smiles_linkers) {
    push(result.smiles_nodes, 'node');
    push(result.smiles_linkers, 'linker');
  } else {
    push(result.smiles, '');
  }
  return rows;
};

/**
 * Split a MOFkey on '.', anchored on its "MOFkey-vN" token. For
 *   "Cu.QMKYBPDZANOJGF.MOFkey-v1.tbo.NO_REF"
 * returns { formatKey: 'MOFkey-v1', topology: 'tbo', reference: 'NO_REF' }.
 * @param {string} mofkey
 * @returns {{ formatKey: string, topology: string, reference: string }}
 */
export const splitMofkey = (mofkey) => {
  const parts = asText(mofkey).split('.').map((part) => part.trim());
  const idx = parts.findIndex((part) => /^MOFkey-v\d+$/i.test(part));
  if (idx === -1) return { formatKey: '', topology: '', reference: '' };
  return {
    formatKey: parts[idx] || '',
    topology: parts[idx + 1] || '',
    reference: parts[idx + 2] || '',
  };
};

/**
 * Map a raw MOF-service analysis result onto the structured sample_details.mof
 * fields, retrieving Format ID / Format Key / Topology / Catenation from the CIF
 * output. Format Key and Topology are split out of the MOFkey; Format ID and
 * Catenation come from the MOFid. The MOFid is re-derived so it stays consistent.
 *
 * @param {Object} result - MofFetcher.analyze response
 * @returns {Object} structured mof details
 */
export const mofResultFromAnalysis = (result = {}) => {
  const { formatKey, topology: topologyFromKey } = splitMofkey(result.mofkey);

  const details = {
    fragments: fragmentsFromResult(result),
    format_id: matchToken(result.mofid, /MOFid-v\d+/, 'MOFid-v1'),
    format_key: formatKey || 'MOFkey-v1',
    topology: asText(result.topology) || topologyFromKey || matchToken(result.mofid, /(?<=MOFid-v\d+\.)[^.\s]+/, ''),
    cat: normalizeCatenation(result),
    // CCDC number is extracted from the CIF by the sidecar; SURMOF thin-film
    // properties are user-entered.
    ccdc_no: asText(result.ccdc_number),
    substrate: '',
    coating: '',
    dimensions: '',
    mofkey: stripMofkeyReference(result.mofkey),
    // keep the raw analysis fields (coerced to strings) for reference / display
    smiles: asText(result.smiles),
    smiles_nodes: asText(result.smiles_nodes),
    smiles_linkers: asText(result.smiles_linkers),
    filename: result.filename || null,
  };
  details.mofid = buildMofid(details);
  return details;
};
