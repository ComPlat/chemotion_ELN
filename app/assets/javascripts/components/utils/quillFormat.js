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
      dd.insert = insertString.replace(patt, m || '');
      return dd;
    });
  });

  return newContent;
};

module.exports = {
  rmDeltaRedundantSpaceBreak,
  rmOpsRedundantSpaceBreak,
  rmRedundantSpaceBreak,
  frontBreak,
};
