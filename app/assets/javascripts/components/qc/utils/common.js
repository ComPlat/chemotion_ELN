const numFormat = (input, digit = 2) => parseFloat(input).toFixed(digit);

const realFormat = (val, status) => {
  if (status === 'missing') {
    return '- - -';
  }
  return numFormat(val);
};

const makeDav = (hasFiles, hasValidFiles) => {
  if (hasFiles !== undefined) return hasValidFiles;
  return undefined;
};

export { numFormat, realFormat, makeDav };
