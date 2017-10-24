const fixDigit = (input, precision) => {
  const output = input || 0.0;
  return output.toFixed(precision);
};

const precLimit = (precision) => {
  if (precision > 20) {
    return 20;
  } else if (precision < 0) {
    return 0;
  }
  return precision;
};

const largerThanOne = (num, headLen, tailLen, precision) => {
  if ((precision - headLen) < 0) {
    return num.toFixed(0);
  }
  return num.toFixed(precLimit(precision - headLen));
};

const smallerThanOne = (num, tailLen, precision) => {
  if (num === 0.0) {
    return num.toFixed(precLimit(precision - 1));
  }
  return num.toFixed(precLimit(precision + tailLen));
};

const guiltyDigit = (input, precision) => {
  const num = input || 0.0;
  const numStr = num.toFixed(10).toString().split('.');
  const headLen = numStr[0].replace(/^[0]+/g, '').length;
  const tailLen = numStr[1].replace(/[1-9]+\d*/g, '').length;
  if (num >= 1.0) {
    return largerThanOne(num, headLen, tailLen, precision);
  }
  return smallerThanOne(num, tailLen, precision);
};

module.exports = { fixDigit, guiltyDigit };
