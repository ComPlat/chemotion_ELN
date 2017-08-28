const rmRedundantSpaceBreak = (target) => {
  return target.replace(/\n/g, '').replace(/\s\s+/g, ' ');
}

const rmOpsRedundantSpaceBreak = (ops) => {
  const clearOps = ops.map(op => {
    op.insert = rmRedundantSpaceBreak(op.insert);
    return op;
  });
  return clearOps;
}

const rmDeltaRedundantSpaceBreak = (delta) => {
  const clearOps = rmOpsRedundantSpaceBreak(delta.ops);
  return { ops: clearOps };
}

const frontBreak = (content) => {
  return [{ insert: "\n"}, ...content];
}

module.exports = { rmDeltaRedundantSpaceBreak,
                    rmOpsRedundantSpaceBreak,
                    rmRedundantSpaceBreak,
                    frontBreak };
