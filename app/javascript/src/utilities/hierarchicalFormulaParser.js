import _ from 'lodash';
import { getElementRegex } from 'src/utilities/periodicTable';

// Roman numerals used as oxidation states inside parentheses, e.g. (III), (IV), (VI)
// Must be stripped before element matching to avoid I → iodine false positive
const ROMAN_NUMERAL_RE = /\((I{1,3}|IV|VI{0,3}|IX|X{0,3}I{0,3}|VIII|VII|XI{0,3})\)/gi;

// Middle-dot variants used for crystal-water notation: ·, •, ⋅, ·, ⋅
const MIDDLE_DOT_RE = /[·•⋅·‧]/g;

// Leading weight prefix: "50% ", "10 wt.% ", "5wt%", "1wt.%"
const WEIGHT_PREFIX_RE = /^\d+\.?\d*\s*wt\.?%\s*|^\d+\.?\d*\s*%\s*/i;

// Capture group version — used by extractWeightPrefix to get the numeric value
const WEIGHT_PREFIX_CAPTURE_RE = /^(\d+\.?\d*)\s*(?:wt\.?%|%)/i;

// Extract unique element symbols from a formula segment. Async — regex sourced from backend (cached).
export async function extractElements(segment) {
  const regex = await getElementRegex();
  const matches = segment.match(regex);
  return matches ? _.uniq(matches) : [];
}

/**
 * Parse a cleaned formula string into element-count pairs.
 * Handles two-char symbols (Rh, Ga, Si, Al, …) before one-char (O, N, C, …).
 * Decimal stoich values are supported ("Rh1Ga1.1O4.7").
 * Duplicate element symbols are merged (e.g. "C6H5OH" → C:6, H:6, O:1).
 *
 * Examples:
 *   "RhGaO3"  → [{element:"Rh",count:1},{element:"Ga",count:1},{element:"O",count:3}]
 *   "Al2O3"   → [{element:"Al",count:2},{element:"O",count:3}]
 *   "Pt"      → [{element:"Pt",count:1}]
 *
 * @param {string} formula - A single formula segment (no weight prefix, no slashes).
 * @returns {Array<{element:string, count:number}>}
 */
export function parseFormulaToElements(formula) {
  if (!formula) return [];
  const re = /([A-Z][a-z]?)(\d*\.?\d*)/g;
  const counts = {};
  let m;
  while ((m = re.exec(formula)) !== null) {
    const sym = m[1];
    const n = m[2] ? parseFloat(m[2]) : 1;
    if (sym && n > 0) {
      counts[sym] = (counts[sym] || 0) + n;
    }
  }
  return Object.entries(counts).map(([element, count]) => ({ element, count }));
}

/**
 * Extract the leading weight percentage value from a label string.
 * e.g. "50% SiO2" → 50, "10 wt.% Al2O3" → 10, "SiO2" → null
 *
 * @param {string|null} source
 * @returns {number|null}
 */
export function extractWeightPrefix(source) {
  if (!source) return null;
  const m = source.trim().match(WEIGHT_PREFIX_CAPTURE_RE);
  if (!m) return null;
  const val = parseFloat(m[1]);
  return Number.isFinite(val) ? val : null;
}

/**
 * Parse a chemical label into segments and their constituent elements.
 *
 * Processing steps (in order):
 * 1. Strip leading weight prefix ("50% ", "5wt%", etc.)
 * 2. Strip Roman-numeral oxidation states in parentheses: (II), (III), (IV), (VI) …
 * 3. Normalize middle-dot variants to "·" then split on "·" (crystal-water fix)
 * 4. Split each hydrate part on "/" (if present) → individual segments
 * 5. Apply mendeleev regex to each segment → unique element symbols
 *
 * @param {string|null} source - The raw label string from component.source
 * @returns {Array<{segment: string, elements: string[]}>}
 */
export function parseFormulaLabel(source) {
  if (!source) return [{ segment: '', elements: [] }];

  // 1. Strip weight prefix
  let cleaned = source.replace(WEIGHT_PREFIX_RE, '');

  // 2. Strip Roman-numeral oxidation states
  cleaned = cleaned.replace(ROMAN_NUMERAL_RE, '');

  // 3. Normalize middle-dot variants → split on hydrate separator
  const hydrateParts = cleaned
    .replace(MIDDLE_DOT_RE, '·')
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean);

  // 4. Split each hydrate part on "/" → individual formula segments
  const segments = hydrateParts.flatMap((part) => part.split('/').map((s) => s.trim()).filter(Boolean));

  if (segments.length === 0) return [{ segment: '' }];

  return segments.map((seg) => ({ segment: seg }));
}

/**
 * Resolve the material type for a given template_id using the shapes JSON.
 *
 * Returns an object with:
 *   - type: short category ("Support" | "Active Phase" | "Promoter" | "Body" | "Unknown")
 *   - subType: full sub-tab label (e.g. "Single Phase Support"), same as type when not found
 *
 * @param {number|null} templateId
 * @param {Object|null} shapesJson - The parsed surfaceChemistryShapes.json object.
 * @returns {{ type: string, subType: string }}
 */
export function getMaterialTypeSync(templateId, shapesJson) {
  const unknown = { type: 'Unknown', subType: 'Unknown' };
  if (!templateId || !shapesJson) return unknown;

  const id = parseInt(templateId, 10);
  if (Number.isNaN(id)) return unknown;

  for (const category of Object.keys(shapesJson)) {
    for (const tab of shapesJson[category]) {
      for (const subTab of tab.subTabs) {
        for (const shape of subTab.shapes) {
          if (shape.template_id === id) {
            let type;
            if (/promoter|promotor/i.test(subTab.label)) type = 'Promoter';
            else if (/support/i.test(tab.label)) type = 'Support';
            else if (/active phase/i.test(tab.label)) type = 'Active Phase';
            else if (/body/i.test(tab.label)) type = 'Body';
            else type = tab.label;
            return { type, subType: subTab.label || type };
          }
        }
      }
    }
  }
  return unknown;
}

/**
 * Async wrapper — fetches surfaceChemistryShapes.json if shapesData is not provided.
 * In production, prefer caching the result and using getMaterialTypeSync directly.
 *
 * @param {number|null} templateId
 * @param {Object|null} shapesData - Pre-loaded JSON (optional; avoids fetch if supplied)
 * @returns {Promise<{ type: string, subType: string }>}
 */
export async function getMaterialType(templateId, shapesData = null) {
  if (!templateId) return { type: 'Unknown', subType: 'Unknown' };
  try {
    const json = shapesData
      || await fetch('/json/surfaceChemistryShapes.json').then((r) => r.json());
    return getMaterialTypeSync(templateId, json);
  } catch {
    return { type: 'Unknown', subType: 'Unknown' };
  }
}
