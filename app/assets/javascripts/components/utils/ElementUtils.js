import Aviator from 'aviator';
import _ from 'lodash';
import {
  deltaToMarkdown, markdownToDelta
} from './deltaMarkdownConverter';
import { searchAndReplace } from './markdownUtils';

import UIStore from '../stores/UIStore';

const rfValueFormat = (input) => {
  if (typeof input !== 'string') { return input; }
  let result = input;
  (input.match(/[0]+[,]\d+/mg) || []).forEach((rf) => {
    result = result.replace(rf, rf.replace(',', '.'));
  });
  return result;
};

const atomCountInFormula = (formula, e = 'H') => {
  if (typeof formula !== 'string') { return 0; }
  const regStr = `${e}\\d*`;
  const re = new RegExp(regStr);
  const hForm = re.exec(formula);
  if (!hForm) { return 0; }
  const count = hForm[0].slice(1);
  if (count.length === 0) { return 1; }
  return parseInt(count, 10);
};

const reduceByPeak = (splitData) => {
  let within = 0;
  return splitData.split(/(\(|\)|,)/).reduce(
    (acc, cv) => {
      if (within === 0) {
        if (cv === ',') {
          acc.push('');
          return acc;
        } else if (cv && cv.match(/[^\d]?\.[^\d]/)) {
          acc.push('.');
          return acc;
        }
      }
      if (cv === '(') {
        within += 1;
      } else if (cv === ')') {
        within -= 1;
      }
      acc[acc.length - 1] += cv;
      return acc;
    },
    ['']
  );
};

const splitDotPhrase = (phrases) => {
  let within = 0;
  return phrases.split(/(\(|\[\]|\)|\d\.\d|\.)/).reduce(
    (acc, cv) => {
      if (within === 0) {
        if (cv && cv.match(/\d\.\d/)) {
          //
        } else if (cv === '.') {
          acc.push('');
          return acc;
        }
      }
      if (cv === '(' || cv === '[') {
        within += 1;
      } else if (cv === ')' || cv === ']') {
        within -= 1;
      }
      acc[acc.length - 1] += cv;
      return acc;
    },
    ['']
  );
};

const countHWithinBracket = (peakContent) => {
  const bracketContent = peakContent && peakContent.match(/\((.*\d+[^C]*H.*)\)/);
  if (!bracketContent) { return false; }

  const simpleCount = bracketContent[1].match(/(^|[^\w])(\d+(\.\d+)?)H/);
  if (simpleCount) { return parseFloat(simpleCount[2], 10); }

  // const xCount = bracketContent[1].match(/(\d+(\.\d+)?)\s*(×|x)\s*./);
  // if (xCount) { return parseFloat(xCount[1], 10); }

  return false;
};

const countCWithinBracket = (peakContent) => {
  const bracketContent = peakContent && peakContent.match(/\((.*\d+[^C]*C.*)\)/);
  if (!bracketContent) { return false; }

  const simpleCount = bracketContent[1].match(/(^|[^\w])(\d+(\.\d+)?)\s*C/);
  if (simpleCount) { return parseFloat(simpleCount[2], 10); }

  const xCount = bracketContent[1].match(/(\d+(\.\d+)?)\s*(×|x)\s*./);
  if (xCount) { return parseFloat(xCount[1], 10); }

  return false;
};

const atomCountInNMRDescription = (nmrStr) => {
  const phraseArr = splitDotPhrase(nmrStr);
  const count = reduceByPeak(phraseArr[0]).reduce((acc, peak) => {
    const hs = countHWithinBracket(peak);
    if (hs) { return acc + hs; }
    return acc;
  }, 0);
  const missed = countHWithinBracket(phraseArr[1]);
  if (missed) { return missed + count; }

  return count;
};

const atomCountCInNMRDescription = (cNmrStr) => {
  const m = cNmrStr.match(/\s*(=|:|δ)(.*)\S/);
  if (!m) { return 0; }

  const phraseArr = splitDotPhrase(m[2]);
  const count = reduceByPeak(phraseArr[0]).reduce((acc, peak) => {
    if (!peak.match(/\d/)) { return acc; }
    const cwb = countCWithinBracket(peak);
    if (cwb) { return acc + cwb; }
    return acc + 1;
  }, 0);
  const missed = countCWithinBracket(phraseArr[1]);
  if (missed) { return count + missed; }

  return count;
};


const hNmrCount = (nmrStr) => {
  if (typeof (nmrStr) !== 'string') {
    return '';
  }
  return atomCountInNMRDescription(nmrStr);
};

const cNmrCount = (nmrStr) => {
  if (typeof (nmrStr) !== 'string') {
    return '';
  }
  return atomCountCInNMRDescription(nmrStr);
};

