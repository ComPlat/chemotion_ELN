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

const validDigit = (input, precision) => {
  const num = input || 0.0;
  const numStr = num.toFixed(10)
    .toString()
    .split('.');
  const headLen = numStr[0].replace(/^[0]+/g, '').length;
  const tailLen = numStr[1].replace(/[1-9]+\d*/g, '').length;
  if (num >= 1.0) {
    return largerThanOne(num, headLen, tailLen, precision);
  }
  return smallerThanOne(num, tailLen, precision);
};

const correctPrefix = (input, precision) => {
  if (input === 0.0) {
    return false;
  }
  if (input >= 1.0) {
    return `${validDigit(input, precision)} `;
  }
  if (input >= 0.001) {
    return `${validDigit(input * 1000, precision)} m`;
  }
  return `${validDigit(input * 1000000, precision)} \u03BC`;
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0 || bytes == null) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / (k ** i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Parse a string into a number.
 *
 * All characters other than digits, commas, and periods are ignored,
 * with the exception of an optional leading dash to indicate a negative number.
 * The string may contain a decimal separator, which can be either a comma or a period.
 * All other periods or commas (such as thousands separators) are ignored.
 *
 * @param {string} numberString - The string to parse.
 * @returns {number|NaN} - The parsed number or NaN if parsing fails.
 */
function parseNumericString(numberString) {
  if (typeof numberString !== 'string') {
    return NaN;
  }
  let sanitizedNumberString = numberString;

  // Remove all characters that aren't digits, commas, or periods.
  sanitizedNumberString = sanitizedNumberString.replace(/[^0-9,.]/g, '');
  if (sanitizedNumberString === '') {
    return NaN;
  }

  // Decimal separator can be comma or period. Convert to period.
  sanitizedNumberString = sanitizedNumberString.replaceAll(',', '.');
  // Keep only final (non-terminal) period under the assumption that it's meant as the decimal separator.
  // Assume that preceding periods were meant as thousands separators.
  const finalPeriodIndex = sanitizedNumberString.lastIndexOf('.');
  if (finalPeriodIndex !== -1) {
    sanitizedNumberString = `${sanitizedNumberString.slice(0, finalPeriodIndex)
      .replaceAll('.', '')
    }.${
      sanitizedNumberString.slice(finalPeriodIndex + 1)}`;
  }

  if (numberString.startsWith('-')) {
    sanitizedNumberString = `-${sanitizedNumberString}`;
  }

  return Number(sanitizedNumberString);
}

/**
 * Parse a string into a number.
 *
 * if argument is number it echos the number
 *
 * All characters other than digits, commas, and periods are ignored,
 * with the exception of an optional leading dash to indicate a negative number.
 * The string may contain a decimal separator, which can be either a comma or a period.
 * All other periods or commas (such as thousands separators) are ignored.
 *
 * @param {string|number} numberString - The string to parse.
 * @returns {number|NaN} - The parsed number or NaN if parsing fails.
 */
function parseNumericStringOrNum(numberString) {
  if (typeof numberString === 'number') {
    return Number(numberString);
  }
  return parseNumericString(numberString);
}


/**
 * Format a number for display, using fixed notation for values between 0.001 and 1e5,
 * and scientific notation otherwise. Returns 'n.d.' for invalid values.
 *
 * @param {number} val - The value to format
 * @param {number} precision - Number of digits after the decimal point
 * @returns {string}
 */
const formatDisplayValue = (val, precision) => {
  if (val === null || val === undefined || Number.isNaN(val) || !Number.isFinite(val)) return 'n.d.';

  const absVal = Math.abs(val);
  // Show as fixed if in a reasonable range, else use scientific
  if ((absVal >= 0.001 && absVal < 1e8) || absVal === 0) {
    // Always use dot as decimal separator, no thousands separator
    return Number(val).toLocaleString('en-US', {
      maximumFractionDigits: precision,
      minimumFractionDigits: 0,
      useGrouping: false
    });
  }
  return Number(val).toExponential(precision - 1);
};

export {
  fixDigit,
  validDigit,
  correctPrefix,
  formatBytes,
  parseNumericString,
  formatDisplayValue,
  parseNumericStringOrNum,
};
