/**
 * Converts between Quill Delta and Ketcher's Draft.js-style text node content.
 * Ketcher stores text as: { blocks: [{ key, text, type, depth, inlineStyleRanges, entityRanges, data }], entityMap: {} }
 * inlineStyleRanges: [{ offset, length, style }] where style is BOLD, ITALIC, UNDERLINE, SUBSCRIPT, SUPERSCRIPT,
 * or custom e.g. CUSTOM_FONT_SIZE_43px (round-trip for any Quill attribute).
 */

import Delta from 'quill-delta';

// Map Quill header levels to font sizes (px) for Draft CUSTOM_FONT_SIZE_* styles
const HEADER_LEVEL_TO_FONT_SIZE = {
  1: '26px',
  2: '24px',
  3: '20px',
  4: '18px',
  5: '16px',
  6: '14px'
};

function attrToDraftStyle(attr, value) {
  const key = String(attr)
    .replace(/([A-Z])/g, '_$1')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
  const val = value === true || value === false ? '' : String(value);
  return val ? `CUSTOM_${key}_${val}` : `CUSTOM_${key}`;
}

function parseCustomStyle(style) {
  if (!style || !style.startsWith('CUSTOM_')) return null;
  const rest = style.slice(7);
  const parts = rest.split('_');
  if (parts.length < 2) return { attr: rest.toLowerCase(), value: true };
  const value = parts.pop();
  const attrPart = parts.join('_');
  const attr = attrPart.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return { attr, value };
}

/**
 * Convert Quill Delta to Ketcher Draft-style content (single block with inlineStyleRanges).
 * Supports all Quill attributes; unknown ones are stored as CUSTOM_<ATTR>_<VALUE>.
 * @param {Delta|{ ops: Array }} delta - Quill Delta instance or { ops }
 * @returns {{ blocks: Array, entityMap: Object }} Draft content
 */
export function deltaToDraftContent(delta) {
  const ops = (delta && delta.ops) ? delta.ops : [];
  let fullText = '';
  const styleRanges = []; // { offset, length, style }[]

  let offset = 0;
  let lineStart = 0;

  ops.forEach((op) => {
    if (typeof op.insert !== 'string') return;
    const { insert: text, attributes: attrs = {} } = op;
    const { length } = text;
    if (length === 0) return;

    const isNewlineOp = text === '\n';
    const hasBlockHeader = isNewlineOp && attrs.header >= 1 && attrs.header <= 6;
    const hasBlockSize = isNewlineOp && attrs.size;
    const hasBlockFormat = hasBlockHeader || hasBlockSize;

    if (hasBlockFormat) {
      const lineLength = offset - lineStart;
      if (lineLength > 0) {
        const fontSize = hasBlockHeader
          ? (HEADER_LEVEL_TO_FONT_SIZE[attrs.header] || '16px')
          : attrs.size;
        if (fontSize) {
          styleRanges.push({
            offset: lineStart,
            length: lineLength,
            style: `CUSTOM_FONT_SIZE_${fontSize}`
          });
        }
      }
    }

    if (!hasBlockFormat || !isNewlineOp) {
      if (attrs.bold) styleRanges.push({ offset, length, style: 'BOLD' });
      if (attrs.italic) styleRanges.push({ offset, length, style: 'ITALIC' });
      if (attrs.underline) styleRanges.push({ offset, length, style: 'UNDERLINE' });
      if (attrs.script === 'sub') styleRanges.push({ offset, length, style: 'SUBSCRIPT' });
      if (attrs.script === 'super') styleRanges.push({ offset, length, style: 'SUPERSCRIPT' });
      const headerLevel = attrs.header;
      if (headerLevel >= 1 && headerLevel <= 6) {
        const fontSize = HEADER_LEVEL_TO_FONT_SIZE[headerLevel] || '16px';
        styleRanges.push({ offset, length, style: `CUSTOM_FONT_SIZE_${fontSize}` });
      }
      if (attrs.size) {
        styleRanges.push({ offset, length, style: `CUSTOM_FONT_SIZE_${attrs.size}` });
      }
      Object.entries(attrs).forEach(([key, value]) => {
        const skipKeys = ['bold', 'italic', 'underline', 'script', 'header', 'size'];
        if (skipKeys.includes(key)) return;
        const styleName = attrToDraftStyle(key, value);
        if (styleName) styleRanges.push({ offset, length, style: styleName });
      });
    } else {
      // Newline op with block format: only add non-block inline styles for the newline if any
      if (attrs.bold) styleRanges.push({ offset, length, style: 'BOLD' });
      if (attrs.italic) styleRanges.push({ offset, length, style: 'ITALIC' });
      if (attrs.underline) styleRanges.push({ offset, length, style: 'UNDERLINE' });
      if (attrs.script === 'sub') styleRanges.push({ offset, length, style: 'SUBSCRIPT' });
      if (attrs.script === 'super') styleRanges.push({ offset, length, style: 'SUPERSCRIPT' });
      Object.entries(attrs).forEach(([key, value]) => {
        const skip = ['bold', 'italic', 'underline', 'script', 'header', 'size'];
        if (skip.includes(key)) return;
        const styleName = attrToDraftStyle(key, value);
        if (styleName) styleRanges.push({ offset, length, style: styleName });
      });
    }

    fullText += text;
    offset += length;
    if (isNewlineOp) lineStart = offset;
  });

  const key = Math.random().toString(36).substring(2, 8);
  return {
    blocks: [
      {
        key,
        text: fullText,
        type: 'unstyled',
        depth: 0,
        inlineStyleRanges: styleRanges,
        entityRanges: [],
        data: {},
      },
    ],
    entityMap: {},
  };
}

