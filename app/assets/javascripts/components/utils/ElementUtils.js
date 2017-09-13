import Aviator from 'aviator';
import UIStore from '../stores/UIStore';

const SameEleTypId = (orig, next) => {
  let same = false;
  if (orig && next && orig.type === next.type && orig.id === next.id) {
    same = true;
  }
  return same;
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

const sampleAnalysesFormatPattern = {
  _13cnmr: [
    {
      pattern: '13C NMR',
      replace: {
        ops: [
          { insert: '13', attributes: { script: 'sup' } },
          { insert: 'C NMR' },
        ],
      },
    },
    {
      pattern: '(\\d+) C',
      replace: {
        ops: [
          { insert: '#{1}C' },
        ],
      },
    },
    {
      pattern: 'J=(\\d+)',
      replace: {
        ops: [
          { insert: 'J =#{1}' },
        ],
      },
    },
    {
      pattern: 'J =(\\d+)',
      replace: {
        ops: [
          { insert: 'J', attributes: { italic: true } },
          { insert: ' = #{1}' },
        ],
      },
    },
    {
      pattern: 'J=',
      replace: {
        ops: [
          { insert: 'J', attributes: { italic: true } },
          { insert: ' =' },
        ],
      },
    },
    {
      pattern: 'J = (\\d+)',
      replace: {
        ops: [
          { insert: 'J', attributes: { italic: true } },
          { insert: ' = #{1}' },
        ],
      },
    },
    {
      pattern: '\\) , ',
      replace: {
        ops: [
          { insert: '),' },
        ],
      },
    },
    {
      pattern: '\\) (\\d+)',
      replace: {
        ops: [
          { insert: '), #{1}' },
        ],
      },
    },
    {
      pattern: '(\\d+),(\\d+)',
      replace: {
        ops: [
          { insert: '#{1}.#{2}' },
        ],
      },
    },
    {
      pattern: '(\\d+) - (\\d+)',
      replace: {
        ops: [
          { insert: '#{1}–#{2}' },
        ],
      },
    },
  ],
  _1hnmr: [
    {
      pattern: '1H NMR',
      replace: {
        ops: [
          { insert: '1', attributes: { script: 'sup' } },
          { insert: 'H NMR' },
        ],
      },
    },
    {
      pattern: '(\\d+) H([^z])',
      replace: {
        ops: [
          { insert: '#{1}H#{2}' },
        ],
      },
    },
    {
      pattern: 'J=(\\d+)',
      replace: {
        ops: [
          { insert: 'J =#{1}' },
        ],
      },
    },
    {
      pattern: 'J =(\\d+)',
      replace: {
        ops: [
          { insert: 'J', attributes: { italic: true } },
          { insert: ' = #{1}' },
        ],
      },
    },
    {
      pattern: 'J=',
      replace: {
        ops: [
          { insert: 'J', attributes: { italic: true } },
          { insert: ' =' },
        ],
      },
    },
    {
      pattern: 'J = (\\d+)',
      replace: {
        ops: [
          { insert: 'J', attributes: { italic: true } },
          { insert: ' = #{1}' },
        ],
      },
    },
    {
      pattern: '\\) , ',
      replace: {
        ops: [
          { insert: '),' },
        ],
      },
    },
    {
      pattern: '\\) (\\d+)',
      replace: {
        ops: [
          { insert: '), #{1}' },
        ],
      },
    },
    {
      pattern: '(\\d+),(\\d+)',
      replace: {
        ops: [
          { insert: '#{1}.#{2}' },
        ],
      },
    },
    {
      pattern: '(\\d+) - (\\d+)',
      replace: {
        ops: [
          { insert: '#{1}–#{2}' },
        ],
      },
    },
  ],
  _ea: [
    {
      pattern: '(\\d),(\\d{2})',
      replace: {
        ops: [
          { insert: '#{1}.#{2}' },
        ],
      },
    },
    {
      pattern: 'C (\\d{2})',
      replace: {
        ops: [
          { insert: 'C, #{1}' },
        ],
      },
    },
    {
      pattern: 'H (\\d{2})',
      replace: {
        ops: [
          { insert: 'H, #{1}' },
        ],
      },
    },
    {
      pattern: 'N (\\d{2})',
      replace: {
        ops: [
          { insert: 'N, #{1}' },
        ],
      },
    },
    {
      pattern: 'O (\\d{2})',
      replace: {
        ops: [
          { insert: 'O, #{1}' },
        ],
      },
    },
    {
      pattern: 'S (\\d{2})',
      replace: {
        ops: [
          { insert: 'S, #{1}' },
        ],
      },
    },
    {
      pattern: '(\\d\\.\\d\\d),',
      replace: {
        ops: [
          { insert: '#{1};' },
        ],
      },
    },
    {
      pattern: '(\\d+) - (\\d+)',
      replace: {
        ops: [
          { insert: '#{1}–#{2}' },
        ],
      },
    },
  ],
  _mass: [
    {
      pattern: 'm/z',
      replace: {
        ops: [
          { insert: 'm/z', attributes: { italic: true } },
        ],
      },
    },
    {
      pattern: '(\\d+) - (\\d+)',
      replace: {
        ops: [
          { insert: '#{1}–#{2}' },
        ],
      },
    },
  ],
};

const Alphabet = (input = 1) => {
  const num = parseInt(input, 10);
  const index = num >= 1 && num <= 26 ? num - 1 : 25;
  const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabets[index];
};

module.exports = {
  SameEleTypId,
  UrlSilentNavigation,
  sampleAnalysesFormatPattern,
  Alphabet,
};
