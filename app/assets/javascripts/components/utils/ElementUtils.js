import Aviator from 'aviator';
import _ from 'lodash';
import {
  deltaToMarkdown, markdownToDelta
} from './deltaMarkdownConverter';
import { searchAndReplace } from './markdownUtils';

import UIStore from '../stores/UIStore';

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
];

const sampleAnalysesFormatPattern = {
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
  const kind = analysis.extended_metadata.kind || '';
  const type = `_${kind.toLowerCase().replace(/ /g, '')}`;
  let md = deltaToMarkdown(content);
  console.log(md);
  let formatPattern = (sampleAnalysesFormatPattern[type] || []);
  formatPattern = formatPattern.concat(commonFormatPattern);
  console.log(formatPattern);
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
    case 'products':
      return `P${index}`;
    default:
      return Alphabet(index);
  }
};

module.exports = {
  SameEleTypId,
  UrlSilentNavigation,
  sampleAnalysesFormatPattern,
  commonFormatPattern,
  Alphabet,
  SampleCode,
  formatAnalysisContent
};
