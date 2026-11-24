import expect from 'expect';
import { isMolfileEmpty } from '../../../app/javascript/src/utilities/ketcherSurfaceChemistry/canvasOperations';

describe('isMolfileEmpty', () => {
  it('returns false for V3000 molfile with 1 atom', () => {
    const mol = '\n\n\nM  V30 BEGIN CTAB\nM  V30 COUNTS 1 0 0 0 0\nM  V30 END CTAB\nM  END\n';
    expect(isMolfileEmpty(mol)).toBe(false);
  });

  it('returns true for V3000 molfile with 0 atoms', () => {
    const mol = '\n\n\nM  V30 BEGIN CTAB\nM  V30 COUNTS 0 0 0 0 0\nM  V30 END CTAB\nM  END\n';
    expect(isMolfileEmpty(mol)).toBe(true);
  });

  it('returns false for V2000 molfile with 1 atom', () => {
    const mol = '\n  noname\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';
    expect(isMolfileEmpty(mol)).toBe(false);
  });

  it('returns true for V2000 molfile with 0 atoms', () => {
    const mol = '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';
    expect(isMolfileEmpty(mol)).toBe(true);
  });

  it('returns true for null', () => {
    expect(isMolfileEmpty(null)).toBe(true);
  });

  it('returns true for a non-string value', () => {
    expect(isMolfileEmpty(42)).toBe(true);
  });
});
