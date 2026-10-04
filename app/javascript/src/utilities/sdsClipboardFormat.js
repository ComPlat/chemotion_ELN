// Turns safety phrases and extracted SDS properties into { text, html } clipboard payloads
// that paste cleanly into a word processor: human labels, no JSON, inline styles only.

// Keys as produced by Chemotion::SdsPropertyParser; unknown keys fall back to humanizeKey.
export const PROPERTY_LABELS = {
  form: 'Form',
  color: 'Color',
  odor: 'Odor',
  melting_point: 'Melting point',
  boiling_point: 'Boiling point',
  flash_point: 'Flash point',
  autoignition_temperature: 'Autoignition temperature',
  decomposition_temperature: 'Decomposition temperature',
  ph: 'pH',
  solubility: 'Solubility',
  vapor_pressure: 'Vapor pressure',
  density: 'Density',
  relative_density: 'Relative density',
  vapor_density: 'Vapor density',
  viscosity: 'Viscosity',
  viscosity_dynamic: 'Viscosity, dynamic',
  viscosity_kinematic: 'Viscosity, kinematic',
  molecular_weight: 'Molecular weight',
  refractive_index: 'Refractive index',
};

export const SECTION_TITLES = {
  h: 'Hazard Statements',
  p: 'Precautionary Statements',
  pictograms: 'Pictograms',
};

const HTML_ESCAPES = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const clean = (value) => (value == null ? '' : String(value).trim());

export const humanizeKey = (key) => {
  const words = clean(key).replace(/_+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
};

export const propertyLabel = (key) => PROPERTY_LABELS[key] || humanizeKey(key);

// "GHS07.gif"-style file names from pictograms.json read as "Harmful Irritant".
export const pictogramName = (file) => clean(file).replace(/\.[A-Za-z0-9]+$/, '').replace(/_/g, ' ');

export const phraseLine = (code, text) => {
  const c = clean(code);
  const t = clean(text);
  return t ? `${c}: ${t}` : c;
};

// A text that only repeats its code (an unnamed pictogram) is dropped.
const toItems = (entries) => entries
  .map(({ code, text }) => ({ code: clean(code), text: clean(text) === clean(code) ? '' : clean(text) }))
  .filter(({ code }) => code);

// Sections in display order; empty sections are dropped so they never reach the clipboard.
export const safetyPhraseSections = (phrases, pictogramNames = {}) => {
  const source = phrases && typeof phrases === 'object' ? phrases : {};
  const statements = (dict) => (dict && typeof dict === 'object' && !Array.isArray(dict)
    ? Object.entries(dict).map(([code, text]) => ({ code, text }))
    : []);
  const pictograms = Array.isArray(source.pictograms)
    ? source.pictograms.map((code) => ({ code, text: pictogramName(pictogramNames[code]) }))
    : [];

  return [
    { title: SECTION_TITLES.h, items: toItems(statements(source.h_statements)) },
    { title: SECTION_TITLES.p, items: toItems(statements(source.p_statements)) },
    { title: SECTION_TITLES.pictograms, items: toItems(pictograms) },
  ].filter((section) => section.items.length > 0);
};

const HEADING_STYLE = 'margin:0 0 4pt 0;font-weight:bold;';
const LIST_STYLE = 'margin:0 0 10pt 0;padding-left:20pt;';

// Each section: heading line, one line per item, blank line between sections.
export const formatPhraseSections = (sections) => {
  const filled = (sections || [])
    .map((section) => ({ title: clean(section.title), items: toItems(section.items || []) }))
    .filter((section) => section.items.length > 0);

  const text = filled
    .map(({ title, items }) => [title, ...items.map(({ code, text: t }) => phraseLine(code, t))].join('\n'))
    .join('\n\n');

  const html = filled.map(({ title, items }) => {
    const rows = items.map(({ code, text: t }) => (
      `<li><strong>${escapeHtml(code)}</strong>${t ? `: ${escapeHtml(t)}` : ''}</li>`
    )).join('');
    return `<p style="${HEADING_STYLE}">${escapeHtml(title)}</p><ul style="${LIST_STYLE}">${rows}</ul>`;
  }).join('');

  return { text, html };
};

export const formatPhrase = (code, text) => {
  const line = phraseLine(code, text);
  const c = clean(code);
  const t = clean(text);
  return {
    text: line,
    html: c ? `<p style="margin:0;"><strong>${escapeHtml(c)}</strong>${t ? `: ${escapeHtml(t)}` : ''}</p>` : '',
  };
};

const CELL_STYLE = 'padding:2pt 12pt 2pt 0;vertical-align:top;';

// One "Label: value" line per non-blank property, as a two-column table in the html variant.
export const formatProperties = (properties) => {
  const source = properties && typeof properties === 'object' && !Array.isArray(properties) ? properties : {};
  const rows = Object.entries(source)
    .map(([key, value]) => ({ label: propertyLabel(key), value: clean(value) }))
    .filter(({ label, value }) => label && value);

  if (rows.length === 0) return { text: '', html: '' };

  const text = rows.map(({ label, value }) => `${label}: ${value}`).join('\n');
  const body = rows.map(({ label, value }) => (
    `<tr><td style="${CELL_STYLE}font-weight:bold;">${escapeHtml(label)}</td>`
    + `<td style="${CELL_STYLE}">${escapeHtml(value)}</td></tr>`
  )).join('');
  const html = `<table style="border-collapse:collapse;"><tbody>${body}</tbody></table>`;

  return { text, html };
};
