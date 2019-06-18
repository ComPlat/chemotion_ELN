const numFormat = (input, digit = 2) => parseFloat(input).toFixed(digit);

const realFormat = (val, status) => {
  if (status === 'missing') {
    return '- - -';
  }
  return numFormat(val);
};

export { numFormat, realFormat };
