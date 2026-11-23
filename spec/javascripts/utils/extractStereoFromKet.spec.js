/* eslint-disable no-undef */
import expect from 'expect';
import { extractStereoFromKet } from '../../../app/javascript/src/utilities/ketcherSurfaceChemistry/stereoUtils';

describe('extractStereoFromKet', () => {
  describe('guard conditions', () => {
    it('returns null for null input', () => {
      expect(extractStereoFromKet(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(extractStereoFromKet(undefined)).toBeNull();
    });

    it('returns null for a non-object input', () => {
      expect(extractStereoFromKet('string')).toBeNull();
    });

    it('returns null when no molecules contain atoms', () => {
      const ket = { root: { nodes: [] }, mol0: {} };
      expect(extractStereoFromKet(ket)).toBeNull();
    });

    it('returns null when atoms have no stereoLabel', () => {
      const ket = {
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: { atoms: [{ label: 'C' }, { label: 'O' }] },
      };
      expect(extractStereoFromKet(ket)).toBeNull();
    });
  });

  describe('does NOT trigger on Indigo auto-generated abs labels', () => {
    it('returns null when atoms only have abs stereoLabel', () => {
      const ket = {
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: {
          atoms: [
            { label: 'C', stereoLabel: 'abs' },
            { label: 'C', stereoLabel: 'abs' },
          ],
        },
      };
      expect(extractStereoFromKet(ket)).toBeNull();
    });
  });

  describe('detects user-set AND stereogroups', () => {
    it('returns { abs: "rac" } when an atom has stereoLabel "and1"', () => {
      const ket = {
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: {
          atoms: [{ label: 'C', stereoLabel: 'and1' }],
        },
      };
      expect(extractStereoFromKet(ket)).toEqual({ abs: 'rac' });
    });

    it('returns { abs: "rac" } for and2, and3 — multiple AND groups', () => {
      const ket = {
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: {
          atoms: [
            { label: 'C', stereoLabel: 'and2' },
            { label: 'C', stereoLabel: 'and3' },
          ],
        },
      };
      expect(extractStereoFromKet(ket)).toEqual({ abs: 'rac' });
    });

    it('detects AND regardless of case (AND1)', () => {
      const ket = {
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: { atoms: [{ label: 'C', stereoLabel: 'AND1' }] },
      };
      expect(extractStereoFromKet(ket)).toEqual({ abs: 'rac' });
    });
  });

  describe('detects user-set OR stereogroups', () => {
    it('returns { abs: "rac" } when an atom has stereoLabel "or1"', () => {
      const ket = {
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: {
          atoms: [{ label: 'C', stereoLabel: 'or1' }],
        },
      };
      expect(extractStereoFromKet(ket)).toEqual({ abs: 'rac' });
    });

    it('detects OR regardless of case (OR1)', () => {
      const ket = {
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: { atoms: [{ label: 'C', stereoLabel: 'OR1' }] },
      };
      expect(extractStereoFromKet(ket)).toEqual({ abs: 'rac' });
    });
  });

  describe('multi-molecule KET', () => {
    it('returns { abs: "rac" } when any molecule contains an AND stereogroup', () => {
      const ket = {
        root: { nodes: [{ $ref: 'mol0' }, { $ref: 'mol1' }] },
        mol0: { atoms: [{ label: 'C' }] },
        mol1: { atoms: [{ label: 'C', stereoLabel: 'and1' }] },
      };
      expect(extractStereoFromKet(ket)).toEqual({ abs: 'rac' });
    });

    it('skips the root key and does not crash on it', () => {
      const ket = {
        root: { nodes: [{ stereoLabel: 'and1' }] },
        mol0: { atoms: [{ label: 'C' }] },
      };
      expect(extractStereoFromKet(ket)).toBeNull();
    });
  });
});