const hNmrCheckMsg = (formula, nmrStr) => {
  if (typeof (formula) !== 'string' || typeof (nmrStr) !== 'string') {
    return '';
  }
  const countInFormula = atomCountInFormula(formula, 'H');
  const countInDesc = atomCountInNMRDescription(nmrStr);

  if (countInFormula !== countInDesc) {
    return ` count: ${countInDesc}/${countInFormula}`;
  }
  return '';
};

const cNmrCheckMsg = (formula, nmrStr) => {
  if (typeof (formula) !== 'string' || typeof (nmrStr) !== 'string') {
    return '';
  }
  const countInFormula = atomCountInFormula(formula, 'C');
  const countInDesc = atomCountCInNMRDescription(nmrStr);
  if (countInFormula !== countInDesc) {
    return ` count: ${countInDesc}/${countInFormula}`;
  }
  return '';
};

const isEmwInMargin = (diff) => {
  const margin = 1.0;
  return diff <= margin
    || Math.abs(diff - 1) <= margin
    || Math.abs(diff - 23) <= margin
    || Math.abs(diff - 39) <= margin;
};

const emwInStr = (emw, msStr) => {
  const peaks = msStr.split(/,|:|;|=/).map((s) => {
    const t = s.replace('found', '')
      .replace(/[\(\[\{](.*?)[\)\]\}]/g, '')
      .replace(/\s/g, '');
    return t.match(/[a-zA-Z]/) ? 0 : parseFloat(t);
  });

  let detected = false;

  peaks.forEach((p) => {
    const diff = Math.abs(p - emw);
    if (isEmwInMargin(diff)) detected = true;
  });
  return detected;
};

const msCheckMsg = (exactMolWeight, msStr) => {
  if (typeof (exactMolWeight) !== 'number' || typeof (msStr) !== 'string') {
    return '';
  }

  const detected = emwInStr(exactMolWeight, msStr);
  return detected ? '' : ' exact weight not found';
};

const SameEleTypId = (orig, next) => {
  if (orig && next && orig.type === next.type && orig.id === next.id) {
    return true;
  }
  return false;
};

