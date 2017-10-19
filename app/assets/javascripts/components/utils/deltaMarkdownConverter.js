import _ from 'lodash';
import Delta from 'quill-delta';
import commonmark from 'commonmark';

const dtConverter = {
  inline: {
    bold: ['**', '**'],
    italic: ['*', '*'],
    underline: ['<u>', '</u>'],
  },
  script: {
    super: ['<sup>', '</sup>'],
    sub: ['<sub>', '</sub>'],
  },
  block: {
    header: {
      1: function() { return '# ' },
      2: function() { return '## ' },
      3: function() { return '### ' },
      4: function() { return '#### ' },
      5: function() { return '##### ' },
      6: function() { return '###### ' },
    },
    list: {
      bullet: function() { return '* '},
      ordered: function(count) {
        return `${count}. `;
      },
    },
  },
}

const deltaToMarkdown = (delta) => {
  let mdString = '';

  _.cloneDeep(delta).ops.forEach(op => {
    let text = op.insert;

    Object.keys(op.attributes || {}).sort().forEach(attr => {
      let attrVal = op.attributes[attr];
      if (dtConverter.inline[attr]) {
        let open = dtConverter.inline[attr][0];
        let close = dtConverter.inline[attr][1];
        text = `${open}${text}${close}`;
      } else if (dtConverter.script[attrVal]) {
        let open = dtConverter.script[attrVal][0];
        let close = dtConverter.script[attrVal][1];
        text = `${open}${text}${close}`;
      } else if (dtConverter.block[attr]) {
        let groupCount;
        if (attrVal === 'ordered') {
          let reg = /((?=\d+\. )(?:[^\n]*\n[^\n]*$)|(?!\d+\. )[^\n]*$)/g;
          let lastLine = mdString.match(reg)[0];
          let lastOrder = lastLine.match(/^(\d+)\. .*\n/) || 0;
          if (lastOrder) {
            groupCount = parseInt(lastOrder[1]);
            groupCount += 1;
          } else {
            groupCount = 1;
          }
        }
        let md = dtConverter.block[attr][attrVal](groupCount);
        let regex = /(^|\n)([^\n]*)$/g;
        let repText = `$1${md}$2`;
        mdString = mdString.replace(regex, repText);
      }
    });

    mdString += text;
  })

  // \n is considered as a soft-break in markdown, use \n\n to indicate new line
  mdString = mdString.replace(/\n/g, '\n\n')
  // However in list group, only \n is used
  mdString = mdString.replace(/(\d+\. [^\n]*)\n{2}(?=\d+\. )/g, '$1\n')
  mdString = mdString.replace(/(\* [^\n]*)\n{2}(?=\* )/g, '$1\n')

  return mdString;
}

const changeAttribute = (attributes, event, attribute, value) => {
  if (event.entering) {
    attributes[attribute] = value;
  } else {
    attributes = _.unset(attributes, attribute);
  }

  return attributes;
}

const applyAttribute = (node, event, attributes, attribute) => {
  if (typeof attribute == 'string') {
    changeAttribute(attributes, event, attribute, true);
  } else if (typeof attribute == 'function') {
    attribute(node, event, attributes);
  }
}

const mdConverter = [
  { filter: 'emph', attribute: 'italic' },
  { filter: 'strong', attribute: 'bold' },
  {
    filter: 'html_inline', makeDelta: (event, attributes) => {
      let node = event.node;
      let tag = (node.literal.match(/<(\/)?([^>/]*)>/g) || [])[0];
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
      }
    }
  },
  {
    filter: 'text', makeDelta: (event, attributes) => {
      if (_.isEmpty(attributes)) {
        return { insert: event.node.literal };
      } else {
        return { insert: event.node.literal, attributes: { ...attributes } };
      }
    }
  },
  {
    filter: 'softbreak', makeDelta: (event, attributes) => {
      if (_.isEmpty(attributes)) {
        return { insert: ' ' };
      } else {
        return { insert: ' ', attributes: { ...attributes } };
      }
    }
  },
  // block
  {
    filter: 'heading', lineAttribute: true, makeDelta: (event, attributes) => {
      if (event.entering) {
        return null;
      }
      return {
        insert: "\n",
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
        return { insert: "\n" };
      } else {
        return { insert: "\n", attributes: { ...attributes } };
      }
    }
  },
];

const markdownToDelta = (md) => {
  var parsed = new commonmark.Parser().parse(md);
  var walker = parsed.walker();
  var event, node;
  var deltas = [];
  var attributes = {};
  var lineAttributes = {};

  while ((event = walker.next())) {
    node = event.node;
    mdConverter.forEach((converter) => {
      if (node.type == converter.filter) {
        if (converter.lineAttribute) {
          applyAttribute(node, event, lineAttributes, converter.attribute);
        } else {
          applyAttribute(node, event, attributes, converter.attribute);
        }
        if (converter.makeDelta) {
          let attr = converter.lineAttribute ? lineAttributes : attributes;
          let delta = converter.makeDelta(event, attr);
          if (delta) {
            deltas.push(delta);
          }
        }
      }
    })
  }

  let endNewLine = deltas[deltas.length - 1].insert.indexOf("\n") == -1;
  if (_.isEmpty(deltas) || endNewLine) {
    deltas.push({ insert: "\n" });
  }
  let delta = new Delta().compose(new Delta(deltas));

  return delta;
}

module.exports = {
  deltaToMarkdown,
  markdownToDelta,
}