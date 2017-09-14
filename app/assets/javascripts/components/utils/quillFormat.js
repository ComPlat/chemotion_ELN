import Delta from 'quill-delta';
import _ from 'lodash';

const rmRedundantSpaceBreak = (target) => {
  return target.replace(/\n/g, '').replace(/\s\s+/g, ' ');
};

const rmOpsRedundantSpaceBreak = (ops) => {
  const clearOps = ops.map((op) => {
    op.insert = rmRedundantSpaceBreak(op.insert);
    return op;
  });
  return clearOps;
};

const rmDeltaRedundantSpaceBreak = (delta) => {
  const clearOps = rmOpsRedundantSpaceBreak(delta.ops);
  return { ops: clearOps };
};

const frontBreak = (content) => {
  const res = [{ insert: '\n' }, ...content];
  return res;
};

const mapValueToGroupRegex = (content, matchedGroup) => {
  let newContent = _.cloneDeep(content);
  matchedGroup.forEach((m, idx) => {
    newContent = newContent.map((d) => {
      const patt = `#{${idx + 1}}`;
      const insertString = d.insert;
      const dd = { ...d };
      dd.insert = insertString.replace(patt, m);
      return dd;
    });
  });

  return newContent;
};

const searchAndReplace = (contents, pattern, regexReplace) => {
  const contentsDelta = new Delta(contents);

  const replacedContents = contentsDelta.map((content) => {
    if (typeof content.insert !== 'string') return content;

    const contentDelta = new Delta([content]);
    const regexMatch = new RegExp(pattern, 'g');

    let replaced = new Delta();
    let cur = 0;

    let matched = regexMatch.exec(content.insert);
    while (matched) {
      const l = matched[0].length;
      const retain = matched.index - cur;
      const change = new Delta().retain(retain).delete(l);
      cur = matched.index + l;

      const cloneRegex = _.cloneDeep(regexReplace.ops);
      const group = matched.slice(1);
      const mappedReplace = mapValueToGroupRegex(cloneRegex, group);

      replaced = replaced.concat(change.concat(new Delta(mappedReplace)));
      matched = regexMatch.exec(content.insert);
    }

    return contentDelta.compose(replaced).ops;
  });

  const newDelta = replacedContents.reduce((acc, cur) => acc.concat(cur), []);
  return new Delta(newDelta);
};

module.exports = {
  rmDeltaRedundantSpaceBreak,
  rmOpsRedundantSpaceBreak,
  rmRedundantSpaceBreak,
  frontBreak,
  searchAndReplace,
};
