/* eslint-disable no-undef */
import fs from 'fs';
import path from 'path';
import expect from 'expect';
import { molfileProblem } from '../../../app/javascript/src/utilities/MolfileValidation';

const fixture = (name) => fs.readFileSync(
  path.join(__dirname, '../../fixtures/structures/molfiles', name),
  'utf8'
);

describe('MolfileValidation', () => {
  const cubane = fixture('cubane.mol');
  const lines = cubane.split('\n');
  const corrupt = (index, replacement) => {
    const copy = lines.slice();
    copy[index] = replacement;
    return copy.join('\n');
  };

  describe('accepts real structures', () => {
    it('accepts a V2000 molfile', () => {
      expect(molfileProblem(cubane)).toBeNull();
    });

    it('accepts Windows line endings', () => {
      expect(molfileProblem(cubane.replace(/\n/g, '\r\n'))).toBeNull();
    });

    it('accepts a V3000 molfile', () => {
      expect(molfileProblem(fixture('multiple_R.mol'))).toBeNull();
    });

    it('accepts counts over 99, where the columns run together', () => {
      expect(molfileProblem(fixture('ekowor_uranium.mol'))).toBeNull();
    });

    it('accepts a single record pulled out of an SDF', () => {
      expect(molfileProblem(`${cubane}\n$$$$\n`)).toBeNull();
    });

    it('accepts every molfile fixture in the repo that holds atoms', () => {
      const dirs = ['structures/molfiles', 'files', '.'];
      const noStructure = ['pc400.mol'];
      const rejected = [];
      dirs.forEach((dir) => {
        const full = path.join(__dirname, '../../fixtures', dir);
        fs.readdirSync(full)
          .filter((name) => name.endsWith('.mol') && !noStructure.includes(name))
          .forEach((name) => {
            const problem = molfileProblem(fs.readFileSync(path.join(full, name), 'utf8'));
            if (problem) { rejected.push(`${dir}/${name}: ${problem}`); }
          });
      });
      expect(rejected).toEqual([]);
    });
  });

  describe('rejects anything that is not a structure', () => {
    const rejected = {
      'an empty string': '',
      'whitespace only': '   \n  \n',
      'a SMILES': 'CCO',
      'prose ending in M  END': 'Dear team\nthis is a note\nabout nothing\nreally nothing\nM  END',
      'a CSV': 'name,smiles\nethanol,CCO\nwater,O\nbenzene,c1ccccc1\nM  END',
      'an HTML page': '<html>\n<head>\n<title>404</title>\n</head>\n<body>M  END</body>\n</html>',
      'a PubChem error saved as a molfile': 'Status: 400\n OpenBabel\nMessage: failed\n'
        + '  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END',
    };

    Object.entries(rejected).forEach(([what, text]) => {
      it(`rejects ${what}`, () => {
        expect(molfileProblem(text)).not.toBeNull();
      });
    });
  });

  describe('rejects damaged structures', () => {
    it('rejects a file with no "M  END"', () => {
      expect(molfileProblem(cubane.replace(/M {2}END[\s\S]*$/, ''))).toEqual('no "M  END" line');
    });

    it('rejects an unknown version', () => {
      expect(molfileProblem(cubane.replace('V2000', 'V9000'))).toEqual('unknown molfile version "V9000"');
    });

    it('rejects a file cut short mid-structure', () => {
      expect(molfileProblem(cubane.slice(0, 200))).not.toBeNull();
    });

    it('rejects fewer atom lines than the counts line promises', () => {
      expect(molfileProblem(`${lines.slice(0, 7).join('\n')}\nM  END`))
        .toMatch(/promises 8 atoms/);
    });

    it('rejects an atom line that is not an atom line', () => {
      expect(molfileProblem(corrupt(4, 'hello there, not an atom'))).toEqual('line 5 is not an atom line');
    });

    it('rejects an atom line with no element symbol', () => {
      expect(molfileProblem(corrupt(4, '   -4.3500    1.8250    0.0000'))).toEqual('line 5 is not an atom line');
    });

    it('rejects a bond pointing at an atom that does not exist', () => {
      expect(molfileProblem(corrupt(12, ' 99  3  1  0     0  0'))).toMatch(/points at an atom that is not there/);
    });

    it('rejects a V3000 file with no COUNTS line', () => {
      const text = 'x\n y\n\n  0  0  0     0  0              0 V3000\nM  V30 BEGIN CTAB\nM  END';
      expect(molfileProblem(text)).toEqual('V3000 file has no COUNTS line');
    });
  });
});
