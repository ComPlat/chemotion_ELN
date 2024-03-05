/*eslint-disable no-param-reassign*/

import _ from 'lodash';
import Delta from 'quill-delta';
import commonmark from 'commonmark';

const dtConverter = {
  inline: {
    bold: ['**', '**'],
    italic: ['*', '*'],
    underline: ['<u>', '</u>']
  },
  script: {
    super: ['<sup>', '</sup>'],
    sub: ['<sub>', '</sub>']
  },
  block: {
    header: {
      1() { return '# '; },
      2() { return '## '; },
      3() { return '### '; },
      4() { return '#### '; },
      5() { return '##### '; },
      6() { return '###### '; }
    },
    list: {
      bullet() { return '* '; },
      ordered(count) {
        return `${count}. `;
      }
    }
  }
};

const deltaToMarkdown = (delta) => {
  let mdString = '';

  _.cloneDeep(delta).ops.forEach((op) => {
    let text = op.insert;

    Object.keys(op.attributes || {}).sort().forEach((attr) => {
      const attrVal = op.attributes[attr];
      if (dtConverter.inline[attr]) {
        const open = dtConverter.inline[attr][0];
        const close = dtConverter.inline[attr][1];
        const replaceText = `$1${open}$2${close}$3`;
        text = text.replace(/(\s*)(.*)(\s*)/, replaceText);
      } else if (dtConverter.script[attrVal]) {
        const open = dtConverter.script[attrVal][0];
        const close = dtConverter.script[attrVal][1];
        text = `${open}${text}${close}`;
      } else if (dtConverter.block[attr]) {
        let groupCount;
        if (attrVal === 'ordered') {
          const reg = /((?=\d+\. )(?:[^\n]*\n[^\n]*$)|(?!\d+\. )[^\n]*$)/g;
          const lastLine = mdString.match(reg)[0];
          const lastOrder = lastLine.match(/^(\d+)\. .*\n/) || 0;
          if (lastOrder) {
            groupCount = parseInt(lastOrder[1], 10);
            groupCount += 1;
          } else {
            groupCount = 1;
          }
        }
        const md = dtConverter.block[attr][attrVal](groupCount);
        const regex = /(^|\n)([^\n]*)$/g;
        const repText = `$1${md}$2`;
        mdString = mdString.replace(regex, repText);
      }
    });

    mdString += text;
  });

  // \n is considered as a soft-break in markdown, use \n\n to indicate new line
  mdString = mdString.replace(/\n/g, '\n\n');
  // However in list group, only \n is used
  mdString = mdString.replace(/(\d+\. [^\n]*)\n{2}(?=\d+\. )/g, '$1\n');
  mdString = mdString.replace(/(\* [^\n]*)\n{2}(?=\* )/g, '$1\n');

  return mdString;
};

const changeAttribute = (attributes, event, attribute, value) => {
  if (event.entering) {
    attributes[attribute] = value;
  } else {
    attributes = _.unset(attributes, attribute);
  }
};

const applyAttribute = (node, event, attributes, attribute) => {
  if (typeof attribute === 'string') {
    changeAttribute(attributes, event, attribute, true);
  } else if (typeof attribute === 'function'){
    attribute(node, event, attributes);
  }
};

const mdConverter = [
  { filter: 'emph', attribute: 'italic' },
  { filter: 'strong', attribute: 'bold' },
  {
    filter: 'html_inline',
    makeDelta: (event, attributes) => {
      const { node } = event;
      const tag = (node.literal.match(/<(\/)?([^>/]*)>/g) || [])[0];

      switch (tag) {
        case '<u>':
          changeAttribute(attributes, event, 'underline', true);
          break;
        case '<sub>':
          changeAttribute(attributes, event, 'script', 'sub');
          break;
        case '<sup>':
          changeAttribute(attributes, event, 'script', 'super');
          break;
        case '</u>':
          attributes = _.unset(attributes, 'underline');
          break;
        case '</sub>':
          attributes = _.unset(attributes, 'script');
          break;
        case '</sup>':
          attributes = _.unset(attributes, 'script');
          break;
        default:
          break;
      }
    }
  },
  {
    filter: 'text',
    makeDelta: (event, attributes) => {
      if (_.isEmpty(attributes)) {
        return { insert: event.node.literal };
      }
      return { insert: event.node.literal, attributes: { ...attributes } };
    }
  },
  {
    filter: 'softbreak',
    makeDelta: (event, attributes) => {
      if (_.isEmpty(attributes)) {
        return { insert: ' ' };
      }
      return { insert: ' ', attributes: { ...attributes } };
    }
  },
  // block
  {
    filter: 'heading',
    lineAttribute: true,
    makeDelta: (event, attributes) => {
      if (event.entering) {
        return null;
      }
      return {
        insert: '\n',
        attributes: { ...attributes, header: event.node.level }
      };
    }
  },
  {
    filter: 'list',
    lineAttribute: true,
    attribute: (node, event, attributes) => {
      changeAttribute(attributes, event, 'list', node.listType);
    }
  },
  {
    filter: 'paragraph',
    lineAttribute: true,
    makeDelta: (event, attributes) => {
      if (event.entering) {
        return null;
      }

      if (_.isEmpty(attributes)) {
        return { insert: '\n' };
      }
      return { insert: '\n', attributes: { ...attributes } };
    }
  },
];

const markdownToDelta = (md) => {
  const parsed = new commonmark.Parser().parse(md);
  const walker = parsed.walker();
  let event;
  const deltas = [];
  const attributes = {};
  const lineAttributes = {};

  event = walker.next();
  while (event !== null) {
    const { node } = event;
    const mdConv = mdConverter.filter(x => x.filter === node.type);
    for (let i = 0; i < mdConv.length; i += 1) {
      const converter = mdConv[i];
      const attr = converter.lineAttribute ? lineAttributes : attributes;
      applyAttribute(node, event, attr, converter.attribute);
      if (converter.makeDelta) {
        const delta = converter.makeDelta(event, attr);
        if (delta) deltas.push(delta);
      }
    }
    event = walker.next();
  }

  const endNewLine = deltas[deltas.length - 1].insert.indexOf('\n') === -1;
  if (_.isEmpty(deltas) || endNewLine) {
    deltas.push({ insert: '\n' });
  }
  const delta = new Delta().compose(new Delta(deltas));

  return delta;
};

module.exports = {
  deltaToMarkdown,
  markdownToDelta
};

/*eslint-enable no-param-reassign*/
