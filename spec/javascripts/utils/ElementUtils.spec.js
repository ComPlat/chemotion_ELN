/* eslint-env node, mocha */

import expect from 'expect';

import {
  searchAndReplace
} from '../../../app/assets/javascripts/components/utils/markdownUtils';
import {
  sampleAnalysesFormatPattern, commonFormatPattern, hNmrCheckMsg, cNmrCheckMsg, rfValueFormat
} from '../../../app/assets/javascripts/components/utils/ElementUtils';
import { contentToText } from '../../../app/assets/javascripts/components/utils/quillFormat';
import { nmrData1H } from '../fixture/nmr1H';
import { nmrData13C } from '../fixture/nmr13C';
import { rfValues } from '../fixture/rfvalue';

describe('RF Value formating', () => {
  Object.keys(rfValues).map(k => (
    it(k, () => {
      const fixture = rfValues[k];
      const result = rfValueFormat(fixture.rfValue);
      expect(result).toEqual(fixture.expected);
    })
  ));
});

describe('1HNMR H counting', () => {
  Object.keys(nmrData1H).map(k => (
    it(k, () => {
      const fixture = nmrData1H[k];
      const contentText = contentToText(fixture.content);
      const result = hNmrCheckMsg(fixture.formula, contentText);
      expect(result).toEqual(fixture.expected);
    })
  ));
});

describe('13CNMR C counting', () => {
  Object.keys(nmrData13C).map(k => (
    it(k, () => {
      const fixture = nmrData13C[k];
      const contentText = contentToText(fixture.content);
      const result = cNmrCheckMsg(fixture.formula, contentText);
      expect(result).toEqual(fixture.expected);
    })
  ));
});

describe('common format pattern', () => {
  it('can detect number of hydrogen and remove space', () => {
    let org = ' 1H NMR, (K = 7.4 Hz, 3 H), 1.06 (t, K = 7.3 Hz, 3 H)';
    commonFormatPattern.forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = ' 1H NMR, (K = 7.4 Hz, 3H), 1.06 (t, K = 7.3 Hz, 3H)';
    expect(org).toEqual(expected);
  });


  it('can add subscript to CDCL', () => {
    let org = ' CDCL3, CDCl3,';
    commonFormatPattern.forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = ' CDCl<sub>3</sub>, CDCl<sub>3</sub>,';
    expect(org).toEqual(expected);
  });

  it('add italic format to J = xxx', () => {
    let org = 'J=1; J = 2; J= 3; J=1111';
    commonFormatPattern.forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '*J* = 1; *J* = 2; *J* = 3; *J* = 1111';
    expect(org).toEqual(expected);
  });

  it('can replace decimal comma to dot', () => {
    let org = '12,3333 abc,222 0,12';
    commonFormatPattern.forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '12.3333 abc,222 0.12';
    expect(org).toEqual(expected);
  });

  it('remove unnecessary space and add comma after close paranthese', () => {
    let org = '(blah blah) , (abc def) 123456';
    commonFormatPattern.forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '(blah blah), (abc def), 123456';
    expect(org).toEqual(expected);
  });

  it('replace hyphen with n-dash if hyphen is between numbers', () => {
    let org = '12 - 22';
    commonFormatPattern.forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '12–22';
    expect(org).toEqual(expected);
  });
});

describe('13C NMR pattern', () => {
  it('can detect 13C NMR and add superscript', () => {
    let org = '13 C NMR blah blah';
    sampleAnalysesFormatPattern['_13cnmr'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '<sup>13</sup>C NMR blah blah';
    expect(org).toEqual(expected);
  });

  it('remove unnecessar space if "number of carbon" group', () => {
    let org = '23 C, 57C';
    sampleAnalysesFormatPattern['_13cnmr'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '23C, 57C';
    expect(org).toEqual(expected);
  });
});

describe('1H NMR pattern', () => {
  it('can detect 1H NMR and add superscript', () => {
    let org = '1H NMR 1 H NMR';
    sampleAnalysesFormatPattern['_1hnmr'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '<sup>1</sup>H NMR <sup>1</sup>H NMR';
    expect(org).toEqual(expected);
  });
});

describe('EA pattern', () => {
  it('add a comma between C,H,O,N,S and a number', () => {
    let org = 'C 12 H 13 O 15 S 20';
    sampleAnalysesFormatPattern['_ea'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = 'C, 12 H, 13 O, 15 S, 20';
    expect(org).toEqual(expected);
  });

  it('replace a comma with semicolon after a decimal number', () => {
    let org = '12.11, 12.10 ,';
    sampleAnalysesFormatPattern['_ea'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '12.11; 12.10;';
    expect(org).toEqual(expected);
  });
});

describe('IR pattern', () => {
  it('replace hyphen with ndash and make superscript for cm-1', () => {
    let org = 'ccm-1 cm-1 cm<sup>-1</sup>';
    sampleAnalysesFormatPattern['_ir'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = 'ccm-1 cm<sup>–1</sup> cm<sup>–1</sup>';
    expect(org).toEqual(expected);
  });
});

describe('Mass pattern', () => {
  it('add italic format to m/z block', () => {
    let org = 'm/zzz m/z mmm/z12';
    sampleAnalysesFormatPattern['_mass'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = 'm/zzz *m/z* mmm/z12';
    expect(org).toEqual(expected);
  });

  it('replace calc. to Cacld', () => {
    let org = 'calc calccc ccalc. calc.';
    sampleAnalysesFormatPattern['_mass'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = 'calc calccc ccalc. Calcd';
    expect(org).toEqual(expected);
  });

  it('replace dot to semicolon for HRMS info', () => {
    let org = '. HRMSS. HRMS,';
    sampleAnalysesFormatPattern['_mass'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = '. HRMSS; HRMS,';
    expect(org).toEqual(expected);
  });

  it('format organic chemical formular (C H O N S) automatically', () => {
    let org = 'something C1H2O3 HRMS (C15H16O17N18S19)';
    sampleAnalysesFormatPattern['_mass'].forEach((patt) => {
      org = searchAndReplace(org, patt.pattern, patt.replace);
    });

    const expected = 'something C1H2O3 HRMS (' +
      'C<sub>15</sub>H<sub>16</sub>O<sub>17</sub>N<sub>18</sub>S<sub>19</sub>)';
    expect(org).toEqual(expected);
  });
});