const UrlSilentNavigation = (element) => {
  const { currentCollection, isSync } = UIStore.getState();
  if (element) {
    let elementString = `${element.type}`;
    if (!isNaN(element.id)) elementString += `/${element.id}`;

    const collectionUrl = `${currentCollection.id}/${elementString}`;
    Aviator.navigate(
      isSync ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`,
      { silent: true },
    );
  } else {
    const cId = currentCollection.id;
    Aviator.navigate(
      isSync ? `/scollection/${cId}/` : `/collection/${cId}/`,
      { silent: true },
    );
  }
};

const markdownChemicalFormular = (text) => {
  text = text.replace(/(C|H|O|N|S)(\d+)/g, '$1<sub>$2</sub>');
  return text;
};

const commonFormatPattern = [
  {
    pattern: '(,{0,1})( {0,1})(\\d+\\.){0,1}(\\d+) {0,1}H([^\\d\\w])',
    replace: '$1 $3$4H$5'
  },
  {
    pattern: ' CDC(l|L)3,',
    replace: ' CDCl<sub>3</sub>,'
  },
  {
    pattern: 'J {0,1}= {0,1}(\\d+)',
    replace: '*J* = $1'
  },
  {
    pattern: '(\\d+),(\\d+)',
    replace: '$1.$2'
  },
  {
    pattern: '\\) {0,1}, {0,1}',
    replace: '), '
  },
  {
    pattern: '\\) (\\d+)',
    replace: '), $1'
  },
  {
    pattern: '(\\d+) - (\\d+)',
    replace: '$1–$2'
  },
  {
    pattern: '(\\d+) ([\\u2013-\\u2015]) (\\d+)',
    replace: '$1$2$3'
  },
];

const sampleAnalysesFormatPattern = {
  '_chmo:0000595': [
    {
      pattern: '(\\W|^)13 {0,1}C( |-)NMR',
      replace: '$1<sup>13</sup>C NMR'
    },
    {
      pattern: '<sup>13</sup>C-NMR',
      replace: '<sup>13</sup>C NMR'
    },
    {
      pattern: '(\\d+) C',
      replace: '$1C'
    },
  ],
  _13cnmr: [
    {
      pattern: '(\\W|^)13 {0,1}C( |-)NMR',
      replace: '$1<sup>13</sup>C NMR'
    },
    {
      pattern: '<sup>13</sup>C-NMR',
      replace: '<sup>13</sup>C NMR'
    },
    {
      pattern: '(\\d+) C',
      replace: '$1C'
    },
  ],
  '_chmo:0000593': [
    {
      pattern: '(\\W|^)1 {0,1}H( |-)NMR',
      replace: '$1<sup>1</sup>H NMR'
    },
    {
      pattern: '<sup>1</sup>H-NMR',
      replace: '<sup>1</sup>H NMR'
    },
  ],
  _1hnmr: [
    {
      pattern: '(\\W|^)1 {0,1}H( |-)NMR',
      replace: '$1<sup>1</sup>H NMR'
    },
    {
      pattern: '<sup>1</sup>H-NMR',
      replace: '<sup>1</sup>H NMR'
    },
  ],
  '_chmo:0001075': [
    {
      pattern: '(\\W|^)(C|H|O|N|S) (\\d{2})',
      replace: '$1$2, $3'
    },
    {
      pattern: '(\\d\\.\\d\\d) {0,1},',
      replace: '$1;'
    },
  ],
  _ea: [
    {
      pattern: '(\\W|^)(C|H|O|N|S) (\\d{2})',
      replace: '$1$2, $3'
    },
    {
      pattern: '(\\d\\.\\d\\d) {0,1},',
      replace: '$1;'
    },
  ],
  '_chmo:0000630': [
    {
      pattern: '(\\W|^)cm-1',
      replace: '$1cm<sup>–1</sup>'
    },
    {
      pattern: '(\\W|^)cm<sup>-1</sup>',
      replace: '$1cm<sup>–1</sup>'
    },
  ],
  _ir: [
    {
      pattern: '(\\W|^)cm-1',
      replace: '$1cm<sup>–1</sup>'
    },
    {
      pattern: '(\\W|^)cm<sup>-1</sup>',
      replace: '$1cm<sup>–1</sup>'
    },
  ],
  'chmo:0000470': [
    {
      pattern: '(\\W)m/z(\\W|$)',
      replace: '$1*m/z*$2'
    },
    {
      pattern: '(\\W)calc\\.(\\W|$)',
      replace: '$1calcd$2'
    },
    {
      pattern: '(\\W)calcd(\\W|$)',
      replace: '$1Calcd$2'
    },
    {
      pattern: '\\. HRMS(\\W)',
      replace: '; HRMS$1'
    },
    {
      pattern: ', found',
      replace: '. Found'
    },
    {
      pattern: 'HRMS \\(((C|H|O|N|S)(\\d{1,2}))+\\)',
      replace: markdownChemicalFormular
    },
  ],
  _mass: [
    {
      pattern: '(\\W)m/z(\\W|$)',
      replace: '$1*m/z*$2'
    },
    {
      pattern: '(\\W)calc\\.(\\W|$)',
      replace: '$1calcd$2'
    },
    {
      pattern: '(\\W)calcd(\\W|$)',
      replace: '$1Calcd$2'
    },
    {
      pattern: '\\. HRMS(\\W)',
      replace: '; HRMS$1'
    },
    {
      pattern: ', found',
      replace: '. Found'
    },
    {
      pattern: 'HRMS \\(((C|H|O|N|S)(\\d{1,2}))+\\)',
      replace: markdownChemicalFormular
    },
  ]
};

const formatAnalysisContent = function autoFormatAnalysisContentByPattern(analysis) {
  const content = _.cloneDeep(analysis.extended_metadata.content);
  let kind = analysis.extended_metadata.kind || '';
  kind = kind.split('|')[0] || kind;
  const type = `_${kind.toLowerCase().replace(/ /g, '')}`;
  let md = deltaToMarkdown(content);
  let formatPattern = (sampleAnalysesFormatPattern[type] || []);
  formatPattern = formatPattern.concat(commonFormatPattern);
  formatPattern.forEach((patt) => {
    md = searchAndReplace(md, patt.pattern, patt.replace);
  });

  return markdownToDelta(md);
};

const Alphabet = (input = 1) => {
  const num = parseInt(input, 10);
  const index = num >= 1 && num <= 26 ? num - 1 : 25;
  const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabets[index];
};

const SampleCode = (index, materialGp) => {
  switch (materialGp) {
    case 'solvents':
      return `S${index}`;
    case 'purification_solvents':
      return `PS${index}`;
    case 'products':
      return `P${index}`;
    default:
      return Alphabet(index);
  }
};

module.exports = {
  rfValueFormat,
  hNmrCheckMsg,
  cNmrCheckMsg,
  hNmrCount,
  cNmrCount,
  msCheckMsg,
  SameEleTypId,
  UrlSilentNavigation,
  sampleAnalysesFormatPattern,
  commonFormatPattern,
  Alphabet,
  SampleCode,
  formatAnalysisContent,
  atomCountInFormula,
  atomCountInNMRDescription,
  atomCountCInNMRDescription,
  emwInStr,
};
