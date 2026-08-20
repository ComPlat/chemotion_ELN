export const MAX_MOLFILE_SIZE = 5 * 1024 * 1024;

const ATOM_LINE = /^\s*-?\d+\.?\d*\s+-?\d+\.?\d*\s+-?\d+\.?\d*\s+[A-Za-z*][A-Za-z0-9#']*/;
const COUNTS_LINE = /^[\s\d]{6}/;
const END_LINE = /^M {2}END\s*$/;
const V3000_COUNTS = /^M {2}V30 COUNTS (\d+) (\d+)/m;
const V3000_ATOM_BLOCK = /^M {2}V30 BEGIN ATOM\s*$/m;

// V3000 keeps its real atom and bond counts in an M  V30 COUNTS line, not the counts line.
const validateV3000 = (text) => {
  const counts = text.match(V3000_COUNTS);
  if (!counts) { return 'V3000 file has no COUNTS line'; }
  if (Number(counts[1]) < 1) { return 'this file holds no atoms'; }
  if (!V3000_ATOM_BLOCK.test(text)) { return 'V3000 file has no atom block'; }
  return null;
};

// Walks the atom block then the bond block, both sized by the counts line.
const validateV2000 = (lines, atoms, bonds) => {
  if (atoms < 1) { return 'this file holds no atoms'; }

  const atomLines = lines.slice(4, 4 + atoms);
  if (atomLines.length < atoms) {
    return `the counts line promises ${atoms} atoms but only ${atomLines.length} lines follow`;
  }
  const badAtom = atomLines.findIndex((line) => !ATOM_LINE.test(line));
  if (badAtom !== -1) { return `line ${5 + badAtom} is not an atom line`; }

  const bondLines = lines.slice(4 + atoms, 4 + atoms + bonds);
  if (bondLines.length < bonds) {
    return `the counts line promises ${bonds} bonds but only ${bondLines.length} lines follow`;
  }
  const badBond = bondLines.findIndex((line) => {
    const from = parseInt(line.slice(0, 3), 10);
    const to = parseInt(line.slice(3, 6), 10);
    return !(from >= 1 && from <= atoms && to >= 1 && to <= atoms);
  });
  if (badBond !== -1) { return `the bond on line ${5 + atoms + badBond} points at an atom that is not there`; }

  return null;
};

// Returns a sentence naming the first thing wrong with the text, or null if it is a molfile.
export const molfileProblem = (text) => {
  if (!text || !text.trim()) { return 'nothing to read'; }

  const lines = text.split(/\r?\n/);
  if (lines.length < 5) { return 'too short to be a molfile'; }

  const counts = lines[3];
  const atoms = parseInt(counts.slice(0, 3), 10);
  const bonds = parseInt(counts.slice(3, 6), 10);
  if (!COUNTS_LINE.test(counts) || Number.isNaN(atoms) || Number.isNaN(bonds)) {
    return 'line 4 should be the counts line - check for extra blank lines at the top';
  }

  const version = counts.slice(33).trim();
  if (version && !/^V[23]000$/.test(version)) { return `unknown molfile version "${version}"`; }
  if (!lines.some((line) => END_LINE.test(line))) { return 'no "M  END" line'; }

  return version === 'V3000' ? validateV3000(text) : validateV2000(lines, atoms, bonds);
};
