const addHyphensToCas = (cas) => {
  const filterCas = cas.replace(/-/g, '');
  const firstHyphenIndex = filterCas.length - 3;
  const secondHyphenIndex = filterCas.length - 1;
  const firstPart = filterCas.substring(0, firstHyphenIndex);
  const secondPart = filterCas.substring(firstHyphenIndex, secondHyphenIndex);
  const thirdPart = filterCas.substring(secondHyphenIndex, filterCas.length);
  const format = `${firstPart}-${secondPart}-${thirdPart}`;
  const checkFormat = format.match(/([0-9]{2,7})-([0-9]{2})-[0-9]/);
  return checkFormat;
};

const checkCasDigit = (digits) => {
  let sum = 0;
  let final = 0;
  for (let i = 0; i < digits.length; i += 1) {
    sum += (i + 1) * parseInt(digits[i], 10);
  }
  final = sum % 10;
  return final;
};

const validateCas = (cas, boolean) => {
  const filterCas = cas.replace(/-/g, '');
  if (cas && cas !== '') {
    const isnum = /^[0-9-]+$/.test(cas) && !(/^[-]+$/.test(cas));
    let match;
    let result;
    if (filterCas.length >= 5 && isnum) {
      const checkFormat = cas.match(/([0-9]{2,7})-([0-9]{2})-[0-9]/);
      match = checkFormat || addHyphensToCas(cas);
      const digits = (match[1] + match[2]).split('').reverse();
      result = checkCasDigit(digits);
    }
    const valid = result == cas.slice(-1);
    if (!valid && boolean) {
      return false;
    }
    return match ? match[0] : 'smile';
  }
  return cas;
};

export {
  addHyphensToCas,
  checkCasDigit,
  validateCas
};
