/* eslint-env node, mocha */

import expect from 'expect';

import {
  searchAndReplace
} from '../../../app/assets/javascripts/components/utils/markdownUtils';
import {
  sampleAnalysesFormatPattern, commonFormatPattern, nmrCheckMsg
} from '../../../app/assets/javascripts/components/utils/ElementUtils';
import {
  contentToText
} from '../../../app/assets/javascripts/components/utils/quillFormat';


describe('1HNMR H mapping test', () => {
  it('2461', () => {
    const formula = 'C15H18OS2';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (500 MHz, CDCl"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":", ppm) δ = 1.64–1.68 (m, 3H), 2.19 (s, 3H), 2.87 (dd, "},{"attributes":{"italic":true},"insert":"J "},{"insert":"= 15.6, "},{"attributes":{"italic":true},"insert":"J "},{"insert":"= 7.8 Hz, 1H), 3.01 (dd, "},{"attributes":{"italic":true},"insert":"J "},{"insert":"= 15.6, "},{"attributes":{"italic":true},"insert":"J "},{"insert":"= 7.6 Hz, 1H), 3.35–3.43 (m, 4H), 4.48 (t, "},{"attributes":{"italic":true},"insert":"J "},{"insert":"= 7.6 Hz, 1H), 7.18–7.24 (m, 3H), 7.27–7.31 (m, 2H). \n"}]};
    const contentText = contentToText(content);
    const result = nmrCheckMsg(formula, contentText)
    const expected = '';
    expect(result).toEqual(expected);
  });
  it('2462', () => {
    const formula = 'C11H18OS2';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (400 MHz, CDCl"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":", ppm) δ = 1.01 (t, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 7.5 Hz, 3H), 1.06 (t, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 7.3 Hz, 3H), 2.16 (q, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 7.5 Hz, 9H), 2.40–2.47 (m, 4H), 2.49–2.56 (m, 2H), 3.33 (s, 4H)."},{"attributes":{"color":"red"},"insert":" "},{"attributes":{"align":"justify"},"insert":"\n"}]};
    const contentText = contentToText(content);
    const result = nmrCheckMsg(formula, contentText)
    const expected = ' count: 25/18';
    expect(result).toEqual(expected);
  });
  it('2463', () => {
    const formula = 'C12H20OS2';
    const content ={"ops":[{"insert":"1","attributes":{"script":"super"}},{"insert":"H NMR (500 MHz, CDCl"},{"insert":"3","attributes":{"script":"sub"}},{"insert":", ppm) δ = 0.95–1.02 (m, 9H), 2.05–2.14 (m, 2H), 2.34–2.40 (m, 3H), 2.49 (dd, "},{"insert":"J ","attributes":{"italic":true}},{"insert":"= 15.6 Hz, "},{"insert":"J ","attributes":{"italic":true}},{"insert":"= 5.9 Hz, 1H), 3.03–3.12 (m, 1H), 3.25–3.29 (m, 4H).\n\n"}]};
    const contentText = contentToText(content);
    const result = nmrCheckMsg(formula, contentText)
    const expected = '';
    expect(result).toEqual(expected);
  });
  it('2464', () => {
    const formula = 'C13H22OS2';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (500 MHz, CDCl"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":", ppm) δ =  0.87 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 6.6 Hz, 3H), 0.90 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 6.6 Hz, 3H), 1.03 (t, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 7.6 Hz, 3H), 1.59–1.69 (m, 1H), 2.11 (s, 3H), 2.04–2.11 (m, 2H), 2.40–2.47 (m, 1H), 2.57–2.63 (m, 1H), 2.72 (td, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 9.5 Hz,"},{"attributes":{"italic":true},"insert":" J"},{"insert":" = 5.0 Hz, 1H), 3.23–3.31 (m, 4H).\n"}]};
    const contentText = contentToText(content);
    const result = nmrCheckMsg(formula, contentText)
    const expected = '';
    expect(result).toEqual(expected);
  });

  it('42260', () => {
    const formula = 'C11H12BrN';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (400 MHz, CDCl"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":", ppm) δ = 7.40 (m, 3H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"ar"},{"insert":"), 2.27 (s, 3H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":"), 1.30 (s, 6H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":").\n"}]};
    const contentText = contentToText(content);
    const result = nmrCheckMsg(formula, contentText)
    const expected = '';
    expect(result).toEqual(expected);
  });
  it('41931', () => {
    const formula = 'C26H28N4';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (400 MHz, CDCl"},{"attributes":{"script":"sub"},"insert":"3, "},{"insert":"ppm) "},{"attributes":{"italic":true},"insert":"δ"},{"insert":" = 9.13 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 1.5 Hz, 1H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"Ar"},{"insert":"), 8.16 (dd, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 4.6, 1.5 Hz, 1H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"Ar"},{"insert":"), 7.86 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 4.6 Hz, 1H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"Ar"},{"insert":"), 6.97 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 1.4 Hz, 1H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"Ar"},{"insert":"), 6.71 (s, 1H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"Ar"},{"insert":"), 6.65 – 6.53 (m, 2H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"Ar"},{"insert":"), 6.53 (s, 2H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"Ar"},{"insert":"), 3.33 – 2.99 (m, 6H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"2"},{"insert":"), 2.96 – 2.81 (m, 2H, C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"2"},{"insert":"), 0.77 (s, 9H, 3 × C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":").\n"}]};
    const contentText = contentToText(content);
    console.log(contentText);
    const result = nmrCheckMsg(formula, contentText)
    const expected = ' count: 26/28';
    expect(result).toEqual(expected);
  });
  it('41987', () => {
    const formula = 'C26H40O3';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (500 MHz, DMSO-d"},{"attributes":{"script":"sub"},"insert":"6"},{"insert":") δ [ppm] = 11.97 (s, 1H, COOH), 3.21 (s, 3H, OCH"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":"), 2.73 (t, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 2.9 Hz, 1H, 6-H), 1.90 (dt, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 12.4, 3.2 Hz, 1H, x-CH"},{"attributes":{"italic":true},"insert":"H"},{"insert":"), 1.83 – 0.75 [m, 28H, beinhaltet: 1.14 (td, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 12.6, 3.9 Hz, 1H, x-C"},{"attributes":{"italic":true},"insert":"H"},{"insert":"H), 0.97 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 6.6 Hz, 3H, 21-CH"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":"), 0.94 (s, 3H, 19-CH"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":")], 0.64 – 0.56 [m, 5H, beinhaltet: 0.62 (s, 3H, 18-CH"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":")], 0.40 (dd, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 8.0, 5.0 Hz, 1H, 3-CH"},{"attributes":{"italic":true},"insert":"H"},{"insert":").\n"}]};
    const contentText = contentToText(content);
    console.log(contentText);
    const result = nmrCheckMsg(formula, contentText)
    const expected = ' count: 17/40';
    expect(result).toEqual(expected);
  });
  it('42055', () => {
    const formula = 'C5H4CINO';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (500 MHz, CD"},{"attributes":{"script":"sub"},"insert":"2"},{"insert":"Cl"},{"attributes":{"script":"sub"},"insert":"2"},{"insert":", ppm) δ = 8.07–8.04 (m, 2H, 2-C"},{"attributes":{"italic":true},"insert":"H"},{"insert":" and 6-C"},{"attributes":{"italic":true},"insert":"H"},{"insert":"), 7.27–7.20 (m, 2H, 3-C"},{"attributes":{"italic":true},"insert":"H"},{"insert":" and 5-C"},{"attributes":{"italic":true},"insert":"H"},{"insert":") .\n"}]};
    const contentText = contentToText(content);
    console.log(contentText);
    const result = nmrCheckMsg(formula, contentText)
    const expected = '';
    expect(result).toEqual(expected);
  });
  it('41891', () => {
    const formula = 'C16H13NO';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (400 MHz, DMSO-d"},{"attributes":{"script":"sub"},"insert":"6"},{"insert":", ppm) δ = 4.15 (s, 2H), 7.13–7.25 (m, 3H), 7.26–7.39 (m, 4H), 7.47 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 8.0 Hz, 1H), 8.17 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 7.6 Hz, 1H), 8.52 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 2.5 Hz, 1H), 12.00 (br. s., 1H).\n"}]};
    const contentText = contentToText(content);
    console.log(contentText);
    const result = nmrCheckMsg(formula, contentText)
    const expected = '';
    expect(result).toEqual(expected);
  });
  it('42164', () => {
    const formula = 'C12H12N2';
    const content = {"ops":[{"attributes":{"script":"super"},"insert":"1"},{"insert":"H NMR (500 MHz, CDCl"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":", ppm): δ = 8.68 (s, 2H, 2'- and 6'-C"},{"attributes":{"italic":true},"insert":"H"},{"insert":"), 7.46 (d, 2H, J = 4.9 Hz, 2H, 3'- and 5'-C"},{"attributes":{"italic":true},"insert":"H"},{"insert":"), 7.15 (s, 2H, 3- and 5-C"},{"attributes":{"italic":true},"insert":"H"},{"insert":"), 2.57 – 2.54 (m, 6H, 2- and 6-C"},{"attributes":{"italic":true},"insert":"H"},{"attributes":{"script":"sub"},"insert":"3"},{"insert":").\n"}]};
    const contentText = contentToText(content);
    console.log(contentText);
    const result = nmrCheckMsg(formula, contentText)
    const expected = ' count: 14/12';
    expect(result).toEqual(expected);
  });
  it('2875', () => {
    const formula = 'C72H32F30N8O2';
    const content = {"ops":[{"attributes":{"bold":true,"script":"super"},"insert":"1"},{"attributes":{"bold":true},"insert":"H NMR"},{"insert":" (400 MHz, Chloroform-"},{"attributes":{"italic":true},"insert":"d"},{"insert":") δ 7.98 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 7.7 Hz, 1H), 7.69 – 7.60 (m, 4H), 7.40 (d, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 7.7 Hz, 2H), 7.37 – 7.27 (m, 2H), 7.25 – 7.17 (m, 4H), 7.14 – 7.08 (m, 6H), 7.04 – 6.94 (m, 8H), 6.84 (t, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 7.4 Hz, 2H), 6.71 (ddd, "},{"attributes":{"italic":true},"insert":"J"},{"insert":" = 8.4, 7.2, 1.2 Hz, 2H)."},{"attributes":{"align":"justify"},"insert":"\n"},{"insert":"\n"}]};
    const contentText = contentToText(content);
    console.log(contentText);
    const result = nmrCheckMsg(formula, contentText)
    const expected = ' count: 31/32';
    expect(result).toEqual(expected);
  });
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
