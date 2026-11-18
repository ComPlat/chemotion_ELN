/* eslint-disable no-undef */
import assert from 'assert';
import { describe, it } from 'mocha';
import {
  hasKetcherData,
  extractPolymerTagFromAliases,
  parsePolymerEntryByAtomIndex,
} from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';

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
