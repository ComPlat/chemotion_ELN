/* eslint-disable no-undef */
import assert from 'assert';
import { describe, it } from 'mocha';
import {
  hasKetcherData,
  extractPolymerTagFromAliases,
  parsePolymerEntryByAtomIndex,
  sanitizeQueryAtomsForIndigo,
  getStandardMolfileForIndigo,
} from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import { addTextNodes } from 'src/utilities/ketcherSurfaceChemistry/TextNode';

// ─────────────────────────────────────────────────────────────────────────────
// Shared molfile fragments
// ─────────────────────────────────────────────────────────────────────────────

const POLYMERS_LINE = '> <PolymersList>';

const buildMolfileWithPolymersList = (polymerContent) => [
  '\n  -ISIS-  0400001505462D\n',
  '  1  0  0  0  0  0            999 V2000',
  '    0.0000    0.0000    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0',
  'M  END',
  '$$$$',
  POLYMERS_LINE,
  polymerContent,
  '',
].join('\n');

// ─────────────────────────────────────────────────────────────────────────────
// hasKetcherData
// ─────────────────────────────────────────────────────────────────────────────

describe('InitializeAndParseKetcher — hasKetcherData', () => {
  it('returns null for null input', async () => {
    const result = await hasKetcherData(null);
    assert.strictEqual(result, null);
  });

  it('returns null for empty string', async () => {
    const result = await hasKetcherData('');
    assert.strictEqual(result, null);
  });

  it('returns null when no PolymersList block is present', async () => {
    const molfile = 'no polymer data here\nM  END\n$$$$\n';
    const result = await hasKetcherData(molfile);
    assert.strictEqual(result, null);
  });

  it('returns the polymer content line when a single entry is present', async () => {
    const molfile = buildMolfileWithPolymersList('0/95/1.00-1.00');
    const result = await hasKetcherData(molfile);
    assert.strictEqual(result, '0/95/1.00-1.00');
  });

  it('joins multiple content lines with a space', async () => {
    const molfile = buildMolfileWithPolymersList('0/95/1.00-1.00\n1/52/1.50-2.00');
    const result = await hasKetcherData(molfile);
    assert.strictEqual(result, '0/95/1.00-1.00 1/52/1.50-2.00');
  });

  it('ignores blank lines within the PolymersList block', async () => {
    const molfile = buildMolfileWithPolymersList('\n  \n0/95/1.00-1.00\n');
    const result = await hasKetcherData(molfile);
    assert.strictEqual(result, '0/95/1.00-1.00');
  });

  it('stops collecting at the next > <…> block header', async () => {
    const molfile = [
      'M  END',
      '$$$$',
      POLYMERS_LINE,
      '0/95/1.00-1.00',
      '> <MoleculesList>',
      'mol0',
      '',
    ].join('\n');
    const result = await hasKetcherData(molfile);
    assert.strictEqual(result, '0/95/1.00-1.00');
  });

  it('returns null when PolymersList block exists but has no content', async () => {
    const molfile = [
      'M  END',
      '$$$$',
      POLYMERS_LINE,
      '',
    ].join('\n');
    const result = await hasKetcherData(molfile);
    assert.strictEqual(result, null);
  });

  it('returns the first PolymersList block when two blocks present (plain-format first)', async () => {
    // Plain-format first, full-format second — confirms first-wins, not content-based preference
    const molfile = buildMolfileWithPolymersList('0 1 2') + '\n> <PolymersList>\n0/5/2.0-2.0 1/6/3.0-3.0\n';
    const result = await hasKetcherData(molfile);
    assert.strictEqual(result, '0 1 2', `expected first block content, got: "${result}"`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractPolymerTagFromAliases
// ─────────────────────────────────────────────────────────────────────────────

describe('InitializeAndParseKetcher — extractPolymerTagFromAliases', () => {
  it('returns null for null input', () => {
    assert.strictEqual(extractPolymerTagFromAliases(null), null);
  });

  it('returns null for non-string input', () => {
    assert.strictEqual(extractPolymerTagFromAliases(42), null);
    assert.strictEqual(extractPolymerTagFromAliases({}), null);
  });

  it('returns null when no A-line alias blocks are present', () => {
    const molfile = 'M  END\n$$$$\n';
    assert.strictEqual(extractPolymerTagFromAliases(molfile), null);
  });

  it('returns null when A-lines exist but alias text does not match t_N_N pattern', () => {
    const molfile = 'A    1\nnot_a_match\nM  END\n';
    assert.strictEqual(extractPolymerTagFromAliases(molfile), null);
  });

  it('converts a single A-line alias to atomIndex/templateType/1.00-1.00 format', () => {
    // A    1 → atom index 0 (V2000 is 1-indexed)
    const molfile = 'A    1\nt_95_0\nM  END\n';
    assert.strictEqual(extractPolymerTagFromAliases(molfile), '0/95/1.00-1.00');
  });

  it('converts multiple A-line aliases and joins them with a space', () => {
    const molfile = 'A    1\nt_95_0\nA    4\nt_52_1\nM  END\n';
    assert.strictEqual(extractPolymerTagFromAliases(molfile), '0/95/1.00-1.00 3/52/1.00-1.00');
  });

  it('subtracts 1 from atom number to convert from 1-indexed to 0-indexed', () => {
    const molfile = 'A    5\nt_10_0\nM  END\n';
    const result = extractPolymerTagFromAliases(molfile);
    assert.ok(result.startsWith('4/'), `expected atom index 4, got: ${result}`);
  });

  it('normalises Windows line endings (\\r\\n)', () => {
    const molfile = 'A    1\r\nt_95_0\r\nM  END\r\n';
    const entries = extractPolymerTagFromAliases(molfile);
    assert.strictEqual(entries, '0/95/1.00-1.00');
    assert.ok(!entries[0].includes('\r'), `\\r artifact found in entry: "${entries[0]}"`);
  });

  it('normalises classic Mac line endings (\\r)', () => {
    const molfile = 'A    1\rt_95_0\rM  END\r';
    assert.strictEqual(extractPolymerTagFromAliases(molfile), '0/95/1.00-1.00');
  });

  it('returns 6 entries for a molfile with 6 aliases', () => {
    const molfile = [
      'A    1', 't_52_0',
      'A    2', 't_52_0',
      'A    3', 't_52_0',
      'A    4', 't_24_0',
      'A    5', 't_53_0',
      'A    6', 't_35_0',
      'M  END',
    ].join('\n');
    const result = extractPolymerTagFromAliases(molfile);
    const entryCount = result ? result.split(' ').length : 0;
    assert.strictEqual(entryCount, 6, `expected 6 entries, got ${entryCount}`);
  });

  it('ignores aliases with extra underscores that do not match anchored pattern', () => {
    // t_95_0_extra should NOT match the anchored /^t_(\d+)_(\d+)$/ pattern
    const molfile = 'A    1\nt_95_0_extra\nM  END\n';
    assert.strictEqual(extractPolymerTagFromAliases(molfile), null);
  });

  it('returns null for empty string', () => {
    assert.strictEqual(extractPolymerTagFromAliases(''), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parsePolymerEntryByAtomIndex
// ─────────────────────────────────────────────────────────────────────────────

describe('InitializeAndParseKetcher — parsePolymerEntryByAtomIndex', () => {
  it('returns null for null input', () => {
    assert.strictEqual(parsePolymerEntryByAtomIndex(null), null);
  });

  it('returns null for empty string', () => {
    assert.strictEqual(parsePolymerEntryByAtomIndex(''), null);
  });

  it('returns null for legacy single-number format "0"', () => {
    assert.strictEqual(parsePolymerEntryByAtomIndex('0'), null);
  });

  it('returns null for legacy surface format "0s" (contains "s")', () => {
    assert.strictEqual(parsePolymerEntryByAtomIndex('0s'), null);
  });

  it('returns null for two-part format missing size (only two slashes worth)', () => {
    // Only one slash → parts.length < 3
    assert.strictEqual(parsePolymerEntryByAtomIndex('3/95'), null);
  });

  it('parses a valid three-part entry and returns correct atomIndex, type, size', () => {
    const result = parsePolymerEntryByAtomIndex('2/10/1.00-1.00');
    assert.deepStrictEqual(result, { atomIndex: 2, type: '10', size: '1.00-1.00' });
  });

  it('atomIndex is a number, type is a string', () => {
    const result = parsePolymerEntryByAtomIndex('5/52/1.50-2.00');
    assert.strictEqual(typeof result.atomIndex, 'number');
    assert.strictEqual(typeof result.type, 'string');
    assert.strictEqual(result.atomIndex, 5);
    assert.strictEqual(result.type, '52');
    assert.strictEqual(result.size, '1.50-2.00');
  });

  it('returns null when first part is not a valid integer', () => {
    assert.strictEqual(parsePolymerEntryByAtomIndex('abc/95/1.00-1.00'), null);
  });

  it('returns null when second part (templateId) is not a valid integer', () => {
    assert.strictEqual(parsePolymerEntryByAtomIndex('2/abc/1.00-1.00'), null);
  });

  it('handles whitespace around the value', () => {
    const result = parsePolymerEntryByAtomIndex('  3/24/1.00-1.00  ');
    assert.deepStrictEqual(result, { atomIndex: 3, type: '24', size: '1.00-1.00' });
  });

  it('defaults size to "1-1" when third part is missing (only two slashes)', () => {
    // Three parts minimum required (parts.length < 3 returns null), but parts[2] could be empty
    // This tests the `parts[2] || '1-1'` fallback when parts[2] is an empty string
    const result = parsePolymerEntryByAtomIndex('2/10/');
    assert.deepStrictEqual(result, { atomIndex: 2, type: '10', size: '1-1' });
  });

  it('preserves atomIndex of 0 (first atom)', () => {
    const result = parsePolymerEntryByAtomIndex('0/95/1.00-1.00');
    assert.strictEqual(result.atomIndex, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeQueryAtomsForIndigo
// Defensive fix for the blank "not-used" bond field that Ketcher sometimes writes.
// A/R# query atoms are intentionally preserved — Indigo returns them as label='A'
// and type='rg-label' respectively, which is what aliasPass in addingPolymersToKetcher
// needs to place polymer shapes correctly.
// ─────────────────────────────────────────────────────────────────────────────

// Bond line from samples 731/732/733 — blank field at positions 12-14
const SAMPLE_BOND_BLANK = '  1  2  1  0     0  0';
// Bond line with field already zeroed
const SAMPLE_BOND_CLEAN = '  1  2  1  0  0  0  0';

describe('InitializeAndParseKetcher — sanitizeQueryAtomsForIndigo', () => {
  it('returns the input unchanged for null', () => {
    assert.strictEqual(sanitizeQueryAtomsForIndigo(null), null);
  });

  it('returns the input unchanged for non-string', () => {
    assert.strictEqual(sanitizeQueryAtomsForIndigo(42), 42);
  });

  it('returns empty string unchanged', () => {
    assert.strictEqual(sanitizeQueryAtomsForIndigo(''), '');
  });

  it('replaces blank bond "not-used" field (positions 12-14) with "  0"', () => {
    const result = sanitizeQueryAtomsForIndigo(SAMPLE_BOND_BLANK);
    assert.strictEqual(result.slice(12, 15), '  0',
      `Bond field 5 expected "  0", got "${result.slice(12, 15)}"`);
  });

  it('produces a fully clean bond line from the sample blank-field format', () => {
    assert.strictEqual(sanitizeQueryAtomsForIndigo(SAMPLE_BOND_BLANK), SAMPLE_BOND_CLEAN);
  });

  it('leaves A and R# atom lines unchanged (Indigo handles them natively)', () => {
    const atomA = '   18.9750   -7.3000    0.0000 A   0  0  0  0  0  0  0  0  0  0  0  0';
    const atomR = '   19.5250   -3.4000    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0';
    assert.strictEqual(sanitizeQueryAtomsForIndigo(atomA), atomA, 'A atom should not be changed');
    assert.strictEqual(sanitizeQueryAtomsForIndigo(atomR), atomR, 'R# atom should not be changed');
  });

  it('does not alter normal C/O/N atom lines', () => {
    const line = '    1.3350    0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0';
    assert.strictEqual(sanitizeQueryAtomsForIndigo(line), line);
  });

  it('does not alter bond lines where the not-used field is already 0', () => {
    assert.strictEqual(sanitizeQueryAtomsForIndigo(SAMPLE_BOND_CLEAN), SAMPLE_BOND_CLEAN);
  });

  it('preserves content after M  END unchanged', () => {
    const mol = `mol\n\n\n  1  1  0  0  0  0  0  0  0  0999 V2000\n${SAMPLE_BOND_BLANK}\nM  END\n> <PolymersList>\n0/93/1.00-3.00\n$$$$`;
    const result = sanitizeQueryAtomsForIndigo(mol);
    assert.ok(result.includes('> <PolymersList>'), 'PolymersList block was removed');
    assert.ok(result.includes('0/93/1.00-3.00'), 'PolymersList content was altered');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getStandardMolfileForIndigo — header normalisation
// ─────────────────────────────────────────────────────────────────────────────

describe('InitializeAndParseKetcher — getStandardMolfileForIndigo header normalisation', () => {
  it('inserts a blank line when the counts line is on line 3 (Ketcher 2-line header)', () => {
    const mol = [
      'Ketcher 11182611142D 1   1.00000     0.00000     0',
      '',
      '  2  1  0  0  0  0  0  0  0  0999 V2000',
      '   18.9750   -7.3000    0.0000 A   0  0  0  0  0  0  0  0  0  0  0  0',
      '   19.5250   -3.4000    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0',
      '  1  2  1  0     0  0',
      'M  END',
    ].join('\n');
    const result = getStandardMolfileForIndigo(mol);
    const lines = result.split('\n');
    assert.ok(
      /V[23]000/.test(lines[3]),
      'counts line should be at index 3 (4th line) after normalisation',
    );
    assert.strictEqual(lines[2], '', 'line 3 (index 2) should be empty comment line');
  });

  it('leaves a correctly-formed 3-line header unchanged', () => {
    const mol = [
      '',
      '  Mrv2211 11182611142D          ',
      '',
      '  2  1  0  0  0  0            999 V2000',
      '   -0.3572    0.1250    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
      '    0.3572   -0.1250    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
      '  1  2  1  0  0  0  0',
      'M  END',
    ].join('\n');
    const result = getStandardMolfileForIndigo(mol);
    const lines = result.split('\n');
    assert.ok(
      /V[23]000/.test(lines[3]),
      'counts line should remain at index 3 when header is already correct',
    );
  });

  it('strips everything after M  END', () => {
    const mol = [
      'Ketcher 11182611142D 1   1.00000     0.00000     0',
      '',
      '  2  1  0  0  0  0  0  0  0  0999 V2000',
      '   18.9750   -7.3000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
      '   19.5250   -3.4000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
      '  1  2  1  0  0  0  0',
      'M  END',
      '> <PolymersList>',
      '0/93/1.00-3.00',
      '$$$$',
    ].join('\n');
    const result = getStandardMolfileForIndigo(mol);
    assert.ok(!result.includes('> <PolymersList>'), 'SDF tags should be stripped');
    assert.ok(result.endsWith('M  END'), 'result should end with M  END');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addTextNodes
// ─────────────────────────────────────────────────────────────────────────────
describe('InitializeAndParseKetcher — addTextNodes', () => {
  it('returns null for lines with fewer than 3 parts', async () => {
    const result = await addTextNodes(['only-one-part', '']);
    assert.ok(result.every((r) => r === null), 'short lines should return null');
  });

  it('handles new 4-part format: index#key#alias#plain-text', async () => {
    const line = '0#oee0kg#t_52_0#10 wt.% α-Al2O3';
    const [node] = await addTextNodes([line]);
    assert.ok(node !== null, 'should return a text node');
    assert.strictEqual(node.type, 'text');
    const content = JSON.parse(node.data.content);
    assert.strictEqual(content.blocks[0].key, 'oee0kg');
    assert.strictEqual(content.blocks[0].text, '10 wt.% α-Al2O3');
  });

  it('handles old 3-part format with paragraphs JSON: index#alias#json', async () => {
    const json = JSON.stringify({ paragraphs: [{ parts: [{ text: '10% PtPd' }], indent: 0 }], indent: 0 });
    const line = `1#t_2_1#${json}`;
    const [node] = await addTextNodes([line]);
    assert.ok(node !== null, 'should return a text node for old format');
    assert.strictEqual(node.type, 'text');
    const content = JSON.parse(node.data.content);
    assert.strictEqual(content.blocks[0].text, '10% PtPd', 'text should be extracted from paragraphs');
    assert.ok(content.blocks[0].key, 'a key should be generated');
  });

  it('derives the same key for the same alias on repeated loads (no random)', async () => {
    const json = JSON.stringify({ paragraphs: [{ parts: [{ text: 'label' }], indent: 0 }], indent: 0 });
    const line = `0#t_5_0#${json}`;
    const [nodeA] = await addTextNodes([line]);
    const [nodeB] = await addTextNodes([line]);
    const keyA = JSON.parse(nodeA.data.content).blocks[0].key;
    const keyB = JSON.parse(nodeB.data.content).blocks[0].key;
    assert.strictEqual(keyA, keyB, 'same alias must always produce the same key');
  });

  it('sets textNodeStruct[alias] for old format', async () => {
    const json = JSON.stringify({ paragraphs: [{ parts: [{ text: 'A-2o4' }], indent: 0 }], indent: 0 });
    const line = `0#t_93_0#${json}`;
    // Import stateManager to inspect textNodeStruct
    const { textNodeStruct } = await import('src/utilities/ketcherSurfaceChemistry/stateManager');
    await addTextNodes([line]);
    assert.ok(textNodeStruct['t_93_0'], 'textNodeStruct should map alias to a key');
  });

  it('handles multi-entry old format matching sample 731 data', async () => {
    const json1 = JSON.stringify({ paragraphs: [{ parts: [{ text: '10% PtPd' }], indent: 0 }], indent: 0 });
    const json2 = JSON.stringify({ paragraphs: [{ parts: [{ text: 'A-2o4' }], indent: 0 }], indent: 0 });
    const lines = [`1#t_2_1#${json1}`, `0#t_93_0#${json2}`];
    const result = await addTextNodes(lines);
    assert.strictEqual(result.length, 2, 'both entries should produce nodes');
    assert.ok(result.every((r) => r !== null), 'no nulls');
    const texts = result.map((r) => JSON.parse(r.data.content).blocks[0].text);
    assert.ok(texts.includes('10% PtPd'), 'first label present');
    assert.ok(texts.includes('A-2o4'), 'second label present');
  });
});
