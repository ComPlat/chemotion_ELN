import _ from 'lodash';

// Full periodic table regex — same source of truth as ElementalCompositionCustom.js
// Two-char symbols must come before one-char to avoid partial matches
const MENDELEEV = /(Uut|Uup|Uus|Uuo|He|Li|Be|Ne|Na|Mg|Al|Si|Cl|Ar|Ca|Sc|Ti|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ga|Ge|As|Se|Br|Kr|Rb|Sr|Zr|Nb|Mo|Tc|Ru|Rh|Pd|Ag|Cd|In|Sn|Sb|Te|Xe|Cs|Ba|La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu|Hf|Ta|Re|Os|Ir|Pt|Au|Hg|Tl|Pb|Bi|Po|At|Rn|Fr|Ra|Ac|Th|Pa|Np|Pu|Am|Cm|Bk|Cf|Es|Fm|Md|No|Lr|Rf|Db|Sg|Bh|Hs|Mt|Ds|Rg|Cn|Fl|Lv|H|B|C|N|O|F|P|S|K|V|Y|I|W|U)/g;

// Roman numerals used as oxidation states inside parentheses, e.g. (III), (IV), (VI)
// Must be stripped before element matching to avoid I → iodine false positive
const ROMAN_NUMERAL_RE = /\((I{1,3}|IV|VI{0,3}|IX|X{0,3}I{0,3}|VIII|VII|XI{0,3})\)/gi;

// Middle-dot variants used for crystal-water notation: ·, •, ⋅, ·, ⋅
const MIDDLE_DOT_RE = /[·•⋅·‧]/g;

// Leading weight prefix: "50% ", "10 wt.% ", "5wt%", "1wt.%"
const WEIGHT_PREFIX_RE = /^\d+\.?\d*\s*wt\.?%\s*|^\d+\.?\d*\s*%\s*/i;

/**
 * Extract unique element symbols from a single formula segment string.
 * Applies the mendeleev regex (same as ElementalCompositionCustom.js).
 */
function extractElements(segment) {
  const matches = segment.match(MENDELEEV);
  return matches ? _.uniq(matches) : [];
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

  if (segments.length === 0) return [{ segment: '', elements: [] }];

  // 5. Extract elements for each segment
  return segments.map((seg) => ({
    segment: seg,
    elements: extractElements(seg),
  }));
}

/**
 * Resolve the material type for a given template_id using the shapes JSON.
 *
 * Looks up the template_id in surfaceChemistryShapes.json and returns the
 * human-readable material type based on the parent tab label.
 * Promoter is detected via the sub-tab label (it lives under Active Phase tab).
 *
 * @param {number|null} templateId
 * @param {Object|null} shapesJson - The parsed surfaceChemistryShapes.json object.
 *   Pass it directly (loaded by caller) to avoid a fetch call.
 * @returns {string} "Support" | "Active Phase" | "Promoter" | "Body" | "Unknown"
 */
export function getMaterialTypeSync(templateId, shapesJson) {
  if (!templateId || !shapesJson) return 'Unknown';

  const id = parseInt(templateId, 10);
  if (Number.isNaN(id)) return 'Unknown';

  for (const category of Object.keys(shapesJson)) {
    for (const tab of shapesJson[category]) {
      for (const subTab of tab.subTabs) {
        for (const shape of subTab.shapes) {
          if (shape.template_id === id) {
            if (/promoter|promotor/i.test(subTab.label)) return 'Promoter';
            if (/support/i.test(tab.label)) return 'Support';
            if (/active phase/i.test(tab.label)) return 'Active Phase';
            if (/body/i.test(tab.label)) return 'Body';
            return tab.label;
          }
        }
      }
    }
  }
  return 'Unknown';
}

/**
 * Async wrapper — fetches surfaceChemistryShapes.json if shapesData is not provided.
 * In production, prefer caching the result and using getMaterialTypeSync directly.
 *
 * @param {number|null} templateId
 * @param {Object|null} shapesData - Pre-loaded JSON (optional; avoids fetch if supplied)
 * @returns {Promise<string>}
 */
export async function getMaterialType(templateId, shapesData = null) {
  if (!templateId) return 'Unknown';
  try {
    const json = shapesData
      || await fetch('/json/surfaceChemistryShapes.json').then((r) => r.json());
    return getMaterialTypeSync(templateId, json);
  } catch {
    return 'Unknown';
  }
}