/**
 * Convert Ketcher Draft-style content to Quill Delta (for initializing the editor).
 * @param {Object|string} content - Draft content object or JSON string
 * @returns {Delta} Quill Delta
 */
export function draftContentToDelta(content) {
  let parsed = content;
  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Delta().insert(content);
    }
  }
  if (!parsed || !parsed.blocks || !parsed.blocks[0]) {
    const text = typeof content === 'string' ? content : '';
    return new Delta().insert(text);
  }

  const block = parsed.blocks[0];
  const text = block.text || '';
  const ranges = block.inlineStyleRanges || [];
  if (text.length === 0) return new Delta().insert('');

  // Build runs: merge consecutive same-style ranges into Delta ops
  const runs = [];
  for (let i = 0; i < text.length; i += 1) {
    const styles = new Set();
    ranges.forEach((r) => {
      if (i >= r.offset && i < r.offset + r.length) styles.add(r.style);
    });
    const styleKey = [...styles].sort().join(',');
    if (runs.length > 0 && runs[runs.length - 1].styleKey === styleKey) {
      runs[runs.length - 1].end = i + 1;
    } else {
      runs.push({
        start: i,
        end: i + 1,
        styleKey,
        styles
      });
    }
  }

  const ops = runs.map((run) => {
    const insert = text.slice(run.start, run.end);
    const attributes = {};
    run.styles.forEach((s) => {
      if (s === 'BOLD') attributes.bold = true;
      else if (s === 'ITALIC') attributes.italic = true;
      else if (s === 'UNDERLINE') attributes.underline = true;
      else if (s === 'SUBSCRIPT') attributes.script = 'sub';
      else if (s === 'SUPERSCRIPT') attributes.script = 'super';
      else {
        const custom = parseCustomStyle(s);
        if (custom) {
          const { attr, value } = custom;
          const isFontSize = (attr === 'fontSize' || attr === 'size') && value && value !== true;
          if (isFontSize) {
            attributes.size = value;
          } else if (attr !== 'fontSize' && attr !== 'size') {
            attributes[attr] = value !== true ? value : true;
          }
        }
      }
    });
    return Object.keys(attributes).length ? { insert, attributes } : { insert };
  });

  return new Delta(ops);
}

/**
 * Check if a value looks like Draft content (has blocks array).
 * @param {*} value
 * @returns {boolean}
 */
export function isDraftContent(value) {
  if (typeof value === 'string') {
    try {
      const p = JSON.parse(value);
      return p && Array.isArray(p.blocks) && p.blocks.length > 0;
    } catch {
      return false;
    }
  }
  return value && Array.isArray(value.blocks) && value.blocks.length > 0;
}
