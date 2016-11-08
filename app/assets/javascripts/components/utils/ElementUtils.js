const SameEleTypId = (orig, next) => {
  let same = false;
  if(orig && next && orig.type === next.type && orig.id === next.id) {
    same = true;
  }
  return same;
}

module.exports = { SameEleTypId };
